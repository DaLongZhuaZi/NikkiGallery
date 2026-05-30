import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { ImageService } from '../services/ImageService'
import { MetadataService } from '../services/MetadataService'
import { AppError } from '../middleware/errorHandler'
import config from '../config'
import logger from '../utils/logger'

const router = Router()

// 获取图片列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 映射 camelCase 到 snake_case
    const sortByMap: Record<string, string> = {
      'createdAt': 'created_at',
      'filename': 'filename',
      'fileSize': 'file_size'
    }

    const sort_by = (sortByMap[req.query.sortBy as string] || 'created_at') as 'created_at' | 'filename' | 'file_size'

    const filter = {
      album_id: req.query.albumId as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      favorite: req.query.favorite === 'true' ? true : req.query.favorite === 'false' ? false : undefined,
      ai_processed: req.query.aiProcessed === 'true' ? true : req.query.aiProcessed === 'false' ? false : undefined,
      search: req.query.search as string,
      sort_by,
      sort_order: req.query.sortOrder as 'asc' | 'desc',
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    }

    const result = await ImageService.getImages(filter)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取图片统计
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ImageService.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// 获取未处理的图片
router.get('/unprocessed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
    const images = await ImageService.getUnprocessedImages(limit)
    res.json({ success: true, data: images })
  } catch (error) {
    next(error)
  }
})

// 根据ID获取图片
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }
    res.json({ success: true, data: image })
  } catch (error) {
    next(error)
  }
})

// 获取图片详情（包含标签和元数据）
router.get('/:id/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await ImageService.getImageInfo(req.params.id)
    res.json({ success: true, data: info })
  } catch (error) {
    next(error)
  }
})

// 获取缩略图文件
router.get('/:id/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }

    // 如果缩略图不存在，自动生成
    if (!image.thumbnailPath || !fs.existsSync(image.thumbnailPath)) {
      const generatedPath = await ImageService.generateThumbnail(req.params.id)
      if (!generatedPath) {
        // 如果生成失败，返回原始图片
        if (fs.existsSync(image.path)) {
          res.setHeader('Content-Type', image.mimeType || 'image/jpeg')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          return res.sendFile(path.resolve(image.path))
        }
        throw AppError.notFound('Thumbnail generation failed and original image not found')
      }
    }

    // 重新获取图片信息以获取最新的 thumbnailPath
    const updatedImage = await ImageService.getImageById(req.params.id)
    const thumbnailPath = updatedImage?.thumbnailPath

    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      throw AppError.notFound('Thumbnail file not found')
    }

    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.sendFile(path.resolve(thumbnailPath))
  } catch (error) {
    next(error)
  }
})

// 获取原始图片文件
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }

    if (!fs.existsSync(image.path)) {
      throw AppError.notFound('Image file not found on disk')
    }

    res.setHeader('Content-Type', image.mimeType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(image.filename)}"`)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.sendFile(path.resolve(image.path))
  } catch (error) {
    next(error)
  }
})

// 更新图片
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, favorite } = req.body

    const image = await ImageService.updateImage(req.params.id, {
      description,
      favorite: favorite ? 1 : 0,
    })

    if (!image) {
      throw AppError.notFound('Image not found')
    }

    res.json({ success: true, data: image })
  } catch (error) {
    next(error)
  }
})

// 切换收藏状态
router.put('/:id/favorite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }

    const updatedImage = await ImageService.updateImage(req.params.id, {
      favorite: image.favorite ? 0 : 1,
    })

    res.json({ success: true, data: updatedImage })
  } catch (error) {
    next(error)
  }
})

// 删除图片
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleteFile = req.query.deleteFile === 'true'
    const result = await ImageService.deleteImage(req.params.id, deleteFile)

    if (!result) {
      throw AppError.notFound('Image not found')
    }

    res.json({ success: true, message: 'Image deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// 批量操作
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, imageIds, targetAlbumId, tagIds, favorite } = req.body

    if (!action || !imageIds || !Array.isArray(imageIds)) {
      throw AppError.badRequest('Action and imageIds are required')
    }

    let result: any

    switch (action) {
      case 'delete':
        result = await ImageService.batchDeleteImages(imageIds, req.body.deleteFiles)
        break
      case 'favorite':
        result = await ImageService.batchUpdateFavorite(imageIds, favorite)
        break
      case 'tag':
        if (!tagIds || !Array.isArray(tagIds)) {
          throw AppError.badRequest('Tag IDs are required for tag action')
        }
        await ImageService.batchAddTag(imageIds, tagIds)
        result = { success: true }
        break
      default:
        throw AppError.badRequest('Invalid action')
    }

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 生成缩略图
router.post('/:id/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thumbnailPath = await ImageService.generateThumbnail(req.params.id)
    res.json({ success: true, data: { thumbnailPath } })
  } catch (error) {
    next(error)
  }
})

