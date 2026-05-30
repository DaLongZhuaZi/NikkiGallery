import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '14000', 10),
    host: process.env.HOST || 'localhost',
  },

  // 数据库配置
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../data/nikki.db'),
  },

  // 文件存储配置
  storage: {
    // 游戏截图目录（默认路径）
    gameScreenshotsPath: process.env.GAME_SCREENSHOTS_PATH || '',
    // 自定义相册目录
    customAlbumsPath: process.env.CUSTOM_ALBUMS_PATH || path.join(__dirname, '../../data/albums'),
    // 缩略图目录
    thumbnailsPath: process.env.THUMBNAILS_PATH || path.join(__dirname, '../../data/thumbnails'),
    // 临时文件目录
    tempPath: process.env.TEMP_PATH || path.join(__dirname, '../../data/temp'),
  },

  // AI服务配置
  ai: {
    // ONNX模型目录
    modelsPath: process.env.AI_MODELS_PATH || path.join(__dirname, '../../ai-service/models'),
    // 后端：webgl | webgpu | wasm
    backend: (process.env.AI_BACKEND || 'webgl') as 'webgl' | 'webgpu' | 'wasm',
    // 并发处理数
    concurrency: parseInt(process.env.AI_CONCURRENCY || '2', 10),
  },

  // 缩略图配置
  thumbnail: {
    width: parseInt(process.env.THUMB_WIDTH || '300', 10),
    height: parseInt(process.env.THUMB_HEIGHT || '300', 10),
    quality: parseInt(process.env.THUMB_QUALITY || '80', 10),
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../data/logs/app.log'),
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:13000',
    credentials: true,
  },
}

export default config