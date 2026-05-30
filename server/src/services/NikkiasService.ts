import * as fs from 'fs'
import * as path from 'path'

// archiver v8 and unzipper require CommonJS import
const archiver = require('archiver')
const unzipper = require('unzipper')
const ZipArchive = archiver.ZipArchive

// ===== 归档格式常量 =====
const NIKKIAS_EXTENSION = '.nikkias'
const MANIFEST_FILENAME = 'manifest'
const CONTENT_DIR_NAME = 'content'

// ===== 归档类型枚举 =====
export enum NikkiasType {
  AlbumBackup = 'albumBackup',     // 完整相册备份
  ImageTransfer = 'imageTransfer', // 单相册图片传输
  Other = 'other'                  // 其他
}

// ===== 启动渠道枚举 =====
export enum LauncherChannel {
  Unknown = 'unknown',
  Paper = 'paper',           // 国服
  PaperGlobal = 'paperGlobal', // 国际服
  TapTap = 'taptap',
  Bilibili = 'bilibili',
  Steam = 'steam'
}

// ===== Manifest 接口 =====
export interface NikkiasManifestBase {
  manifestVersion: number
  type: NikkiasType
  launcherChannel: LauncherChannel
}

export interface AlbumBackupManifest extends NikkiasManifestBase {
  type: NikkiasType.AlbumBackup
}

export interface ImageTransferManifest extends NikkiasManifestBase {
  type: NikkiasType.ImageTransfer
  uid: string
  albumType: string
}

export interface OtherManifest extends NikkiasManifestBase {
  type: NikkiasType.Other
}

export type NikkiasManifest = AlbumBackupManifest | ImageTransferManifest | OtherManifest

// ===== 归档创建选项 =====
export interface NikkiasCreateOptions {
  type: NikkiasType
  launcherChannel?: LauncherChannel
  uid?: string
  albumType?: string
  sourceDir: string         // 要打包的源目录
  outputPath: string        // 输出 .nikkias 文件路径
  fileFilter?: (filePath: string) => boolean  // 可选的文件过滤器
}

// ===== 归档解压选项 =====
export interface NikkiasExtractOptions {
  nikkiasFilePath: string   // .nikkias 文件路径
  outputDir: string         // 解压目标目录
  extractContentOnly?: boolean  // 是否只解压content目录内容（不含content/前缀）
}

// ===== 进度回调 =====
export type ProgressCallback = (progress: number, total: number, message?: string) => void

// ===== 核心服务 =====
class NikkiasService {

  // 创建 manifest JSON
  private createManifest(options: NikkiasCreateOptions): string {
    const manifestData: Record<string, any> = {
      manifestVersion: 0,
      type: options.type,
      launcherChannel: options.launcherChannel || LauncherChannel.Unknown
    }

    if (options.type === NikkiasType.ImageTransfer) {
      if (!options.uid || !options.albumType) {
        throw new Error('ImageTransfer 类型的归档必须提供 uid 和 albumType')
      }
      manifestData.uid = options.uid
      manifestData.albumType = options.albumType
    }

    return JSON.stringify({ nikkias: manifestData }, null, 2)
  }

  // 解析 manifest JSON
  parseManifest(manifestJson: string): NikkiasManifest {
    try {
      const data = JSON.parse(manifestJson)
      const nikkias = data.nikkias

      if (!nikkias) {
        throw new Error('manifest 缺少 nikkias 字段')
      }

      const base = {
        manifestVersion: nikkias.manifestVersion || 0,
        launcherChannel: nikkias.launcherChannel || LauncherChannel.Unknown
      }

      switch (nikkias.type) {
        case NikkiasType.AlbumBackup:
          return { ...base, type: NikkiasType.AlbumBackup }
        case NikkiasType.ImageTransfer:
          return {
            ...base,
            type: NikkiasType.ImageTransfer,
            uid: nikkias.uid,
            albumType: nikkias.albumType
          }
        case NikkiasType.Other:
        default:
          return { ...base, type: NikkiasType.Other }
      }
    } catch (error) {
      throw new Error(`解析 manifest 失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 收集目录中的文件
  private collectFiles(dir: string, basePath: string = '', filter?: (filePath: string) => boolean): Array<{ fullPath: string; archivePath: string }> {
    const files: Array<{ fullPath: string; archivePath: string }> = []

    if (!fs.existsSync(dir)) {
      return files
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const archivePath = basePath ? `${basePath}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        files.push(...this.collectFiles(fullPath, archivePath, filter))
      } else {
        if (!filter || filter(fullPath)) {
          files.push({ fullPath, archivePath })
        }
      }
    }

    return files
  }

