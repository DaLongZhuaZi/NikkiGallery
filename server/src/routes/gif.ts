import { Router, Request, Response } from 'express'
import { gifService } from '../services/GifService'
import { configService } from '../services/ConfigService'
import * as path from 'path'
import * as fs from 'fs'

const router = Router()

// 检查 FFmpeg 是否可用
router.get('/check', async (req: Request, res: Response) => {
  try {
    const hasFfmpeg = await gifService.checkFfmpeg()
    res.json({
      success: true,
      data: { available: hasFfmpeg }
    })
  } catch (error) {
    console.error('检查 FFmpeg 失败:', error)
    res.status(500).json({ error: '检查 FFmpeg 失败' })
  }
})

// 获取视频信息
router.post('/video-info', async (req: Request, res: Response) => {
  try {
    const { videoPath } = req.body
    if (!videoPath) {
      return res.status(400).json({ error: '缺少视频路径' })
    }

    // 安全检查
    const config = configService.getAll()
    const allowedPaths = [
      config.gamePath,
      path.join(process.cwd(), 'data')
    ].filter(Boolean) as string[]

    const isAllowed = allowedPaths.some(allowedPath =>
      videoPath.startsWith(allowedPath)
    )

    if (!isAllowed) {
      return res.status(403).json({ error: '不允许访问该路径' })
    }

    const info = await gifService.getVideoInfo(videoPath)
    if (!info) {
      return res.status(404).json({ error: '无法获取视频信息' })
    }

    res.json({
      success: true,
      data: info
    })
  } catch (error) {
    console.error('获取视频信息失败:', error)
    res.status(500).json({ error: '获取视频信息失败' })
  }
})

// 转换 MP4 到 GIF
router.post('/convert', async (req: Request, res: Response) => {
  try {
    const { videoPath, fps, width, startTime, duration } = req.body
    if (!videoPath) {
      return res.status(400).json({ error: '缺少视频路径' })
    }

    // 安全检查
    const config = configService.getAll()
    const allowedPaths = [
      config.gamePath,
      path.join(process.cwd(), 'data')
    ].filter(Boolean) as string[]

    const isAllowed = allowedPaths.some(allowedPath =>
      videoPath.startsWith(allowedPath)
    )

    if (!isAllowed) {
      return res.status(403).json({ error: '不允许访问该路径' })
    }

    const result = await gifService.convertToGif(videoPath, {
      fps,
      width,
      startTime,
      duration
    })

    if (!result.success) {
      return res.status(500).json({ error: result.error })
    }

    res.json({
      success: true,
      data: {
        filename: path.basename(result.outputPath!),
        fileSize: result.fileSize
      }
    })
  } catch (error) {
    console.error('转换 GIF 失败:', error)
    res.status(500).json({ error: '转换 GIF 失败' })
  }
})

// 下载生成的 GIF
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = gifService.getTempFilePath(filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('下载文件失败:', err)
      }
      // 下载完成后删除临时文件
      gifService.deleteTempFile(filename)
    })
  } catch (error) {
    console.error('下载文件失败:', error)
    res.status(500).json({ error: '下载文件失败' })
  }
})

// 清理临时文件
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const { maxAge } = req.body
    gifService.cleanup(maxAge)
    res.json({ success: true })
  } catch (error) {
    console.error('清理临时文件失败:', error)
    res.status(500).json({ error: '清理临时文件失败' })
  }
})

export default router
