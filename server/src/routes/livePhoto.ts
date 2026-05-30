import { Router, Request, Response } from 'express'
import { LivePhotoExportService, ExportFormat } from '../services/LivePhotoService'
import path from 'path'

const router = Router()
const livePhotoService = new LivePhotoExportService()

/**
 * POST /api/live-photo/export
 * 导出单个实况照片
 * Body: { coverImagePath, videoPath, outputPath, format? }
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { coverImagePath, videoPath, outputPath, format } = req.body

    if (!coverImagePath || !videoPath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: coverImagePath, videoPath',
      })
    }

    const exportFormat = format === 'googleMotionPhoto'
      ? ExportFormat.GoogleMotionPhoto
      : ExportFormat.GoogleMotionPhoto

    const outputDir = outputPath || path.dirname(coverImagePath)
    const resultPath = await livePhotoService.export(
      exportFormat,
      coverImagePath,
      videoPath,
      outputDir
    )

    res.json({
      success: true,
      data: { outputPath: resultPath },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * POST /api/live-photo/batch-export
 * 批量导出目录中的实况照片
 * Body: { inputDir, outputDir, format? }
 */
router.post('/batch-export', async (req: Request, res: Response) => {
  try {
    const { inputDir, outputDir, format } = req.body

    if (!inputDir) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: inputDir',
      })
    }

    const exportFormat = format === 'googleMotionPhoto'
      ? ExportFormat.GoogleMotionPhoto
      : ExportFormat.GoogleMotionPhoto

    const destDir = outputDir || inputDir
    const result = await livePhotoService.exportDirectory(
      exportFormat,
      inputDir,
      destDir
    )

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * POST /api/live-photo/find-pairs
 * 查找目录中配对的图片和视频
 * Body: { directory }
 */
router.post('/find-pairs', (req: Request, res: Response) => {
  try {
    const { directory } = req.body

    if (!directory) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: directory',
      })
    }

    const pairs = LivePhotoExportService.findPairedFiles(directory)

    res.json({
      success: true,
      data: { pairs, count: pairs.length },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
