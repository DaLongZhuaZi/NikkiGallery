import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import path from 'path'
import config from './config'
import { initDatabase, autoSaveMiddleware } from './database'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import logger from './utils/logger'

// 导入路由
import albumRoutes from './routes/albums'
import imageRoutes from './routes/images'
import tagRoutes from './routes/tags'
import shareCodeRoutes from './routes/shareCodes'
import aiRoutes from './routes/ai'
import settingsRoutes from './routes/settings'
import mapRoutes from './routes/map'
import decryptRoutes from './routes/decrypt'
import transferRoutes from './routes/transfer'
import accountRoutes from './routes/accounts'
import dedupRoutes from './routes/dedup'
import resourceRoutes from './routes/resources'
import gifRoutes from './routes/gif'
import pluginRoutes from './routes/plugins'
import archiveRoutes from './routes/archives'
import batchRoutes from './routes/batch'
import livePhotoRoutes from './routes/livePhoto'
import nikkiasRoutes from './routes/nikkias'
import taskRoutes from './routes/tasks'

const app = express()

// 初始化数据库
let dbInitialized = false

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase()
      dbInitialized = true
    } catch (error) {
      logger.error('Failed to initialize database:', error)
      return res.status(500).json({ error: 'Database initialization failed' })
    }
  }
  next()
})

// 中间件
// 配置 helmet，对 SSE 请求放宽限制以确保 EventSource 正常工作
app.use(helmet({
  // 禁用 crossOriginEmbedderPolicy 以允许 SSE 跨域
  crossOriginEmbedderPolicy: false,
  // 设置合理的 CSP，允许 EventSource 连接
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
    },
  },
}))
app.use(cors(config.cors))
app.use(compression({
  // 不压缩 SSE 响应，否则会缓冲流式数据导致 SSE 失效
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream') return false
    if (res.getHeader('Content-Type')?.toString().includes('text/event-stream')) return false
    return compression.filter(req, res)
  }
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// 日志中间件
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}))

// 静态文件服务
app.use('/thumbnails', express.static(config.storage.thumbnailsPath))

// 写操作后自动保存数据库（仅对 POST/PUT/DELETE/PATCH 请求生效）
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    autoSaveMiddleware(req, res, next)
  } else {
    next()
  }
})

// API路由
app.use('/api/albums', albumRoutes)
app.use('/api/images', imageRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/share-codes', shareCodeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/map', mapRoutes)
app.use('/api/decrypt', decryptRoutes)
app.use('/api/transfer', transferRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/dedup', dedupRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/gif', gifRoutes)
app.use('/api/plugins', pluginRoutes)
app.use('/api/archives', archiveRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/live-photo', livePhotoRoutes)
app.use('/api/nikkias', nikkiasRoutes)
app.use('/api/tasks', taskRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  })
})

// 兼容旧版 /api/config 路由 -> 重定向到 /api/settings
app.get('/api/config', (req, res) => {
  res.redirect(307, '/api/settings')
})
app.put('/api/config', (req, res) => {
  res.redirect(307, '/api/settings')
})
app.get('/api/config/detect-game-path', (req, res) => {
  res.redirect(307, '/api/settings/detect-game-path')
})
app.get('/api/config/screenshot-folders', (req, res) => {
  const qs = req.url.includes('?') ? req.url.split('?')[1] : ''
  res.redirect(307, `/api/settings/screenshot-folders${qs ? '?' + qs : ''}`)
})

// 错误处理
app.use(notFoundHandler)
app.use(errorHandler)

export default app