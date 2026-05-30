import app from './app'
import config from './config'
import { initDatabase, saveDatabase, flushDatabase, closeDatabase } from './database'
import logger from './utils/logger'
import { registerTaskExecutors } from './services/TaskExecutors'
import { configService } from './services/ConfigService'
import AlbumService from './services/AlbumService'

// 自动扫描已配置的相册
async function autoScanAlbums() {
  const settings = configService.getAll()
  if (!settings.autoScan) {
    logger.info('Auto-scan disabled in settings')
    return
  }

  const hasFolders = settings.screenshotFolders && settings.screenshotFolders.length > 0
  const hasGamePath = settings.gamePath && settings.gamePath.length > 0

  if (!hasFolders && !hasGamePath) {
    logger.info('No screenshot folders or game path configured, skipping auto-scan')
    return
  }

  try {
    logger.info('Auto-scanning configured screenshot folders...')
    const albums = await AlbumService.scanConfiguredFolders()
    logger.info(`Auto-scan complete: ${albums.length} album(s) found`)
    saveDatabase() // 扫描后立即保存数据库
  } catch (error) {
    logger.error('Auto-scan failed:', error)
  }
}

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase()
    logger.info('Database initialized')

    // 注册任务执行器
    registerTaskExecutors()
    logger.info('Task executors initialized')

    // 启动服务器
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${config.server.port}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)

      // 服务器启动后自动扫描（延迟 2 秒，让服务器先就绪）
      setTimeout(autoScanAlbums, 2000)
    })

    // 优雅关闭
    const shutdown = async () => {
      logger.info('Shutting down gracefully...')
      
      // 刷新并保存数据库（包括待定的防抖保存）
      flushDatabase()
      
      // 关闭数据库
      closeDatabase()
      
      // 关闭服务器
      server.close(() => {
        logger.info('Server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error)
      saveDatabase()
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
      saveDatabase()
      process.exit(1)
    })

    // 定期保存数据库（安全兜底，主要依赖写操作后的自动保存）
    setInterval(() => {
      saveDatabase()
    }, 60 * 1000) // 每1分钟保存一次

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
