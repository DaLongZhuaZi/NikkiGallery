import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import logger from '../utils/logger'

// 任务状态枚举
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// 任务类型枚举
export type TaskType =
  | 'scan_albums'      // 扫描游戏相册
  | 'scan_images'      // 扫描图片
  | 'extract_metadata' // 提取元数据
  | 'generate_thumbnail' // 生成缩略图
  | 'ai_process'       // AI处理
  | 'batch_operation'  // 批量操作
  | 'import_images'    // 导入图片
  | 'export_images'    // 导出图片
  | 'dedup'            // 去重
  | 'decrypt'          // 解密
  | 'custom'           // 自定义任务

// 任务接口
export interface Task {
  id: string
  name: string
  type: TaskType
  status: TaskStatus
  progress: number        // 0-100
  currentStep: string     // 当前步骤描述
  totalItems: number      // 总项目数
  processedItems: number  // 已处理项目数
  failedItems: number     // 失败项目数
  result: any             // 任务结果
  error: string | null    // 错误信息
  createdAt: string       // 创建时间
  startedAt: string | null  // 开始时间
  completedAt: string | null // 完成时间
  metadata: Record<string, any> // 附加数据
}

// 创建任务参数
export interface CreateTaskParams {
  name: string
  type: TaskType
  totalItems?: number
  metadata?: Record<string, any>
}

// 任务进度回调
export type ProgressCallback = (progress: number, step: string, processed?: number, failed?: number) => void

// 任务执行函数类型
export type TaskExecutor = (task: Task, onProgress: ProgressCallback) => Promise<any>

class TaskService extends EventEmitter {
  private tasks: Map<string, Task> = new Map()
  private executors: Map<TaskType, TaskExecutor> = new Map()
  private taskExecutors: Map<string, TaskExecutor> = new Map()  // 按任务ID存储的执行器
  private maxConcurrent: number = 3
  private runningCount: number = 0
  private taskQueue: string[] = []

  constructor() {
    super()
    this.setMaxListeners(50)
  }

  // 注册任务执行器
  registerExecutor(type: TaskType, executor: TaskExecutor): void {
    this.executors.set(type, executor)
    logger.info(`Task executor registered: ${type}`)
  }

  // 注册按任务ID的执行器（避免并发任务互相覆盖）
  registerTaskExecutor(taskId: string, executor: TaskExecutor): void {
    this.taskExecutors.set(taskId, executor)
  }

  // 创建任务
  createTask(params: CreateTaskParams): Task {
    const task: Task = {
      id: uuidv4(),
      name: params.name,
      type: params.type,
      status: 'pending',
      progress: 0,
      currentStep: '等待中...',
      totalItems: params.totalItems || 0,
      processedItems: 0,
      failedItems: 0,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      metadata: params.metadata || {},
    }

    this.tasks.set(task.id, task)
    this.taskQueue.push(task.id)

    logger.info(`Task created: ${task.name} (${task.id})`)
    this.emit('task:created', task)

    // 尝试执行队列中的任务
    this.processQueue()

    return task
  }

  // 执行任务
  private async processQueue(): Promise<void> {
    if (this.runningCount >= this.maxConcurrent) {
      return
    }

    const taskId = this.taskQueue.shift()
    if (!taskId) {
      return
    }

    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'pending') {
      this.processQueue()
      return
    }

    // 优先使用按任务ID注册的执行器，其次使用按类型注册的
    const executor = this.taskExecutors.get(taskId) || this.executors.get(task.type)
    if (!executor) {
      task.status = 'failed'
      task.error = `No executor registered for task type: ${task.type}`
      task.completedAt = new Date().toISOString()
      this.emit('task:failed', task)
      this.processQueue()
      return
    }

    // 开始执行
    this.runningCount++
    task.status = 'running'
    task.startedAt = new Date().toISOString()
    task.currentStep = '执行中...'
    this.emit('task:started', task)

    const onProgress: ProgressCallback = (progress, step, processed, failed) => {
      task.progress = Math.min(100, Math.max(0, progress))
      task.currentStep = step
      if (processed !== undefined) task.processedItems = processed
      if (failed !== undefined) task.failedItems = failed
      this.emit('task:progress', task)
    }

    try {
      const result = await executor(task, onProgress)
      task.status = 'completed'
      task.progress = 100
      task.currentStep = '已完成'
      task.result = result
      task.completedAt = new Date().toISOString()
      logger.info(`Task completed: ${task.name} (${task.id})`)
      this.emit('task:completed', task)
    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message || 'Unknown error'
      task.completedAt = new Date().toISOString()
      logger.error(`Task failed: ${task.name} (${task.id}):`, error)
      this.emit('task:failed', task)
    } finally {
      // 清理按任务ID注册的执行器
      this.taskExecutors.delete(taskId)
      this.runningCount--
      this.processQueue()
    }
  }

  // 获取任务
  getTask(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  // 获取所有任务
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // 获取活跃任务（pending 或 running）
  getActiveTasks(): Task[] {
    return this.getAllTasks().filter(t => t.status === 'pending' || t.status === 'running')
  }

  // 取消任务
  cancelTask(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    if (task.status === 'pending') {
      task.status = 'cancelled'
      task.completedAt = new Date().toISOString()
      task.currentStep = '已取消'
      // 从队列中移除
      const idx = this.taskQueue.indexOf(id)
      if (idx !== -1) this.taskQueue.splice(idx, 1)
      this.emit('task:cancelled', task)
      return true
    }

    if (task.status === 'running') {
      task.status = 'cancelled'
      task.completedAt = new Date().toISOString()
      task.currentStep = '已取消'
      this.emit('task:cancelled', task)
      return true
    }

    return false
  }

  // 清除已完成的任务
  clearCompleted(): number {
    let count = 0
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        this.tasks.delete(id)
        count++
      }
    }
    return count
  }

  // 获取任务统计
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  } {
    const tasks = this.getAllTasks()
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    }
  }

  // 设置最大并发数
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max)
  }

  // 快捷方法：创建并执行任务
  async executeTask(
    name: string,
    type: TaskType,
    executor: TaskExecutor,
    totalItems?: number,
    metadata?: Record<string, any>
  ): Promise<Task> {
    // 临时注册执行器
    this.registerExecutor(type, executor)
    return this.createTask({ name, type, totalItems, metadata })
  }

  // 创建带独立执行器的任务（推荐用于并发场景，避免执行器互相覆盖）
  createTaskWithExecutor(
    params: CreateTaskParams,
    executor: TaskExecutor
  ): Task {
    // 先注册执行器，再创建任务，避免竞态条件
    // （createTask 内部会立即调用 processQueue，如果执行器还没注册会导致任务失败）
    const task = this.createTaskWithoutProcessing(params)
    this.registerTaskExecutor(task.id, executor)
    // 现在执行器已注册，触发队列处理
    this.processQueue()
    return task
  }

  // 创建任务但不立即触发 processQueue（供 createTaskWithExecutor 使用）
  private createTaskWithoutProcessing(params: CreateTaskParams): Task {
    const task: Task = {
      id: uuidv4(),
      name: params.name,
      type: params.type,
      status: 'pending',
      progress: 0,
      currentStep: '等待中...',
      totalItems: params.totalItems || 0,
      processedItems: 0,
      failedItems: 0,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      metadata: params.metadata || {},
    }

    this.tasks.set(task.id, task)
    this.taskQueue.push(task.id)

    logger.info(`Task created: ${task.name} (${task.id})`)
    this.emit('task:created', task)

    return task
  }
}

// 单例导出
export const taskService = new TaskService()
export default taskService