// 批量生成缩略图
router.post('/thumbnails', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds } = req.body

    if (!imageIds || !Array.isArray(imageIds)) {
      throw AppError.badRequest('Image IDs are required')
    }

    const result = await ImageService.batchGenerateThumbnails(imageIds)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 添加标签
router.post('/:id/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId, confidence } = req.body

    if (!tagId) {
      throw AppError.badRequest('Tag ID is required')
    }

    await ImageService.addTag(req.params.id, tagId, 'user', confidence)
    res.json({ success: true, message: 'Tag added successfully' })
  } catch (error) {
    next(error)
  }
})

// 移除标签
router.delete('/:id/tags/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ImageService.removeTag(req.params.id, req.params.tagId)
    res.json({ success: true, message: 'Tag removed successfully' })
  } catch (error) {
    next(error)
  }
})

// 获取图片标签
router.get('/:id/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await ImageService.getImageTags(req.params.id)
    res.json({ success: true, data: tags })
  } catch (error) {
    next(error)
  }
})

// ============ 回收站相关路由 ============

// 获取回收站图片列表
router.get('/trash/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sortByMap: Record<string, string> = {
      'createdAt': 'created_at',
      'filename': 'filename',
      'fileSize': 'file_size',
      'deletedAt': 'deleted_at'
    }

    const sort_by = (sortByMap[req.query.sortBy as string] || 'deleted_at') as any

    const filter = {
      deleted: true,
      search: req.query.search as string,
      sort_by,
      sort_order: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    }

    const result = await ImageService.getImages(filter)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取回收站统计
router.get('/trash/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ImageService.getTrashStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// 恢复单张图片
router.post('/trash/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ImageService.restoreImage(req.params.id)
    if (!result) {
      throw AppError.notFound('Image not found in trash')
    }
    res.json({ success: true, message: 'Image restored successfully' })
  } catch (error) {
    next(error)
  }
})

// 批量恢复图片
router.post('/trash/batch-restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds } = req.body
    if (!imageIds || !Array.isArray(imageIds)) {
      throw AppError.badRequest('Image IDs are required')
    }
    const result = await ImageService.batchRestoreImages(imageIds)
    res.json({ success: true, data: { restored: result } })
  } catch (error) {
    next(error)
  }
})

// 永久删除单张图片
router.delete('/trash/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleteFile = req.query.deleteFile === 'true'
    const result = await ImageService.permanentDeleteImage(req.params.id, deleteFile)
    if (!result) {
      throw AppError.notFound('Image not found in trash')
    }
    res.json({ success: true, message: 'Image permanently deleted' })
  } catch (error) {
    next(error)
  }
})

// 批量永久删除图片
router.delete('/trash/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds, deleteFiles } = req.body
    if (!imageIds || !Array.isArray(imageIds)) {
      throw AppError.badRequest('Image IDs are required')
    }
    const result = await ImageService.batchPermanentDeleteImages(imageIds, deleteFiles)
    res.json({ success: true, data: { deleted: result } })
  } catch (error) {
    next(error)
  }
})

// 清空回收站
router.delete('/trash/empty', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleteFiles = req.query.deleteFiles === 'true'
    const result = await ImageService.emptyTrash(deleteFiles)
    res.json({ success: true, data: { deleted: result } })
  } catch (error) {
    next(error)
  }
})

// ============ 元数据相关路由 ============

// 获取图片元数据
router.get('/:id/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metadata = await MetadataService.getImageMetadata(req.params.id)
    res.json({ success: true, data: metadata })
  } catch (error) {
    next(error)
  }
})

// 提取单张图片元数据
router.post('/:id/extract-metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await MetadataService.extractAndSaveMetadata(req.params.id)
    if (!result) {
      throw AppError.badRequest('Failed to extract metadata')
    }
    res.json({ success: true, message: 'Metadata extracted successfully' })
  } catch (error) {
    next(error)
  }
})

// 批量提取元数据
router.post('/batch-extract-metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds } = req.body
    if (!imageIds || !Array.isArray(imageIds)) {
      throw AppError.badRequest('Image IDs are required')
    }
    const result = await MetadataService.batchExtractMetadata(imageIds)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

export default router