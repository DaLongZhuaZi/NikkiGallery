import { Router, Request, Response } from 'express'
import dedupService from '../services/DedupService'
import configService from '../services/ConfigService'

const router = Router()

// 检测重复图片
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { uid, albumTypes } = req.body
    const config = configService.getAll()
    const gamePath = config.gamePath

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        error: 'Game path not configured'
      })
    }

    const result = await dedupService.detectDuplicates(gamePath, uid, albumTypes)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect duplicates'
    })
  }
})

// 删除重复文件
router.post('/remove', async (req: Request, res: Response) => {
  try {
    const { groups, keepStrategy } = req.body

    if (!groups || !keepStrategy) {
      return res.status(400).json({
        success: false,
        error: 'groups and keepStrategy are required'
      })
    }

    const result = await dedupService.removeDuplicates(groups, keepStrategy)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove duplicates'
    })
  }
})

// 移动重复文件到回收站
router.post('/recycle', async (req: Request, res: Response) => {
  try {
    const { groups, keepStrategy } = req.body
    const config = configService.getAll()
    const gamePath = config.gamePath

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        error: 'Game path not configured'
      })
    }

    if (!groups || !keepStrategy) {
      return res.status(400).json({
        success: false,
        error: 'groups and keepStrategy are required'
      })
    }

    const recycleBinPath = `${gamePath}\\X6Game\\NikkiAlbumsRecycleBin\\Dedup_${Date.now()}`
    const result = await dedupService.moveToRecycleBin(groups, recycleBinPath, keepStrategy)

    res.json({
      success: true,
      data: {
        ...result,
        recycleBinPath
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to recycle duplicates'
    })
  }
})

// 查找相似文件名
router.post('/similar-filenames', async (req: Request, res: Response) => {
  try {
    const { uid } = req.body
    const config = configService.getAll()
    const gamePath = config.gamePath

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        error: 'Game path not configured'
      })
    }

    const result = await dedupService.findSimilarByFilename(gamePath, uid)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to find similar filenames'
    })
  }
})

export default router
