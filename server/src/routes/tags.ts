import { Router, Request, Response, NextFunction } from 'express'
import TagModel from '../models/Tag'
import { AppError } from '../middleware/errorHandler'
import logger from '../utils/logger'

const router = Router()

// 获取所有标签
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as 'ai' | 'user' | 'system' | 'scene' | 'clothing' | 'action' | undefined
    const tags = TagModel.findAll(type)
    res.json({ success: true, data: tags })
  } catch (error) {
    next(error)
  }
})

// 获取标签统计
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = TagModel.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// 获取热门标签
router.get('/popular', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const tags = TagModel.getPopular(limit)
    res.json({ success: true, data: tags })
  } catch (error) {
    next(error)
  }
})

// 根据ID获取标签
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = TagModel.findById(req.params.id)
    if (!tag) {
      throw AppError.notFound('Tag not found')
    }
    res.json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
})

// 创建标签
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nameZh, nameEn, type, category, color, icon } = req.body

    if (!nameZh || !nameEn || !type) {
      throw AppError.badRequest('nameZh, nameEn, and type are required')
    }

    const tag = TagModel.create({
      nameZh,
      nameEn,
      type,
      category,
      color,
      icon,
    })

    res.status(201).json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
})

// 更新标签
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nameZh, nameEn, type, category, color, icon } = req.body

    const tag = TagModel.update(req.params.id, {
      nameZh,
      nameEn,
      type,
      category,
      color,
      icon,
    })

    if (!tag) {
      throw AppError.notFound('Tag not found')
    }

    res.json({ success: true, data: tag })
  } catch (error) {
    next(error)
  }
})

// 删除标签
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = TagModel.delete(req.params.id)
    if (!result) {
      throw AppError.notFound('Tag not found')
    }
    res.json({ success: true, message: 'Tag deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
