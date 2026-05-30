import { Router, Request, Response, NextFunction } from 'express'
import { ShareCodeService } from '../services/ShareCodeService'
import { AppError } from '../middleware/errorHandler'
import logger from '../utils/logger'

const router = Router()

// 获取分享码列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = {
      type: req.query.type as 'dye' | 'home' | 'camera' | 'combo' | 'diy' | undefined,
      role_id: req.query.roleId as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    }

    const result = await ShareCodeService.getShareCodes(filter)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取分享码统计
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ShareCodeService.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// 根据ID获取分享码
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareCode = await ShareCodeService.getShareCodeById(req.params.id)
    if (!shareCode) {
      throw AppError.notFound('Share code not found')
    }

    // 解析metadata
    const data = {
      ...shareCode,
      metadata: ShareCodeService.parseMetadata(shareCode),
    }

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// 根据code获取分享码
router.get('/code/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareCode = await ShareCodeService.getShareCodeByCode(req.params.code)
    if (!shareCode) {
      throw AppError.notFound('Share code not found')
    }

    const data = {
      ...shareCode,
      metadata: ShareCodeService.parseMetadata(shareCode),
    }

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// 创建分享码
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, code, name, description, metadata, imageId, roleId } = req.body

    if (!type || !code) {
      throw AppError.badRequest('Type and code are required')
    }

    const shareCode = await ShareCodeService.createShareCode({
      type,
      code,
      name,
      description,
      metadata,
      imageId,
      roleId,
    })

    res.status(201).json({ success: true, data: shareCode })
  } catch (error) {
    next(error)
  }
})

// 更新分享码
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, metadata, imageId } = req.body

    const shareCode = await ShareCodeService.updateShareCode(req.params.id, {
      name,
      description,
      metadata,
      imageId,
    })

    if (!shareCode) {
      throw AppError.notFound('Share code not found')
    }

    res.json({ success: true, data: shareCode })
  } catch (error) {
    next(error)
  }
})

// 删除分享码
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ShareCodeService.deleteShareCode(req.params.id)
    if (!result) {
      throw AppError.notFound('Share code not found')
    }
    res.json({ success: true, message: 'Share code deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// 批量删除分享码
router.post('/batch-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids)) {
      throw AppError.badRequest('IDs array is required')
    }

    const result = await ShareCodeService.batchDeleteShareCodes(ids)
    res.json({ success: true, data: { deletedCount: result } })
  } catch (error) {
    next(error)
  }
})

// 导入分享码
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shareCodes } = req.body

    if (!shareCodes || !Array.isArray(shareCodes)) {
      throw AppError.badRequest('Share codes array is required')
    }

    const result = await ShareCodeService.importShareCodes(shareCodes)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 导出分享码
router.get('/export/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = {
      type: req.query.type as 'dye' | 'home' | 'camera' | 'combo' | 'diy' | undefined,
      role_id: req.query.roleId as string,
    }

    const shareCodes = await ShareCodeService.exportShareCodes(filter)
    res.json({ success: true, data: shareCodes })
  } catch (error) {
    next(error)
  }
})

export default router
