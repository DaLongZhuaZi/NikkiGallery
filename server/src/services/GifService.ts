import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GifConversionOptions {
  fps?: number
  width?: number
  startTime?: number
  duration?: number
}

export interface GifConversionResult {
  success: boolean
  outputPath?: string
  error?: string
  fileSize?: number
}

class GifService {
  private tempDir: string

  constructor() {
    this.tempDir = path.join(process.cwd(), 'data', 'temp', 'gif')
    this.ensureTempDir()
  }

  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  // 检查 FFmpeg 是否可用
  async checkFfmpeg(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version')
      return true
    } catch (error) {
      return false
    }
  }

  // 获取视频信息
  async getVideoInfo(videoPath: string): Promise<{
    duration: number
    width: number
    height: number
    fps: number
  } | null> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
      )
      const info = JSON.parse(stdout)

      const videoStream = info.streams?.find((s: any) => s.codec_type === 'video')
      if (!videoStream) {
        return null
      }

      // 解析帧率
      let fps = 30
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/')
        fps = parseInt(num) / parseInt(den)
      }

      return {
        duration: parseFloat(info.format?.duration || '0'),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: Math.round(fps)
      }
    } catch (error) {
      console.error('获取视频信息失败:', error)
      return null
    }
  }

  // 转换 MP4 到 GIF
  async convertToGif(
    videoPath: string,
    options: GifConversionOptions = {}
  ): Promise<GifConversionResult> {
    try {
      // 检查 FFmpeg
      const hasFfmpeg = await this.checkFfmpeg()
      if (!hasFfmpeg) {
        return {
          success: false,
          error: 'FFmpeg 未安装或不可用'
        }
      }

      // 检查输入文件
      if (!fs.existsSync(videoPath)) {
        return {
          success: false,
          error: '视频文件不存在'
        }
      }

      // 获取视频信息
      const videoInfo = await this.getVideoInfo(videoPath)
      if (!videoInfo) {
        return {
          success: false,
          error: '无法获取视频信息'
        }
      }

      // 设置默认参数
      const fps = options.fps || 10
      const width = options.width || 480
      const startTime = options.startTime || 0
      const duration = options.duration || videoInfo.duration

      // 生成输出文件名
      const timestamp = Date.now()
      const outputFilename = `gif_${timestamp}.gif`
      const outputPath = path.join(this.tempDir, outputFilename)

      // 构建 FFmpeg 命令
      const filters = [
        `fps=${fps}`,
        `scale=${width}:-1:flags=lanczos`,
        'split[s0][s1]',
        '[s0]palettegen[p]',
        '[s1][p]paletteuse'
      ].join(',')

      let command = `ffmpeg -y`
      if (startTime > 0) {
        command += ` -ss ${startTime}`
      }
      command += ` -i "${videoPath}"`
      if (duration < videoInfo.duration) {
        command += ` -t ${duration}`
      }
      command += ` -vf "${filters}" -loop 0 "${outputPath}"`

      // 执行转换
      await execAsync(command, { timeout: 300000 }) // 5分钟超时

      // 检查输出文件
      if (!fs.existsSync(outputPath)) {
        return {
          success: false,
          error: 'GIF 生成失败'
        }
      }

      const stats = fs.statSync(outputPath)

      return {
        success: true,
        outputPath,
        fileSize: stats.size
      }
    } catch (error) {
      console.error('MP4 转 GIF 失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换失败'
      }
    }
  }

  // 清理临时文件
  cleanup(maxAge: number = 3600000) { // 默认1小时
    try {
      const now = Date.now()
      const files = fs.readdirSync(this.tempDir)

      for (const file of files) {
        const filePath = path.join(this.tempDir, file)
        const stats = fs.statSync(filePath)

        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
        }
      }
    } catch (error) {
      console.error('清理临时文件失败:', error)
    }
  }

  // 获取临时文件路径
  getTempFilePath(filename: string): string {
    return path.join(this.tempDir, filename)
  }

  // 删除临时文件
  deleteTempFile(filename: string): boolean {
    try {
      const filePath = path.join(this.tempDir, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return true
      }
      return false
    } catch (error) {
      console.error('删除临时文件失败:', error)
      return false
    }
  }
}

export const gifService = new GifService()
