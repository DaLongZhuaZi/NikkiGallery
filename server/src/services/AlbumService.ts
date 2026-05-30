import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import config from '../config'
import logger from '../utils/logger'
import AlbumModel, { Album, CreateAlbumDTO, UpdateAlbumDTO } from '../models/Album'
import ImageModel from '../models/Image'
import { configService } from './ConfigService'

export class AlbumService {
  // 获取所有相册
  static async getAllAlbums(): Promise<Album[]> {
    return AlbumModel.findAll()
  }

  // 根据ID获取相册
  static async getAlbumById(id: string): Promise<Album | undefined> {
    return AlbumModel.findById(id)
  }

  // 创建自定义相册
  static async createAlbum(data: CreateAlbumDTO): Promise<Album> {
    // 检查路径是否已存在
    const existing = AlbumModel.findByPath(data.path)
    if (existing) {
      throw new Error('Album path already exists')
    }

    // 如果是自定义相册，创建目录
    if (data.type === 'custom' || !data.type) {
      if (!fs.existsSync(data.path)) {
        fs.mkdirSync(data.path, { recursive: true })
      }
    }

    return AlbumModel.create(data)
  }

  // 更新相册
  static async updateAlbum(id: string, data: UpdateAlbumDTO): Promise<Album | undefined> {
    return AlbumModel.update(id, data)
  }

  // 删除相册
  static async deleteAlbum(id: string, deleteFiles: boolean = false): Promise<boolean> {
    const album = AlbumModel.findById(id)
    if (!album) {
      throw new Error('Album not found')
    }

    // 如果需要删除文件
    if (deleteFiles && album.type === 'custom') {
      try {
        if (fs.existsSync(album.path)) {
          fs.rmSync(album.path, { recursive: true, force: true })
        }
      } catch (error) {
        logger.error(`Failed to delete album directory: ${album.path}`, error)
      }
    }

    return AlbumModel.delete(id)
  }

  // 扫描已配置的截图文件夹（从 settings.json 读取 screenshotFolders）
  static async scanConfiguredFolders(): Promise<Album[]> {
    const albums: Album[] = []
    const settings = configService.getAll()

    // 1. 扫描 screenshotFolders 配置中的路径
    const folders = settings.screenshotFolders || []
    for (const folderPath of folders) {
      if (!fs.existsSync(folderPath)) {
        logger.warn(`Configured screenshot folder does not exist: ${folderPath}`)
        continue
      }

      let album = AlbumModel.findByPath(folderPath)
      if (!album) {
        // 从路径提取名称：取最后两级目录作为名称
        const parts = folderPath.replace(/\\/g, '/').split('/')
        const name = parts.slice(-2).join(' / ') || path.basename(folderPath)
        album = AlbumModel.create({
          name: `游戏相册 - ${name}`,
          path: folderPath,
          type: 'game',
          description: `来自配置的截图目录: ${folderPath}`,
        })
      }

      await this.scanAlbumImages(album.id, folderPath)
      albums.push(album)
    }

    // 2. 如果有 gamePath，也扫描游戏路径下自动发现的截图目录
    const gamePath = settings.gamePath
    if (gamePath && fs.existsSync(gamePath)) {
      const discovered = await this.discoverScreenshotDirs(gamePath)
      for (const dirPath of discovered) {
        // 跳过已配置的目录（避免重复扫描）
        if (folders.includes(dirPath)) continue

        let album = AlbumModel.findByPath(dirPath)
        if (!album) {
          const relativePath = path.relative(gamePath, dirPath)
          const name = relativePath.replace(/\\/g, '/') || path.basename(dirPath)
          album = AlbumModel.create({
            name: `游戏相册 - ${name}`,
            path: dirPath,
            type: 'game',
            description: `自动发现的截图目录: ${dirPath}`,
          })
        }

        await this.scanAlbumImages(album.id, dirPath)
        albums.push(album)
      }
    }

    logger.info(`Scan complete: ${albums.length} album(s) found, total images scanned`)
    return albums
  }

