import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface DuplicateGroup {
  hash: string
  files: DuplicateFile[]
}

export interface DuplicateFile {
  path: string
  filename: string
  size: number
  lastModified: string
  album: string
}

export interface DedupResult {
  totalFiles: number
  duplicateGroups: number
  duplicateFiles: number
  wastedSpace: number
  groups: DuplicateGroup[]
}

class DedupService {
  // 计算文件哈希（使用部分文件内容提高性能）
  private async calculateFileHash(filePath: string, sampleSize: number = 64 * 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filePath, { start: 0, end: sampleSize - 1 })

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  // 计算完整文件哈希
  private async calculateFullHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  // 扫描目录获取所有图片文件
  private scanDirectory(dirPath: string, recursive: boolean = true): string[] {
    const files: string[] = []

    if (!fs.existsSync(dirPath)) {
      return files
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']

    const scan = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name)

          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (imageExtensions.includes(ext)) {
              files.push(fullPath)
            }
          } else if (entry.isDirectory() && recursive) {
            scan(fullPath)
          }
        }
      } catch (error) {
        // 忽略无权限的目录
      }
    }

    scan(dirPath)
    return files
  }

  // 检测重复图片
  async detectDuplicates(
    gamePath: string,
    uid?: string,
    albumTypes?: string[]
  ): Promise<DedupResult> {
    const photosPath = path.join(gamePath, 'X6Game', 'Saved', 'GamePlayPhotos')

    // 收集所有需要扫描的目录
    const scanPaths: string[] = []

    if (uid) {
      // 扫描特定用户的相册
      const userPath = path.join(photosPath, uid)
      if (fs.existsSync(userPath)) {
        if (albumTypes && albumTypes.length > 0) {
          for (const albumType of albumTypes) {
            const albumPath = path.join(userPath, albumType)
            if (fs.existsSync(albumPath)) {
              scanPaths.push(albumPath)
            }
          }
        } else {
          scanPaths.push(userPath)
        }
      }
    } else {
      // 扫描所有用户
      if (fs.existsSync(photosPath)) {
        const entries = fs.readdirSync(photosPath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanPaths.push(path.join(photosPath, entry.name))
          }
        }
      }
    }

    // 收集所有文件
    const allFiles: Array<{ path: string; album: string }> = []
    for (const scanPath of scanPaths) {
      const files = this.scanDirectory(scanPath)
      for (const file of files) {
        const relativePath = path.relative(scanPath, file)
        const album = relativePath.split(path.sep)[0] || 'unknown'
        allFiles.push({ path: file, album })
      }
    }

    // 按文件大小分组（快速预筛选）
    const sizeGroups = new Map<number, typeof allFiles>()
    for (const file of allFiles) {
      try {
        const stat = fs.statSync(file.path)
        const size = stat.size

        if (!sizeGroups.has(size)) {
          sizeGroups.set(size, [])
        }
        sizeGroups.get(size)!.push(file)
      } catch (error) {
        // 忽略无法访问的文件
      }
    }

    // 对大小相同的文件计算哈希
    const hashGroups = new Map<string, DuplicateFile[]>()

    for (const [size, files] of sizeGroups) {
      if (files.length < 2) continue // 没有重复

      for (const file of files) {
        try {
          // 先用部分文件内容计算哈希
          const hash = await this.calculateFileHash(file.path)
          const fullHash = `${hash}-${size}`

          if (!hashGroups.has(fullHash)) {
            hashGroups.set(fullHash, [])
          }

          const stat = fs.statSync(file.path)
          hashGroups.get(fullHash)!.push({
            path: file.path,
            filename: path.basename(file.path),
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            album: file.album
          })
        } catch (error) {
          // 忽略计算哈希失败的文件
        }
      }
    }

    // 过滤出真正的重复组
    const duplicateGroups: DuplicateGroup[] = []
    let duplicateFiles = 0
    let wastedSpace = 0

    for (const [hash, files] of hashGroups) {
      if (files.length < 2) continue

      // 使用完整哈希验证
      const fullHashMap = new Map<string, DuplicateFile[]>()
      for (const file of files) {
        try {
          const fullHash = await this.calculateFullHash(file.path)
          if (!fullHashMap.has(fullHash)) {
            fullHashMap.set(fullHash, [])
          }
          fullHashMap.get(fullHash)!.push(file)
        } catch (error) {
          // 忽略错误
        }
      }

      for (const [fullHash, groupFiles] of fullHashMap) {
        if (groupFiles.length < 2) continue

        duplicateGroups.push({
          hash: fullHash,
          files: groupFiles
        })

        duplicateFiles += groupFiles.length - 1
        wastedSpace += (groupFiles.length - 1) * groupFiles[0].size
      }
    }

    return {
      totalFiles: allFiles.length,
      duplicateGroups: duplicateGroups.length,
      duplicateFiles,
      wastedSpace,
      groups: duplicateGroups
    }
  }

  // 删除重复文件（保留指定的文件）
  async removeDuplicates(
    duplicateGroups: DuplicateGroup[],
    keepStrategy: 'newest' | 'oldest' | 'first' | 'last'
  ): Promise<{
    deletedCount: number
    freedSpace: number
    errors: string[]
  }> {
    let deletedCount = 0
    let freedSpace = 0
    const errors: string[] = []

    for (const group of duplicateGroups) {
      if (group.files.length < 2) continue

      // 根据策略选择保留的文件
      let keepFile: DuplicateFile
      const sortedFiles = [...group.files]

      switch (keepStrategy) {
        case 'newest':
          sortedFiles.sort((a, b) =>
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
          )
          keepFile = sortedFiles[0]
          break
        case 'oldest':
          sortedFiles.sort((a, b) =>
            new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          )
          keepFile = sortedFiles[0]
          break
        case 'first':
          keepFile = group.files[0]
          break
        case 'last':
          keepFile = group.files[group.files.length - 1]
          break
      }

      // 删除其他文件
      for (const file of group.files) {
        if (file.path === keepFile!.path) continue

        try {
          if (fs.existsSync(file.path)) {
            const stat = fs.statSync(file.path)
            fs.unlinkSync(file.path)
            deletedCount++
            freedSpace += stat.size
          }
        } catch (error) {
          errors.push(`Failed to delete ${file.path}: ${error}`)
        }
      }
    }

    return { deletedCount, freedSpace, errors }
  }

  // 移动重复文件到回收站
  async moveToRecycleBin(
    duplicateGroups: DuplicateGroup[],
    recycleBinPath: string,
    keepStrategy: 'newest' | 'oldest' | 'first' | 'last'
  ): Promise<{
    movedCount: number
    freedSpace: number
    errors: string[]
  }> {
    // 确保回收站目录存在
    if (!fs.existsSync(recycleBinPath)) {
      fs.mkdirSync(recycleBinPath, { recursive: true })
    }

    let movedCount = 0
    let freedSpace = 0
    const errors: string[] = []

    for (const group of duplicateGroups) {
      if (group.files.length < 2) continue

      // 根据策略选择保留的文件
      let keepFile: DuplicateFile
      const sortedFiles = [...group.files]

      switch (keepStrategy) {
        case 'newest':
          sortedFiles.sort((a, b) =>
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
          )
          keepFile = sortedFiles[0]
          break
        case 'oldest':
          sortedFiles.sort((a, b) =>
            new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          )
          keepFile = sortedFiles[0]
          break
        case 'first':
          keepFile = group.files[0]
          break
        case 'last':
          keepFile = group.files[group.files.length - 1]
          break
      }

      // 移动其他文件到回收站
      for (const file of group.files) {
        if (file.path === keepFile!.path) continue

        try {
          if (fs.existsSync(file.path)) {
            const timestamp = Date.now()
            const filename = `${timestamp}_${path.basename(file.path)}`
            const destPath = path.join(recycleBinPath, filename)

            fs.renameSync(file.path, destPath)
            movedCount++
            freedSpace += file.size
          }
        } catch (error) {
          errors.push(`Failed to move ${file.path}: ${error}`)
        }
      }
    }

    return { movedCount, freedSpace, errors }
  }

  // 查找相似图片（基于文件名模式）
  async findSimilarByFilename(
    gamePath: string,
    uid?: string
  ): Promise<Array<{
    pattern: string
    files: DuplicateFile[]
  }>> {
    const photosPath = path.join(gamePath, 'X6Game', 'Saved', 'GamePlayPhotos')
    const scanPath = uid
      ? path.join(photosPath, uid)
      : photosPath

    if (!fs.existsSync(scanPath)) {
      return []
    }

    const files = this.scanDirectory(scanPath)

    // 按文件名模式分组
    const patternGroups = new Map<string, DuplicateFile[]>()

    for (const filePath of files) {
      const filename = path.basename(filePath)
      const ext = path.extname(filename)
      const nameWithoutExt = path.basename(filename, ext)

      // 提取文件名模式（移除时间戳、序号等）
      const pattern = nameWithoutExt
        .replace(/_\d+$/, '') // 移除末尾的 _数字
        .replace(/-\d+$/, '') // 移除末尾的 -数字
        .replace(/\(\d+\)$/, '') // 移除末尾的 (数字)
        .replace(/\s+\d+$/, '') // 移除末尾的 空格数字
        .trim()

      if (pattern.length < 3) continue // 太短的模式跳过

      if (!patternGroups.has(pattern)) {
        patternGroups.set(pattern, [])
      }

      try {
        const stat = fs.statSync(filePath)
        const relativePath = path.relative(scanPath, filePath)
        const album = relativePath.split(path.sep)[0] || 'unknown'

        patternGroups.get(pattern)!.push({
          path: filePath,
          filename,
          size: stat.size,
          lastModified: stat.mtime.toISOString(),
          album
        })
      } catch (error) {
        // 忽略错误
      }
    }

    // 过滤出有多于1个文件的组
    const results: Array<{ pattern: string; files: DuplicateFile[] }> = []

    for (const [pattern, files] of patternGroups) {
      if (files.length >= 2) {
        results.push({ pattern, files })
      }
    }

    return results
  }
}

export const dedupService = new DedupService()
export default dedupService