  // 创建 nikkias 归档
  async createArchive(options: NikkiasCreateOptions, onProgress?: ProgressCallback): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // 验证源目录
      if (!fs.existsSync(options.sourceDir)) {
        return { success: false, error: '源目录不存在' }
      }

      // 确保输出目录存在
      const outputDir = path.dirname(options.outputPath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // 确保文件扩展名正确
      let outputPath = options.outputPath
      if (!outputPath.endsWith(NIKKIAS_EXTENSION)) {
        outputPath += NIKKIAS_EXTENSION
      }

      // 创建 manifest
      const manifestJson = this.createManifest(options)

      // 收集源文件
      const files = this.collectFiles(options.sourceDir, '', options.fileFilter)
      const totalFiles = files.length + 2 // +2 for manifest and potential directory entry

      if (onProgress) {
        onProgress(0, totalFiles, '开始创建归档...')
      }

      // 创建 ZIP 归档
      return new Promise((resolve) => {
        const output = fs.createWriteStream(outputPath)
        // archiver v8 API: new ZipArchive(options)
        const archive = new ZipArchive({
          zlib: { level: 0 } // 不压缩，仅打包（图片已压缩）
        })

        let processedFiles = 0

        output.on('close', () => {
          if (onProgress) {
            onProgress(totalFiles, totalFiles, '归档创建完成')
          }
          resolve({ success: true, outputPath })
        })

        archive.on('warning', (err: any) => {
          if (err.code === 'ENOENT') {
            console.warn('归档警告:', err.message)
          } else {
            resolve({ success: false, error: err.message })
          }
        })

        archive.on('error', (err: any) => {
          resolve({ success: false, error: err.message })
        })

        archive.on('progress', (progress: any) => {
          processedFiles = progress.entries.processed
          if (onProgress) {
            onProgress(processedFiles, totalFiles, `正在打包: ${processedFiles}/${totalFiles}`)
          }
        })

        archive.pipe(output)

        // 添加 manifest 文件
        archive.append(manifestJson, { name: MANIFEST_FILENAME })

        // 添加内容文件到 content/ 目录
        for (const file of files) {
          archive.file(file.fullPath, { name: `${CONTENT_DIR_NAME}/${file.archivePath}` })
        }

        archive.finalize()
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '创建归档失败' }
    }
  }

  // 从 nikkias 归档中读取 manifest
  async readManifest(nikkiasFilePath: string): Promise<{ success: boolean; manifest?: NikkiasManifest; error?: string }> {
    try {
      if (!fs.existsSync(nikkiasFilePath)) {
        return { success: false, error: '归档文件不存在' }
      }

      return new Promise((resolve) => {
        let manifestFound = false

        fs.createReadStream(nikkiasFilePath)
          .pipe(unzipper.Parse())
          .on('entry', (entry: any) => {
            const fileName = entry.path
            if (fileName === MANIFEST_FILENAME) {
              manifestFound = true
              entry.buffer().then((buffer: Buffer) => {
                try {
                  const manifest = this.parseManifest(buffer.toString('utf-8'))
                  resolve({ success: true, manifest })
                } catch (error) {
                  resolve({ success: false, error: error instanceof Error ? error.message : '解析manifest失败' })
                }
              })
            } else {
              entry.autodrain()
            }
          })
          .on('end', () => {
            if (!manifestFound) {
              resolve({ success: false, error: '归档中未找到manifest文件' })
            }
          })
          .on('error', (err: any) => {
            resolve({ success: false, error: err.message })
          })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '读取manifest失败' }
    }
  }

  // 解压 nikkias 归档
  async extractArchive(options: NikkiasExtractOptions, onProgress?: ProgressCallback): Promise<{ success: boolean; manifest?: NikkiasManifest; extractedFiles?: number; error?: string }> {
    try {
      if (!fs.existsSync(options.nikkiasFilePath)) {
        return { success: false, error: '归档文件不存在' }
      }

      // 确保输出目录存在
      if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true })
      }

