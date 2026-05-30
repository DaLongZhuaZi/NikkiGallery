import { Router, Request, Response, NextFunction } from 'express'
import { AlbumService } from '../services/AlbumService'
import { AppError } from '../middleware/errorHandler'
import taskService from '../services/TaskService'
import logger from '../utils/logger'

const router = Router()

// 获取所有相册
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albums = await AlbumService.getAllAlbums()
    res.json({ success: true, data: albums })
  } catch (error) {
    next(error)
  }
})

// 获取相册统计
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await AlbumService.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    next(error)
  }
})

// 根据ID获取相册
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await AlbumService.getAlbumById(req.params.id)
    if (!album) {
      throw AppError.notFound('Album not found')
    }
    res.json({ success: true, data: album })
  } catch (error) {
    next(error)
  }
})

// 创建相册
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, path, accountId, type, description } = req.body

    if (!name || !path) {
      throw AppError.badRequest('Name and path are required')
    }

    const album = await AlbumService.createAlbum({
      name,
      path,
      accountId,
      type,
      description,
    })

    res.status(201).json({ success: true, data: album })
  } catch (error) {
    next(error)
  }
})

// 更新相册
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, coverImageId } = req.body

    const album = await AlbumService.updateAlbum(req.params.id, {
      name,
      description,
      coverImageId,
    })

    if (!album) {
      throw AppError.notFound('Album not found')
    }

    res.json({ success: true, data: album })
  } catch (error) {
    next(error)
  }
})

// 删除相册
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleteFiles = req.query.deleteFiles === 'true'
    const result = await AlbumService.deleteAlbum(req.params.id, deleteFiles)

    if (!result) {
      throw AppError.notFound('Album not found')
    }

    res.json({ success: true, message: 'Album deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// 扫描所有已配置的相册（同步返回相册列表 + 后台任务追踪图片扫描进度）
router.post('/scan-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 先同步扫描相册目录（快速操作）
    const albums = await AlbumService.scanConfiguredFolders()

    // 2. 创建后台任务追踪图片扫描进度（较慢操作）
    const task = taskService.createTaskWithExecutor(
      {
        name: '扫描所有配置文件夹',
        type: 'scan_albums',
        totalItems: albums.length,
        metadata: { action: 'scan-all' },
      },
      async (task, onProgress) => {
        let totalImages = 0
        for (let i = 0; i < albums.length; i++) {
          const album = albums[i]
          const progress = Math.round(((i + 1) / albums.length) * 100)
          onProgress(progress, `扫描相册图片: ${album.name}`, i + 1)
          try {
            const count = await AlbumService.scanAlbumImages(album.id, album.path)
            totalImages += count
          } catch (err) {
            logger.warn(`Failed to scan album ${album.name}:`, err)
          }
        }
        return { albumCount: albums.length, newImages: totalImages }
      }
    )

    // 3. 立即返回相册列表（前端可以先显示相册，图片在后台逐步加载）
    res.json({
      success: true,
      data: albums,
      taskId: task.id,
    })
  } catch (error) {
    next(error)
  }
})

// 扫描游戏相册（同步返回相册列表 + 后台任务追踪进度）
router.post('/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gamePath } = req.body

    if (!gamePath) {
      throw AppError.badRequest('Game path is required')
    }

    const albums = await AlbumService.scanGameAlbums(gamePath)

    const task = taskService.createTaskWithExecutor(
      {
        name: '扫描游戏相册',
        type: 'scan_albums',
        totalItems: albums.length,
        metadata: { action: 'scan', gamePath },
      },
      async (task, onProgress) => {
        let totalImages = 0
        for (let i = 0; i < albums.length; i++) {
          const album = albums[i]
          const progress = Math.round(((i + 1) / albums.length) * 100)
          onProgress(progress, `扫描相册图片: ${album.name}`, i + 1)
          try {
            const count = await AlbumService.scanAlbumImages(album.id, album.path)
            totalImages += count
          } catch (err) {
            logger.warn(`Failed to scan album ${album.name}:`, err)
          }
        }
        return { albumCount: albums.length, newImages: totalImages }
      }
    )

    res.json({
      success: true,
      data: albums,
      taskId: task.id,
    })
  } catch (error) {
    next(error)
  }
})

// 扫描单个相册的图片（后台任务模式）
router.post('/:id/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const album = await AlbumService.getAlbumById(req.params.id)
    if (!album) {
      throw AppError.notFound('Album not found')
    }

    const task = taskService.createTaskWithExecutor(
      {
        name: `扫描相册: ${album.name}`,
        type: 'scan_images',
        totalItems: 1,
        metadata: { action: 'scan-images', albumId: album.id, albumPath: album.path },
      },
      async (task, onProgress) => {
        onProgress(0, `正在扫描相册: ${album.name}`)
        const count = await AlbumService.scanAlbumImages(album.id, album.path)
        onProgress(100, `扫描完成，新增 ${count} 张图片`)
        return { addedCount: count }
      }
    )

    res.json({
      success: true,
      data: { addedCount: 0, taskId: task.id },
    })
  } catch (error) {
    next(error)
  }
})

export default router