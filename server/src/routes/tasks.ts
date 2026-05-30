import { Router, Request, Response } from 'express'
import taskService, { TaskType } from '../services/TaskService'
import logger from '../utils/logger'

const router = Router()

// SSE 连接管理
const sseClients: Set<Response> = new Set()

// 广播 SSE 事件
function broadcastSSE(event: string, data: any): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients) {
    try {
      client.write(message)
    } catch (error) {
      sseClients.delete(client)
    }
  }
}

// 监听任务事件并广播
taskService.on('task:created', (task) => broadcastSSE('task:created', task))
taskService.on('task:started', (task) => broadcastSSE('task:started', task))
taskService.on('task:progress', (task) => broadcastSSE('task:progress', task))
taskService.on('task:completed', (task) => broadcastSSE('task:completed', task))
taskService.on('task:failed', (task) => broadcastSSE('task:failed', task))
taskService.on('task:cancelled', (task) => broadcastSSE('task:cancelled', task))

/**
 * GET /api/tasks/sse
 * SSE 端点 - 实时任务更新
 */
router.get('/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  // 移除可能导致缓冲的头
  res.removeHeader('Content-Encoding')
  res.removeHeader('Content-Length')
  res.removeHeader('Transfer-Encoding')
  // 立即发送响应头，建立 SSE 连接
  res.flushHeaders()

  // 发送初始连接确认
  res.write('event: connected\ndata: {"status":"connected"}\n\n')

  // 发送当前任务状态
  const activeTasks = taskService.getActiveTasks()
  res.write(`event: init\ndata: ${JSON.stringify(activeTasks)}\n\n`)

  sseClients.add(res)

  // 心跳保活
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch (error) {
      clearInterval(heartbeat)
      sseClients.delete(res)
    }
  }, 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    sseClients.delete(res)
  })
})

/**
 * GET /api/tasks
 * 获取所有任务
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const tasks = taskService.getAllTasks()
    res.json({ success: true, data: tasks })
  } catch (error: any) {
    logger.error('Failed to get tasks:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/tasks/active
 * 获取活跃任务
 */
router.get('/active', (req: Request, res: Response) => {
  try {
    const tasks = taskService.getActiveTasks()
    res.json({ success: true, data: tasks })
  } catch (error: any) {
    logger.error('Failed to get active tasks:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/tasks/stats
 * 获取任务统计
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = taskService.getStats()
    res.json({ success: true, data: stats })
  } catch (error: any) {
    logger.error('Failed to get task stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/tasks/:id
 * 获取单个任务
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const task = taskService.getTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }
    res.json({ success: true, data: task })
  } catch (error: any) {
    logger.error('Failed to get task:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/tasks
 * 创建新任务
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, type, totalItems, metadata } = req.body

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'name and type are required' })
    }

    // 验证任务类型
    const validTypes: TaskType[] = [
      'scan_albums', 'scan_images', 'extract_metadata', 'generate_thumbnail',
      'ai_process', 'batch_operation', 'import_images', 'export_images',
      'dedup', 'decrypt', 'custom'
    ]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid task type. Valid types: ${validTypes.join(', ')}` })
    }

    const task = taskService.createTask({ name, type, totalItems, metadata })
    res.status(201).json({ success: true, data: task })
  } catch (error: any) {
    logger.error('Failed to create task:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/tasks/:id/cancel
 * 取消任务
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const success = taskService.cancelTask(req.params.id)
    if (!success) {
      return res.status(400).json({ success: false, error: 'Cannot cancel task' })
    }
    res.json({ success: true, message: 'Task cancelled' })
  } catch (error: any) {
    logger.error('Failed to cancel task:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/tasks/clear-completed
 * 清除已完成的任务
 */
router.post('/clear-completed', (req: Request, res: Response) => {
  try {
    const count = taskService.clearCompleted()
    res.json({ success: true, data: { cleared: count } })
  } catch (error: any) {
    logger.error('Failed to clear tasks:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/tasks/max-concurrent
 * 设置最大并发任务数
 */
router.put('/max-concurrent', (req: Request, res: Response) => {
  try {
    const { max } = req.body
    if (typeof max !== 'number' || max < 1) {
      return res.status(400).json({ success: false, error: 'max must be a positive number' })
    }
    taskService.setMaxConcurrent(max)
    res.json({ success: true, data: { maxConcurrent: max } })
  } catch (error: any) {
    logger.error('Failed to set max concurrent:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