  // 智能发现截图目录（不区分大小写，支持多级搜索）
  private static async discoverScreenshotDirs(rootPath: string, maxDepth: number = 3): Promise<string[]> {
    const results: string[] = []
    const screenshotNames = ['screenshots', 'screenshot', 'screen shot', 'captures', 'photos']

    const search = (dirPath: string, depth: number) => {
      if (depth > maxDepth) return

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory()) continue

          const dirName = entry.name.toLowerCase()
          // 检查目录名是否匹配已知的截图目录名
          if (screenshotNames.some(name => dirName === name || dirName.replace(/[_\-\s]/g, '') === name.replace(/\s/g, ''))) {
            results.push(path.join(dirPath, entry.name))
          }

          // 递归搜索（跳过隐藏目录和特殊目录）
          if (!entry.name.startsWith('.') && depth < maxDepth) {
            search(path.join(dirPath, entry.name), depth + 1)
          }
        }
      } catch (e) {
        // 无权访问等错误，跳过
      }
    }

    search(rootPath, 1)
    return results
  }

  // 扫描游戏相册目录（兼容旧接口，传入 gamePath）
  static async scanGameAlbums(gamePath: string): Promise<Album[]> {
    const albums: Album[] = []

    if (!fs.existsSync(gamePath)) {
      throw new Error('Game path does not exist')
    }

    // 使用智能发现
    const discovered = await this.discoverScreenshotDirs(gamePath)

    // 同时查找旧格式的 accountID/Screenshots 结构
    const entries = fs.readdirSync(gamePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const accountPath = path.join(gamePath, entry.name)
        // 检查多种可能的截图目录名
        for (const name of ['Screenshots', 'screenshots', 'ScreenShot', 'screenshot']) {
          const screenshotsPath = path.join(accountPath, name)
          if (fs.existsSync(screenshotsPath) && !discovered.includes(screenshotsPath)) {
            discovered.push(screenshotsPath)
          }
        }
      }
    }

    for (const dirPath of discovered) {
      let album = AlbumModel.findByPath(dirPath)
      if (!album) {
        const relativePath = path.relative(gamePath, dirPath)
        const name = relativePath.replace(/\\/g, '/') || path.basename(dirPath)
        album = AlbumModel.create({
          name: `游戏相册 - ${name}`,
          path: dirPath,
          type: 'game',
          description: `截图目录: ${dirPath}`,
        })
      }

      await this.scanAlbumImages(album.id, dirPath)
      albums.push(album)
    }

    return albums
  }

  // 扫描相册中的图片（递归扫描子目录）
  static async scanAlbumImages(albumId: string, albumPath: string): Promise<number> {
    if (!fs.existsSync(albumPath)) {
      logger.warn(`Album path does not exist: ${albumPath}`)
      return 0
    }

    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.heic', '.heif', '.tga', '.dds']
    let addedCount = 0
    let skippedCount = 0
    let totalFilesFound = 0

    // 递归扫描目录
    const scanDir = (dirPath: string) => {
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch (e) {
        logger.warn(`Cannot read directory: ${dirPath}`)
        return
      }

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          // 递归扫描子目录（跳过隐藏目录和特殊目录）
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'thumbnails') {
            scanDir(fullPath)
          }
          continue
        }

        if (!entry.isFile()) continue

        const ext = path.extname(entry.name).toLowerCase()
        if (!supportedExtensions.includes(ext)) {
          continue
        }

        totalFilesFound++

        try {
          // 检查是否已存在（按路径去重，避免重复计算 hash）
          const existingByPath = ImageModel.findByPath(fullPath)
          if (existingByPath) {
            skippedCount++
            continue
          }

          const hash = this.calculateFileHashSync(fullPath)
          const existing = ImageModel.findByHash(hash)

          if (!existing) {
            const stats = fs.statSync(fullPath)
            ImageModel.create({
              albumId: albumId,
              filename: entry.name,
              path: fullPath,
              hash: hash,
              fileSize: stats.size,
              mimeType: this.getMimeType(ext),
              createdAt: new Date(Math.min(stats.birthtimeMs, stats.mtimeMs)).toISOString(),
            })
            addedCount++
          } else {
            skippedCount++
          }
        } catch (e: any) {
          logger.warn(`Failed to process file ${fullPath}: ${e.message}`)
        }
      }
    }

    scanDir(albumPath)

    // 更新相册图片数量
    AlbumModel.updateImageCount(albumId)

    if (totalFilesFound === 0) {
      logger.warn(`Scanned ${albumPath}: no image files found in directory tree`)
    } else {
      logger.info(`Scanned ${albumPath}: ${totalFilesFound} images found, ${addedCount} new, ${skippedCount} skipped`)
    }
    return addedCount
  }

  // 同步计算文件 hash（性能更好）
  private static calculateFileHashSync(filePath: string): string {
    const crypto = require('crypto')
    const fileBuffer = fs.readFileSync(filePath)
    const hashSum = crypto.createHash('md5')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  }

  // 按路径查找图片
  static findImageByPath(filePath: string) {
    return ImageModel.findByPath(filePath)
  }

  // 计算文件hash
  private static async calculateFileHash(filePath: string): Promise<string> {
    const crypto = require('crypto')
    const fileBuffer = fs.readFileSync(filePath)
    const hashSum = crypto.createHash('md5')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  }

  // 获取MIME类型
  private static getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  // 获取相册统计
  static async getStats() {
    return AlbumModel.getStats()
  }
}

export default AlbumService