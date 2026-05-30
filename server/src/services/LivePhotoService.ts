import fs from 'fs'
import path from 'path'
import logger from '../utils/logger'

/**
 * 实况照片导出服务
 *
 * 支持 Google Motion Photo v2 格式：
 * - JPEG + XMP元数据 + 尾部追加MP4视频
 * - 与 Google Photos 完全兼容
 *
 * 移植自 nikki_albums 的 LivePhotoExportService
 */

/** 导出格式枚举 */
export enum ExportFormat {
  GoogleMotionPhoto = 'googleMotionPhoto',
}

/** 导出策略接口 */
interface LivePhotoExportStrategy {
  export(options: {
    coverImagePath: string
    videoPath: string
    outputPath: string
  }): Promise<string> // 返回输出文件路径
}

/** XMP命名空间字节 */
const XMP_NS_BYTES = Buffer.from('http://ns.adobe.com/xap/1.0/\x00', 'utf-8')

/**
 * Google Motion Photo v2 导出策略
 *
 * 格式：SOI + XMP APP1 + 原始JPEG段 + MP4视频
 * XMP包含 Container:Directory 描述主图和视频的偏移信息
 */
class GoogleMotionPhotoStrategy implements LivePhotoExportStrategy {
  async export(options: {
    coverImagePath: string
    videoPath: string
    outputPath: string
  }): Promise<string> {
    const { coverImagePath, videoPath, outputPath } = options

    // 读取视频和图片
    const videoBytes = fs.readFileSync(videoPath)
    const imageBytes = fs.readFileSync(coverImagePath)

    // 验证JPEG格式
    if (imageBytes.length < 2 || imageBytes[0] !== 0xFF || imageBytes[1] !== 0xD8) {
      throw new Error('Cover image is not a valid JPEG file')
    }

    const videoSize = videoBytes.length

    // 构建XMP元数据
    const xmp = this.buildXmp(videoSize)
    const xmpBytes = Buffer.from(xmp, 'utf-8')

    // 构建APP1段
    const segLen = 2 + XMP_NS_BYTES.length + xmpBytes.length
    const app1Header = Buffer.alloc(4)
    app1Header[0] = 0xFF
    app1Header[1] = 0xE1
    app1Header[2] = (segLen >> 8) & 0xFF
    app1Header[3] = segLen & 0xFF
    const app1Segment = Buffer.concat([app1Header, XMP_NS_BYTES, xmpBytes])

    // 去除原始图片中的XMP段
    const strippedImage = this.stripExistingXmp(imageBytes)

    // 组装最终文件：SOI + XMP APP1 + 原始JPEG段 + MP4视频
    const output = Buffer.concat([
      Buffer.from([0xFF, 0xD8]), // SOI
      app1Segment,               // XMP APP1
      strippedImage,             // 原始JPEG数据（不含SOI和XMP）
      videoBytes,                // MP4视频
    ])

    // 生成输出文件名
    const videoName = path.basename(videoPath, path.extname(videoPath))
    const outFilePath = path.join(outputPath, `${videoName}_motion.jpg`)

    // 确保输出目录存在
    const outDir = path.dirname(outFilePath)
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    fs.writeFileSync(outFilePath, output)
    logger.info(`Motion photo exported: ${outFilePath} (${(output.length / 1024).toFixed(1)}KB)`)

    return outFilePath
  }

  /**
   * 构建Motion Photo XMP元数据
   */
  private buildXmp(videoSize: number): string {
    return (
      '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
      '<x:xmpmeta xmlns:x="adobe:ns:meta/">' +
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
      '<rdf:Description rdf:about=""' +
      ' xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"' +
      ' xmlns:Container="http://ns.google.com/photos/1.0/container/"' +
      ' xmlns:Item="http://ns.google.com/photos/1.0/container/item/"' +
      ' GCamera:MotionPhoto="1"' +
      ' GCamera:MotionPhotoVersion="1"' +
      ' GCamera:MotionPhotoPresentationTimestampUs="-1">' +
      '<Container:Directory>' +
      '<rdf:Seq>' +
      '<rdf:li rdf:parseType="Resource">' +
      '<Container:Item' +
      ' Item:Mime="image/jpeg"' +
      ' Item:Semantic="Primary"' +
      ' Item:Length="0"' +
      ' Item:Padding="0"/>' +
      '</rdf:li>' +
      '<rdf:li rdf:parseType="Resource">' +
      `<Container:Item` +
      ` Item:Mime="video/mp4"` +
      ` Item:Semantic="MotionPhoto"` +
      ` Item:Length="${videoSize}"` +
      ` Item:Padding="0"/>` +
      '</rdf:li>' +
      '</rdf:Seq>' +
      '</Container:Directory>' +
      '</rdf:Description>' +
      '</rdf:RDF>' +
      '</x:xmpmeta>' +
      '<?xpacket end="w"?>'
    )
  }

