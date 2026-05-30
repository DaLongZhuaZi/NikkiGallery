import { Router, Request, Response } from 'express'
import transferService from '../services/TransferService'
import logger from '../utils/logger'

const router = Router()

/**
 * 获取服务器状态和本机IP
 * GET /api/transfer/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 确保服务器已启动
    const { port, addresses } = await transferService.startServer()

    res.json({
      success: true,
      data: {
        port,
        addresses,
        isRunning: true,
      },
    })
  } catch (error) {
    logger.error('Failed to get transfer status:', error)
    res.status(500).json({ error: 'Failed to get transfer status' })
  }
})

/**
 * 创建下载任务
 * POST /api/transfer/download
 * Body: { filePaths: string[] }
 */
router.post('/download', async (req: Request, res: Response) => {
  try {
    const { filePaths } = req.body

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'filePaths array is required' })
    }

    // 确保服务器已启动
    await transferService.startServer()

    // 创建下载任务
    const task = transferService.createDownloadTask(filePaths)

    // 生成链接
    const host = req.hostname || 'localhost'
    const links = transferService.generateDownloadLinks(task, host)
    const infoLink = transferService.generateInfoLink(task, host)

    res.json({
      success: true,
      data: {
        taskId: task.id,
        token: task.token,
        direction: 'download',
        files: task.files.map((f, i) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          downloadUrl: links[i],
        })),
        infoUrl: infoLink,
        expiresAt: task.expiresAt,
      },
    })
  } catch (error) {
    logger.error('Failed to create download task:', error)
    res.status(500).json({ error: 'Failed to create download task' })
  }
})

/**
 * 创建上传任务
 * POST /api/transfer/upload
 * Body: { fileCount?: number }
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { fileCount = 1 } = req.body

    // 确保服务器已启动
    await transferService.startServer()

    // 创建上传任务
    const task = transferService.createUploadTask(fileCount)

    // 生成链接
    const host = req.hostname || 'localhost'
    const uploadUrl = transferService.generateUploadLink(task, host)
    const infoLink = transferService.generateInfoLink(task, host)

    res.json({
      success: true,
      data: {
        taskId: task.id,
        token: task.token,
        direction: 'upload',
        uploadUrl,
        infoUrl: infoLink,
        expiresAt: task.expiresAt,
      },
    })
  } catch (error) {
    logger.error('Failed to create upload task:', error)
    res.status(500).json({ error: 'Failed to create upload task' })
  }
})

/**
 * 获取任务信息
 * GET /api/transfer/task/:taskId
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const task = transferService.getTask(taskId)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        direction: task.direction,
        status: task.status,
        files: task.files.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          transferredBytes: f.transferredBytes,
          status: f.status,
        })),
        totalBytes: task.totalBytes,
        transferredBytes: task.transferredBytes,
        createdAt: task.createdAt,
        expiresAt: task.expiresAt,
        completedAt: task.completedAt,
      },
    })
  } catch (error) {
    logger.error('Failed to get task info:', error)
    res.status(500).json({ error: 'Failed to get task info' })
  }
})

/**
 * 取消任务
 * POST /api/transfer/task/:taskId/cancel
 */
router.post('/task/:taskId/cancel', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const success = transferService.cancelTask(taskId)

    if (!success) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to cancel task:', error)
    res.status(500).json({ error: 'Failed to cancel task' })
  }
})

/**
 * 获取传输历史
 * GET /api/transfer/history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const tasks = transferService.getAllTasks()

    res.json({
      success: true,
      data: tasks.map((task) => ({
        id: task.id,
        direction: task.direction,
        status: task.status,
        fileCount: task.files.length,
        totalBytes: task.totalBytes,
        transferredBytes: task.transferredBytes,
        createdAt: task.createdAt,
        expiresAt: task.expiresAt,
        completedAt: task.completedAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to get transfer history:', error)
    res.status(500).json({ error: 'Failed to get transfer history' })
  }
})

/**
 * 删除任务
 * DELETE /api/transfer/task/:taskId
 */
router.delete('/task/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const success = transferService.deleteTask(taskId)

    if (!success) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete task:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

/**
 * 清理过期任务
 * POST /api/transfer/cleanup
 */
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const count = transferService.cleanupExpiredTasks()

    res.json({
      success: true,
      data: { cleaned: count },
    })
  } catch (error) {
    logger.error('Failed to cleanup tasks:', error)
    res.status(500).json({ error: 'Failed to cleanup tasks' })
  }
})

export default router
