import axios from 'axios'

const api = axios.create({
  baseURL: '/api/gif',
  timeout: 300000 // 5分钟超时
})

export interface VideoInfo {
  duration: number
  width: number
  height: number
  fps: number
}

export interface GifConversionOptions {
  videoPath: string
  fps?: number
  width?: number
  startTime?: number
  duration?: number
}

export interface GifConversionResult {
  filename: string
  fileSize: number
}

// 检查 FFmpeg 是否可用
export const checkFfmpeg = async (): Promise<boolean> => {
  const response = await api.get('/check')
  return response.data.data.available
}

// 获取视频信息
export const getVideoInfo = async (videoPath: string): Promise<VideoInfo> => {
  const response = await api.post('/video-info', { videoPath })
  return response.data.data
}

// 转换 MP4 到 GIF
export const convertToGif = async (options: GifConversionOptions): Promise<GifConversionResult> => {
  const response = await api.post('/convert', options)
  return response.data.data
}

// 获取 GIF 下载 URL
export const getGifDownloadUrl = (filename: string): string => {
  return `/api/gif/download/${filename}`
}

// 清理临时文件
export const cleanupTempFiles = async (maxAge?: number): Promise<void> => {
  await api.post('/cleanup', { maxAge })
}
