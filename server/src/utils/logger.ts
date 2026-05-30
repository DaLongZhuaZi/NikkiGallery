import winston from 'winston'
import path from 'path'
import config from '../config'

const { combine, timestamp, printf, colorize } = winston.format

// 自定义日志格式
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  return `${timestamp} [${level}]: ${message}${metaStr}`
})

// 创建日志目录
import fs from 'fs'
const logDir = path.dirname(config.logging.file)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// 创建logger实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // 控制台输出（仅在 TTY 终端中启用颜色，避免通过管道捕获时产生 ANSI 乱码）
    new winston.transports.Console({
      format: combine(
        ...(process.stdout.isTTY ? [colorize()] : []),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      ),
    }),
    // 文件输出
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})

export default logger