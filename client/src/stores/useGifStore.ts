import { create } from 'zustand'
import {
  VideoInfo,
  GifConversionOptions,
  GifConversionResult,
  checkFfmpeg,
  getVideoInfo,
  convertToGif,
  getGifDownloadUrl
} from '../api/gif'

interface GifState {
  // FFmpeg 状态
  isFfmpegAvailable: boolean

  // 视频信息
  videoInfo: VideoInfo | null
  videoPath: string

  // 转换参数
  fps: number
  width: number
  startTime: number
  duration: number

  // 转换状态
  isConverting: boolean
  conversionProgress: number
  conversionResult: GifConversionResult | null

  // 错误信息
  error: string | null

  // 操作
  checkFfmpegAvailability: () => Promise<void>
  loadVideoInfo: (videoPath: string) => Promise<void>
  setVideoPath: (path: string) => void
  setFps: (fps: number) => void
  setWidth: (width: number) => void
  setStartTime: (time: number) => void
  setDuration: (duration: number) => void
  startConversion: () => Promise<void>
  downloadGif: () => void
  clearError: () => void
  reset: () => void
}

export const useGifStore = create<GifState>((set, get) => ({
  isFfmpegAvailable: false,
  videoInfo: null,
  videoPath: '',
  fps: 10,
  width: 480,
  startTime: 0,
  duration: 0,
  isConverting: false,
  conversionProgress: 0,
  conversionResult: null,
  error: null,

  checkFfmpegAvailability: async () => {
    try {
      const available = await checkFfmpeg()
      set({ isFfmpegAvailable: available })
      if (!available) {
        set({ error: 'FFmpeg 未安装。请安装 FFmpeg 后再使用此功能。' })
      }
    } catch (error) {
      set({
        isFfmpegAvailable: false,
        error: '检查 FFmpeg 失败'
      })
    }
  },

  loadVideoInfo: async (videoPath: string) => {
    set({ error: null, videoInfo: null })
    try {
      const info = await getVideoInfo(videoPath)
      set({
        videoInfo: info,
        videoPath,
        duration: info.duration,
        startTime: 0
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取视频信息失败'
      })
    }
  },

  setVideoPath: (path: string) => set({ videoPath: path }),
  setFps: (fps: number) => set({ fps: Math.min(25, Math.max(1, fps)) }),
  setWidth: (width: number) => set({ width: Math.min(1080, Math.max(120, width)) }),
  setStartTime: (time: number) => {
    const { videoInfo } = get()
    const maxTime = videoInfo ? videoInfo.duration - 0.1 : 0
    set({ startTime: Math.max(0, Math.min(maxTime, time)) })
  },
  setDuration: (duration: number) => {
    const { videoInfo, startTime } = get()
    const maxDuration = videoInfo ? videoInfo.duration - startTime : 0
    set({ duration: Math.max(0.1, Math.min(maxDuration, duration)) })
  },

  startConversion: async () => {
    const { videoPath, fps, width, startTime, duration } = get()

    if (!videoPath) {
      set({ error: '请先选择视频文件' })
      return
    }

    set({
      isConverting: true,
      conversionProgress: 0,
      conversionResult: null,
      error: null
    })

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        set(state => ({
          conversionProgress: Math.min(95, state.conversionProgress + Math.random() * 10)
        }))
      }, 1000)

      const result = await convertToGif({
        videoPath,
        fps,
        width,
        startTime,
        duration: duration > 0 ? duration : undefined
      })

      clearInterval(progressInterval)

      set({
        isConverting: false,
        conversionProgress: 100,
        conversionResult: result
      })
    } catch (error) {
      set({
        isConverting: false,
        conversionProgress: 0,
        error: error instanceof Error ? error.message : '转换失败'
      })
    }
  },

  downloadGif: () => {
    const { conversionResult } = get()
    if (!conversionResult) return

    const url = getGifDownloadUrl(conversionResult.filename)
    const link = document.createElement('a')
    link.href = url
    link.download = conversionResult.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    videoInfo: null,
    videoPath: '',
    fps: 10,
    width: 480,
    startTime: 0,
    duration: 0,
    isConverting: false,
    conversionProgress: 0,
    conversionResult: null,
    error: null
  })
}))

export type { VideoInfo, GifConversionOptions, GifConversionResult }
