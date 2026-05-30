import express, { Router, Request, Response } from 'express'
import { Server } from 'http'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import os from 'os'
import logger from '../utils/logger'

/** 传输任务状态 */
export type TransferStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled'

/** 传输方向 */
export type TransferDirection = 'upload' | 'download'

/** 传输任务 */
export interface TransferTask {
  id: string
  token: string
  direction: TransferDirection
  files: TransferFile[]
  status: TransferStatus
  createdAt: number
  expiresAt: number
  completedAt?: number
  totalBytes: number
  transferredBytes: number
}

/** 传输文件 */
export interface TransferFile {
  id: string
  name: string
  size: number
  type: string
  path?: string
  transferredBytes: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
}

/** 进度回调 */
export type ProgressCallback = (taskId: string, fileId: string, transferredBytes: number) => void

class TransferService {
  private tasks: Map<string, TransferTask> = new Map()
  private server: Server | null = null
  private port: number = 0
  private progressCallbacks: Map<string, ProgressCallback> = new Map()
  private historyDir: string

  constructor() {
    this.historyDir = path.join(process.cwd(), 'data', 'transfer-history')
    this.ensureHistoryDir()
    this.loadHistory()
  }

  /** 确保历史记录目录存在 */
  private ensureHistoryDir(): void {
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true })
    }
  }

  /** 加载历史记录 */
  private loadHistory(): void {
    try {
      const historyFile = path.join(this.historyDir, 'history.json')
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
        for (const task of data) {
          this.tasks.set(task.id, task)
        }
        logger.info(`Loaded ${this.tasks.size} transfer history records`)
      }
    } catch (error) {
      logger.error('Failed to load transfer history:', error)
    }
  }

  /** 保存历史记录 */
  private saveHistory(): void {
    try {
      const historyFile = path.join(this.historyDir, 'history.json')
      const tasks = Array.from(this.tasks.values())
      fs.writeFileSync(historyFile, JSON.stringify(tasks, null, 2))
    } catch (error) {
      logger.error('Failed to save transfer history:', error)
    }
  }

  /** 生成唯一ID */
  private generateId(): string {
    return crypto.randomBytes(8).toString('hex')
  }

  /** 生成传输令牌 */
  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /** 获取本机IP地址 */
  getLocalIpAddress(): string[] {
    const interfaces = os.networkInterfaces()
    const addresses: string[] = []

    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name]
      if (!nets) continue

      for (const net of nets) {
        // 跳过内部地址和非IPv4地址
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address)
        }
      }
    }

    return addresses
  }

  /** 获取服务器端口 */
  getPort(): number {
    return this.port
  }

  /** 启动传输服务器 */
  async startServer(): Promise<{ port: number; addresses: string[] }> {
    if (this.server) {
      return { port: this.port, addresses: this.getLocalIpAddress() }
    }

    const app = express()
    const router = Router()

    // 下载文件端点
    router.get('/download/:taskId/:fileId', this.handleDownload.bind(this))

    // 上传文件端点
    router.post('/upload/:taskId', this.handleUpload.bind(this))

    // 获取任务信息端点
    router.get('/info/:taskId', this.handleGetInfo.bind(this))

    app.use('/transfer', router)

    // 随机端口范围: 10000-60000
    this.port = 10000 + Math.floor(Math.random() * 50000)

    return new Promise((resolve, reject) => {
      this.server = app.listen(this.port, '0.0.0.0', () => {
        logger.info(`Transfer server started on port ${this.port}`)
        resolve({ port: this.port, addresses: this.getLocalIpAddress() })
      })

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          // 端口被占用，重试
          this.port = 10000 + Math.floor(Math.random() * 50000)
          this.server?.close()
          this.server = null
          this.startServer().then(resolve).catch(reject)
        } else {
          reject(error)
        }
      })
    })
  }

  /** 停止传输服务器 */
  async stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null
          this.port = 0
          logger.info('Transfer server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /** 创建下载任务 */
  createDownloadTask(filePaths: string[]): TransferTask {
    const taskId = this.generateId()
    const token = this.generateToken()

    const files: TransferFile[] = filePaths.map((filePath) => {
      const stat = fs.statSync(filePath)
      return {
        id: this.generateId(),
        name: path.basename(filePath),
        size: stat.size,
        type: this.getMimeType(filePath),
        path: filePath,
        transferredBytes: 0,
        status: 'pending',
      }
    })

    const task: TransferTask = {
      id: taskId,
      token,
      direction: 'download',
      files,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
      totalBytes: files.reduce((sum, f) => sum + f.size, 0),
      transferredBytes: 0,
    }

    this.tasks.set(taskId, task)
    this.saveHistory()

    return task
  }

  /** 创建上传任务 */
  createUploadTask(fileCount: number): TransferTask {
    const taskId = this.generateId()
    const token = this.generateToken()

    const task: TransferTask = {
      id: taskId,
      token,
      direction: 'upload',
      files: [],
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
      totalBytes: 0,
      transferredBytes: 0,
    }

    this.tasks.set(taskId, task)
    this.saveHistory()

    return task
  }

  /** 获取任务 */
  getTask(taskId: string): TransferTask | undefined {
    return this.tasks.get(taskId)
  }

  /** 获取所有任务 */
  getAllTasks(): TransferTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /** 取消任务 */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    task.status = 'cancelled'
    this.saveHistory()
    return true
  }

  /** 清理过期任务 */
  cleanupExpiredTasks(): number {
    const now = Date.now()
    let count = 0

    for (const [taskId, task] of this.tasks) {
      if (task.status === 'active' && task.expiresAt < now) {
        task.status = 'expired'
        count++
      }
    }

    if (count > 0) {
      this.saveHistory()
    }

    return count
  }

  /** 删除任务 */
  deleteTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId)
    if (deleted) {
      this.saveHistory()
    }
    return deleted
  }

  /** 注册进度回调 */
  registerProgressCallback(taskId: string, callback: ProgressCallback): void {
    this.progressCallbacks.set(taskId, callback)
  }

  /** 移除进度回调 */
  removeProgressCallback(taskId: string): void {
    this.progressCallbacks.delete(taskId)
  }

  /** 获取MIME类型 */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.txt': 'text/plain',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /** 处理下载请求 */
  private async handleDownload(req: Request, res: Response): Promise<void> {
    const { taskId, fileId } = req.params
    const task = this.tasks.get(taskId)

    if (!task || task.direction !== 'download') {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    if (task.status !== 'active') {
      res.status(410).json({ error: 'Task is no longer active' })
      return
    }

    const file = task.files.find((f) => f.id === fileId)
    if (!file || !file.path) {
      res.status(404).json({ error: 'File not found' })
      return
    }

    if (!fs.existsSync(file.path)) {
      res.status(404).json({ error: 'File not found on disk' })
      return
    }

    // 设置响应头
    res.setHeader('Content-Type', file.type)
    res.setHeader('Content-Length', file.size)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`)

    // 创建读取流
    const stream = fs.createReadStream(file.path)
    let transferredBytes = 0

    stream.on('data', (chunk: string | Buffer) => {
      const chunkLength = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
      transferredBytes += chunkLength
      task.transferredBytes += chunkLength
      file.transferredBytes = transferredBytes

      // 通知进度
      const callback = this.progressCallbacks.get(taskId)
      if (callback) {
        callback(taskId, fileId, transferredBytes)
      }
    })

    stream.on('end', () => {
      file.status = 'completed'
      this.saveHistory()
    })

    stream.on('error', (error) => {
      logger.error(`Download error for file ${fileId}:`, error)
      file.status = 'failed'
      res.status(500).end()
    })

    stream.pipe(res)
  }

  /** 处理上传请求 */
  private async handleUpload(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params
    const task = this.tasks.get(taskId)

    if (!task || task.direction !== 'upload') {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    if (task.status !== 'active') {
      res.status(410).json({ error: 'Task is no longer active' })
      return
    }

    // 简单的文件上传处理（使用原始body）
    const chunks: Buffer[] = []
    let totalBytes = 0

    req.on('data', (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      chunks.push(buffer)
      totalBytes += buffer.length
    })

    req.on('end', () => {
      const buffer = Buffer.concat(chunks)
      const fileName = req.headers['x-file-name'] as string || `upload_${Date.now()}`
      const uploadDir = path.join(process.cwd(), 'data', 'uploads')

      // 确保上传目录存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filePath = path.join(uploadDir, `${taskId}_${fileName}`)
      fs.writeFileSync(filePath, buffer)

      const file: TransferFile = {
        id: this.generateId(),
        name: fileName,
        size: totalBytes,
        type: req.headers['content-type'] as string || 'application/octet-stream',
        path: filePath,
        transferredBytes: totalBytes,
        status: 'completed',
      }

      task.files.push(file)
      task.totalBytes += totalBytes
      task.transferredBytes += totalBytes

      this.saveHistory()

      res.json({
        success: true,
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
        },
      })
    })

    req.on('error', (error) => {
      logger.error(`Upload error for task ${taskId}:`, error)
      res.status(500).json({ error: 'Upload failed' })
    })
  }

  /** 处理获取任务信息请求 */
  private handleGetInfo(req: Request, res: Response): void {
    const { taskId } = req.params
    const task = this.tasks.get(taskId)

    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    res.json({
      id: task.id,
      direction: task.direction,
      status: task.status,
      files: task.files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        status: f.status,
      })),
      totalBytes: task.totalBytes,
      transferredBytes: task.transferredBytes,
      createdAt: task.createdAt,
      expiresAt: task.expiresAt,
    })
  }

  /** 生成下载链接 */
  generateDownloadLinks(task: TransferTask, host: string): string[] {
    return task.files.map((file) => {
      return `http://${host}:${this.port}/transfer/download/${task.id}/${file.id}`
    })
  }

  /** 生成上传链接 */
  generateUploadLink(task: TransferTask, host: string): string {
    return `http://${host}:${this.port}/transfer/upload/${task.id}`
  }

  /** 生成任务信息链接 */
  generateInfoLink(task: TransferTask, host: string): string {
    return `http://${host}:${this.port}/transfer/info/${task.id}`
  }
}

// 单例模式
const transferService = new TransferService()
export default transferService
