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

// 衣柜封面配置文件路径
const WARDROBE_COVERS_PATH = path.join(path.dirname(config.database.path), 'wardrobe-covers.json')

function readWardrobeCovers(): Record<string, string> {
  try {
    if (fs.existsSync(WARDROBE_COVERS_PATH)) {
      const data = fs.readFileSync(WARDROBE_COVERS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    logger.warn('Failed to read wardrobe covers, using empty config')
  }
  return {}
}

function writeWardrobeCovers(covers: Record<string, string>): void {
  try {
    fs.writeFileSync(WARDROBE_COVERS_PATH, JSON.stringify(covers, null, 2), 'utf-8')
  } catch (err) {
    logger.error('Failed to write wardrobe covers:', err)
  }
}

// 生成 ETag 并处理条件请求 (304 Not Modified)
function setCacheHeadersAndCheck304(req: Request, res: Response, filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath)
    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`
    const lastModified = stat.mtime.toUTCString()

    res.setHeader('ETag', etag)
    res.setHeader('Last-Modified', lastModified)

    // 检查条件请求
    const ifNoneMatch = req.headers['if-none-match']
    const ifModifiedSince = req.headers['if-modified-since']

    if (ifNoneMatch === etag || (ifModifiedSince && new Date(ifModifiedSince).getTime() >= stat.mtimeMs)) {
      res.status(304).end()
      return true // 已发送 304
    }
  } catch { /* stat 失败时跳过缓存检查 */ }
  return false
}

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
      has_coords: req.query.hasCoords === 'true' ? true : req.query.hasCoords === 'false' ? false : undefined,
      clothes_id: req.query.clothesId ? parseInt(req.query.clothesId as string) : undefined,
    }

    const result = await ImageService.getImages(filter)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取衣柜所有服饰ID
router.get('/wardrobe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ImageModel = (await import('../models/Image')).ImageModel
    const wardrobe = ImageModel.getWardrobe()
    res.json({ success: true, data: wardrobe })
  } catch (error) {
    next(error)
  }
})

// 获取衣柜详情（带封面图片ID和图片数量）
router.get('/wardrobe/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ImageModel } = await import('../models/Image')
    const wardrobeItems = ImageModel.getWardrobeWithCovers()

    // 读取自定义封面配置
    const customCovers = readWardrobeCovers()

    // 合并自定义封面
    const result = wardrobeItems.map(item => ({
      ...item,
      customCoverImageId: customCovers[String(item.clothesId)] || null,
      // 最终使用的封面：自定义 > 自动
      coverImageId: customCovers[String(item.clothesId)] || item.coverImageId,
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 设置服饰自定义封面
router.put('/wardrobe/covers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clothesId, imageId } = req.body
    if (clothesId === undefined || !imageId) {
      return res.status(400).json({ success: false, error: '缺少 clothesId 或 imageId' })
    }

    const covers = readWardrobeCovers()
    covers[String(clothesId)] = imageId
    writeWardrobeCovers(covers)

    res.json({ success: true, data: { clothesId, imageId } })
  } catch (error) {
    next(error)
  }
})

// 删除服饰自定义封面（恢复自动封面）
router.delete('/wardrobe/covers/:clothesId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clothesId } = req.params
    const covers = readWardrobeCovers()
    delete covers[clothesId]
    writeWardrobeCovers(covers)

    res.json({ success: true })
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

// 批量获取缩略图 URL 映射
router.post('/thumbnails/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds } = req.body
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'imageIds must be a non-empty array' })
    }

    const result: Record<string, string> = {}
    for (const id of imageIds) {
      // 直接构造缩略图 URL 路径，让浏览器利用 HTTP 缓存
      result[id] = `/api/images/${id}/thumbnail?size=small`
    }

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取缩略图文件（支持 small/medium/large 多尺寸）
router.get('/:id/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }

    const size = (['small', 'medium', 'large'].includes(req.query.size as string) ? req.query.size : 'medium') as 'small' | 'medium' | 'large'

    // 尝试获取指定尺寸的缩略图路径
    let thumbnailPath = ImageService.getThumbnailPath(req.params.id, size)

    // 如果不存在，自动生成
    if (!thumbnailPath) {
      const generatedPath = await ImageService.generateThumbnail(req.params.id, size)
      if (generatedPath) {
        thumbnailPath = generatedPath
      } else if (fs.existsSync(image.path)) {
        // 生成失败，返回原始图片
        res.setHeader('Content-Type', image.mimeType || 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        return res.sendFile(path.resolve(image.path))
      } else {
        throw AppError.notFound('Thumbnail generation failed and original image not found')
      }
    }

    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    if (setCacheHeadersAndCheck304(req, res, thumbnailPath)) return
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
    if (setCacheHeadersAndCheck304(req, res, image.path)) return
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
// 下载图片
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await ImageService.getImageById(req.params.id)
    if (!image) {
      throw AppError.notFound('Image not found')
    }

    const imagePath = image.path
    if (!fs.existsSync(imagePath)) {
      throw AppError.notFound('Original image file not found')
    }

    res.download(imagePath, image.filename)
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
      case 'move':
        if (!targetAlbumId) {
          throw AppError.badRequest('Target album ID is required for move action')
        }
        const BatchOperationService = (await import('../services/BatchOperationService')).default
        result = await BatchOperationService.getInstance().batchMoveToAlbum(imageIds, { targetAlbumId })
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