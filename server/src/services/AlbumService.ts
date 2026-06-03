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

  // 获取叠纸官方相册分类名称
  private static getGameAlbumName(dirPath: string): string {
    const normalizedPath = dirPath.replace(/\\/g, '/')
    
    const nameMap: Record<string, string> = {
      'Collage/CollagePhoto': '趣拼海报',
      'Collage/HighQuality': '趣拼海报 (高质量)',
      'Collage/LowQuality': '趣拼海报 (低质量)',
      'ClockInPhoto': '世界巡游打卡照',
      'CloudPhotos_LowQuality': '云端相册 (低质量)',
      'CloudPhotos': '云端相册',
      'CustomAvatar': '自定义头像',
      'CustomCard': '自定义名片',
      'CustomHomeBoardPhoto': '留言板照片',
      'DIY': '星绘图册',
      'HomeTemplatePhoto': '家园模板照片',
      'MagazinePhotos': '旅行手账',
      'NikkiPhotos_HighQuality': '大喵相册原图',
      'NikkiPhotos_LowQuality': '大喵相册 (低质量)',
      'PlantDyeing': '绿野随心染',
      'ScreenShot': '快捷截图',
      'XSdkQrCode': '游戏分享二维码',
      'EditorPhoto': '编辑模式截图',
      'CustomFurniturePhoto': '自定义家具',
      'CustomWigetRT': '自定义小部件',
      'MallPic': '商城宣传图',
      'CustomConfigs': '自定义配置'
    }

    // 将长路径放前面，避免部分匹配被截断
    const keys = Object.keys(nameMap).sort((a, b) => b.length - a.length)

    for (const key of keys) {
      if (normalizedPath.includes('/' + key + '/') || normalizedPath.endsWith('/' + key) || normalizedPath === key) {
        return nameMap[key]
      }
      // 兼容一些可能的挂载点，例如末尾是数字uid的情况
      if (normalizedPath.includes('/' + key)) {
        // 如果剩下的部分只包含数字uid或者斜杠
        const remaining = normalizedPath.substring(normalizedPath.indexOf('/' + key) + key.length + 1)
        if (/^[\/\d]*$/.test(remaining)) {
           return nameMap[key]
        }
      }
    }

    return ''
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
      const specificName = this.getGameAlbumName(folderPath)
      const finalName = specificName || (() => {
        const parts = folderPath.replace(/\\/g, '/').split('/')
        return `游戏相册 - ${parts.slice(-2).join(' / ') || path.basename(folderPath)}`
      })()

      if (!album) {
        album = AlbumModel.create({
          name: finalName,
          path: folderPath,
          type: 'game',
          description: `来自配置的截图目录: ${folderPath}`,
        })
      } else if (album.name !== finalName && album.type === 'game') {
        // 更新旧的相册名称
        AlbumModel.update(album.id, { name: finalName })
        album.name = finalName
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
        const specificName = this.getGameAlbumName(dirPath)
        const finalName = specificName || (() => {
          const relativePath = path.relative(gamePath, dirPath)
          return `游戏相册 - ${relativePath.replace(/\\/g, '/') || path.basename(dirPath)}`
        })()

        if (!album) {
          album = AlbumModel.create({
            name: finalName,
            path: dirPath,
            type: 'game',
            description: `自动发现的截图目录: ${dirPath}`,
          })
        } else if (album.name !== finalName && album.type === 'game') {
          // 更新旧的相册名称
          AlbumModel.update(album.id, { name: finalName })
          album.name = finalName
        }

        await this.scanAlbumImages(album.id, dirPath)
        albums.push(album)
      }
    }

    logger.info(`Scan complete: ${albums.length} album(s) found, total images scanned`)
    return albums
  }

  // 智能发现截图目录（不区分大小写，支持多级搜索）
  private static async discoverScreenshotDirs(rootPath: string): Promise<string[]> {
    const results: Set<string> = new Set()
    
    // 叠纸游戏官方相册固定路径格式
    const knownPaths = [
      'X6Game/ScreenShot',
      'X6Game/Saved/GamePlayPhotos/*/NikkiPhotos_HighQuality',
      'X6Game/Saved/GamePlayPhotos/*/MagazinePhotos',
      'X6Game/Saved/GamePlayPhotos/*/ClockInPhoto',
      'X6Game/Saved/GamePlayPhotos/*/Collage/CollagePhoto',
      'X6Game/Saved/CustomAvatar/*',
      'X6Game/Saved/CustomCard/*',
      'X6Game/Saved/PlantDyeing',
      'X6Game/Saved/DIY/*'
    ]

    // 处理通配符路径
    for (const kp of knownPaths) {
      if (kp.includes('*')) {
        const parts = kp.split('/*/')
        if (parts.length === 2) {
          const basePath = path.join(rootPath, parts[0])
          if (fs.existsSync(basePath)) {
            try {
              const dirs = fs.readdirSync(basePath, { withFileTypes: true })
              for (const dir of dirs) {
                if (dir.isDirectory()) {
                  const targetPath = path.join(basePath, dir.name, parts[1])
                  if (fs.existsSync(targetPath)) results.add(targetPath)
                }
              }
            } catch (e) {}
          }
        } else if (kp.endsWith('/*')) {
          const basePath = path.join(rootPath, kp.replace('/*', ''))
          if (fs.existsSync(basePath)) {
            try {
              const dirs = fs.readdirSync(basePath, { withFileTypes: true })
              for (const dir of dirs) {
                if (dir.isDirectory()) results.add(path.join(basePath, dir.name))
              }
            } catch (e) {}
          }
        }
      } else {
        const exactPath = path.join(rootPath, kp)
        if (fs.existsSync(exactPath)) {
          results.add(exactPath)
        }
      }
    }

    // 依然保留深度为 4 的泛搜索作为兜底
    const keywordList = [
      'screenshot', 'screenshots', 'screen shot', 'screens', 
      'gamescreenshot', 'album', 'albums', 'photo', 'photos', 
      'gallery', 'snapshots', 'custom', 'user', 'capture', 'records', 'shots'
    ]
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']

    const search = (dirPath: string, depth: number) => {
      if (depth > 4) return

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        let hasImages = false;

        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (imageExtensions.includes(ext)) {
              hasImages = true;
              break;
            }
          }
        }

        const dirName = path.basename(dirPath).toLowerCase()
        const isMatchKeyword = keywordList.some(k => dirName.includes(k))

        if (hasImages && depth > 1) {
          results.add(dirPath)
        } else if (isMatchKeyword && depth > 1) {
          results.add(dirPath)
        }

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            search(path.join(dirPath, entry.name), depth + 1)
          }
        }
      } catch (e) {}
    }

    search(rootPath, 1)
    
    const paths = Array.from(results)
    const filteredPaths = paths.filter(p1 => {
      const hasSubAlbum = paths.some(p2 => p2 !== p1 && p2.startsWith(p1 + path.sep))
      return !hasSubAlbum
    })

    return filteredPaths.length > 0 ? filteredPaths : paths
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
      const specificName = this.getGameAlbumName(dirPath)
      const finalName = specificName || (() => {
        const relativePath = path.relative(gamePath, dirPath)
        return `游戏相册 - ${relativePath.replace(/\\/g, '/') || path.basename(dirPath)}`
      })()

      if (!album) {
        album = AlbumModel.create({
          name: finalName,
          path: dirPath,
          type: 'game',
          description: `截图目录: ${dirPath}`,
        })
      } else if (album.name !== finalName && album.type === 'game') {
        AlbumModel.update(album.id, { name: finalName })
        album.name = finalName
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