  /**
   * 去除JPEG中的现有XMP段
   */
  private stripExistingXmp(jpeg: Buffer): Buffer {
    const parts: Buffer[] = []
    let pos = 2 // 跳过SOI

    while (pos < jpeg.length - 1) {
      if (jpeg[pos] !== 0xFF) {
        parts.push(jpeg.subarray(pos))
        break
      }

      const marker = jpeg[pos + 1]

      // SOS (Start of Scan) - 后面是图像数据，直接追加
      if (marker === 0xDA) {
        parts.push(jpeg.subarray(pos))
        break
      }

      // 无长度的标记
      if (
        marker === 0xD8 || marker === 0xD9 ||
        (marker >= 0xD0 && marker <= 0xD7) ||
        marker === 0x01
      ) {
        parts.push(Buffer.from([0xFF, marker]))
        pos += 2
        continue
      }

      // 有长度的段
      if (pos + 3 >= jpeg.length) {
        parts.push(jpeg.subarray(pos))
        break
      }

      const segLength = (jpeg[pos + 2] << 8) | jpeg[pos + 3]
      const segEnd = pos + 2 + segLength

      // 检测并跳过XMP段
      if (marker === 0xE1 && this.isXmpSegment(jpeg, pos + 4, segEnd)) {
        pos = segEnd
        continue
      }

      // 保留非XMP段
      parts.push(jpeg.subarray(pos, Math.min(segEnd, jpeg.length)))
      pos = segEnd
    }

    return Buffer.concat(parts)
  }

  /**
   * 检测是否为XMP段
   */
  private isXmpSegment(data: Buffer, start: number, end: number): boolean {
    if (end - start < XMP_NS_BYTES.length) return false
    for (let i = 0; i < XMP_NS_BYTES.length; i++) {
      if (start + i >= data.length || data[start + i] !== XMP_NS_BYTES[i]) {
        return false
      }
    }
    return true
  }
}

/**
 * 实况照片导出服务入口
 */
export class LivePhotoExportService {
  private strategies: Map<ExportFormat, LivePhotoExportStrategy>

  constructor() {
    this.strategies = new Map([
      [ExportFormat.GoogleMotionPhoto, new GoogleMotionPhotoStrategy()],
    ])
  }

  /**
   * 导出实况照片
   * @param format 导出格式
   * @param coverImagePath 封面图片路径（JPEG）
   * @param videoPath 视频路径（MP4）
   * @param outputPath 输出目录
   * @returns 输出文件路径
   */
  async export(
    format: ExportFormat,
    coverImagePath: string,
    videoPath: string,
    outputPath: string
  ): Promise<string> {
    const strategy = this.strategies.get(format)
    if (!strategy) {
      throw new Error(`Unsupported export format: ${format}`)
    }

    // 验证输入文件
    if (!fs.existsSync(coverImagePath)) {
      throw new Error(`Cover image not found: ${coverImagePath}`)
    }
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`)
    }

    return strategy.export({ coverImagePath, videoPath, outputPath })
  }

  /**
   * 从游戏截图目录查找配套的图片和视频
   * 游戏截图格式：同一场景会生成 .jpg 和 .mp4 两个文件
   */
  static findPairedFiles(directory: string): Array<{
    image: string
    video: string
    baseName: string
  }> {
    const pairs: Array<{ image: string; video: string; baseName: string }> = []

    if (!fs.existsSync(directory)) return pairs

    const files = fs.readdirSync(directory)
    const imageFiles = new Map<string, string>()

    // 收集所有JPEG文件
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (ext === '.jpg' || ext === '.jpeg') {
        const baseName = path.basename(file, ext)
        imageFiles.set(baseName, path.join(directory, file))
      }
    }

    // 匹配MP4文件
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (ext === '.mp4') {
        const baseName = path.basename(file, ext)
        const imagePath = imageFiles.get(baseName)
        if (imagePath) {
          pairs.push({
            image: imagePath,
            video: path.join(directory, file),
            baseName,
          })
        }
      }
    }

    return pairs
  }

  /**
   * 批量导出目录中的所有实况照片
   */
  async exportDirectory(
    format: ExportFormat,
    inputDir: string,
    outputDir: string
  ): Promise<{
    success: number
    failed: number
    results: Array<{ baseName: string; success: boolean; outputPath?: string; error?: string }>
  }> {
    const pairs = LivePhotoExportService.findPairedFiles(inputDir)
    const results: Array<{ baseName: string; success: boolean; outputPath?: string; error?: string }> = []
    let success = 0
    let failed = 0

    for (const pair of pairs) {
      try {
        const outPath = await this.export(format, pair.image, pair.video, outputDir)
        success++
        results.push({ baseName: pair.baseName, success: true, outputPath: outPath })
      } catch (error) {
        failed++
        results.push({
          baseName: pair.baseName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success, failed, results }
  }
}