      return new Promise((resolve) => {
        let manifest: NikkiasManifest | undefined
        let extractedFiles = 0
        let totalEntries = 0
        let processedEntries = 0

        // 先计算总条目数
        fs.createReadStream(options.nikkiasFilePath)
          .pipe(unzipper.Parse())
          .on('entry', (entry: any) => {
            totalEntries++
            entry.autodrain()
          })
          .on('end', () => {
            // 第二遍：实际解压
            doExtract()
          })

        const doExtract = () => {
          fs.createReadStream(options.nikkiasFilePath)
            .pipe(unzipper.Parse())
            .on('entry', (entry: any) => {
              const fileName = entry.path

              if (fileName === MANIFEST_FILENAME) {
                // 处理 manifest
                entry.buffer().then((buffer: Buffer) => {
                  try {
                    manifest = this.parseManifest(buffer.toString('utf-8'))
                  } catch (error) {
                    console.warn('解析manifest失败:', error)
                  }
                  processedEntries++
                  if (onProgress) {
                    onProgress(processedEntries, totalEntries, '解析manifest...')
                  }
                })
              } else if (fileName.startsWith(CONTENT_DIR_NAME + '/')) {
                // 处理 content 目录中的文件
                let targetPath: string
                if (options.extractContentOnly) {
                  // 去掉 content/ 前缀
                  const relativePath = fileName.substring(CONTENT_DIR_NAME.length + 1)
                  targetPath = path.join(options.outputDir, relativePath)
                } else {
                  targetPath = path.join(options.outputDir, fileName)
                }

                // 确保目标目录存在
                const targetDir = path.dirname(targetPath)
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true })
                }

                entry.pipe(fs.createWriteStream(targetPath))
                extractedFiles++
                processedEntries++

                if (onProgress) {
                  onProgress(processedEntries, totalEntries, `解压: ${path.basename(fileName)}`)
                }
              } else {
                // 其他文件（如根目录的文件）
                const targetPath = path.join(options.outputDir, fileName)
                const targetDir = path.dirname(targetPath)
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true })
                }
                entry.pipe(fs.createWriteStream(targetPath))
                extractedFiles++
                processedEntries++
              }
            })
            .on('end', () => {
              if (onProgress) {
                onProgress(totalEntries, totalEntries, '解压完成')
              }
              resolve({ success: true, manifest, extractedFiles })
            })
            .on('error', (err: any) => {
              resolve({ success: false, error: err.message })
            })
        }
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '解压归档失败' }
    }
  }

  // 验证 nikkias 文件是否有效
  async validateArchive(nikkiasFilePath: string): Promise<{ valid: boolean; manifest?: NikkiasManifest; errors: string[] }> {
    const errors: string[] = []

    try {
      if (!fs.existsSync(nikkiasFilePath)) {
        return { valid: false, errors: ['文件不存在'] }
      }

      if (!nikkiasFilePath.endsWith(NIKKIAS_EXTENSION)) {
        errors.push('文件扩展名不是 .nikkias')
      }

      const result = await this.readManifest(nikkiasFilePath)
      if (!result.success) {
        errors.push(result.error || '无法读取manifest')
        return { valid: false, errors }
      }

      // 验证 manifest 结构
      const manifest = result.manifest!
      if (!Object.values(NikkiasType).includes(manifest.type)) {
        errors.push(`无效的归档类型: ${manifest.type}`)
      }

      if (manifest.type === NikkiasType.ImageTransfer) {
        const imgManifest = manifest as ImageTransferManifest
        if (!imgManifest.uid) {
          errors.push('ImageTransfer 类型缺少 uid')
        }
        if (!imgManifest.albumType) {
          errors.push('ImageTransfer 类型缺少 albumType')
        }
      }

      return { valid: errors.length === 0, manifest, errors }
    } catch (error) {
      errors.push(`验证失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return { valid: false, errors }
    }
  }

  // 获取归档信息（不完全解压）
  async getArchiveInfo(nikkiasFilePath: string): Promise<{
    success: boolean
    manifest?: NikkiasManifest
    fileCount?: number
    totalSize?: number
    files?: string[]
    error?: string
  }> {
    try {
      if (!fs.existsSync(nikkiasFilePath)) {
        return { success: false, error: '归档文件不存在' }
      }

      const fileStats = fs.statSync(nikkiasFilePath)

      return new Promise((resolve) => {
        let manifest: NikkiasManifest | undefined
        let fileCount = 0
        const files: string[] = []

        fs.createReadStream(nikkiasFilePath)
          .pipe(unzipper.Parse())
          .on('entry', (entry: any) => {
            const fileName = entry.path
            if (fileName === MANIFEST_FILENAME) {
              entry.buffer().then((buffer: Buffer) => {
                try {
                  manifest = this.parseManifest(buffer.toString('utf-8'))
                } catch (error) {
                  // ignore
                }
              })
            } else if (fileName.startsWith(CONTENT_DIR_NAME + '/')) {
              fileCount++
              files.push(fileName.substring(CONTENT_DIR_NAME.length + 1))
            }
            entry.autodrain()
          })
          .on('end', () => {
            resolve({
              success: true,
              manifest,
              fileCount,
              totalSize: fileStats.size,
              files
            })
          })
          .on('error', (err: any) => {
            resolve({ success: false, error: err.message })
          })
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取归档信息失败' }
    }
  }
}

export const nikkiasService = new NikkiasService()
