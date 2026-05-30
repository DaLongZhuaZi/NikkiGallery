import { useEffect, useState } from 'react'
import {
  Film,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Maximize2,
  Zap
} from 'lucide-react'
import { useGifStore } from '../../stores/useGifStore'
import { formatBytes, formatDuration } from '../../utils/format'

export default function GifConverterPage() {
  const {
    isFfmpegAvailable,
    videoInfo,
    videoPath,
    fps,
    width,
    startTime,
    duration,
    isConverting,
    conversionProgress,
    conversionResult,
    error,
    checkFfmpegAvailability,
    loadVideoInfo,
    setVideoPath,
    setFps,
    setWidth,
    setStartTime,
    setDuration,
    startConversion,
    downloadGif,
    clearError,
    reset
  } = useGifStore()

  const [inputPath, setInputPath] = useState('')

  useEffect(() => {
    checkFfmpegAvailability()
  }, [checkFfmpegAvailability])

  const handleLoadVideo = () => {
    if (inputPath.trim()) {
      loadVideoInfo(inputPath.trim())
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 对于本地文件，我们需要获取完整路径
      // 在Web环境中，我们只能获取文件名，需要用户手动输入路径
      setInputPath(file.name)
    }
  }

  const handleConvert = () => {
    startConversion()
  }

  const handleDownload = () => {
    downloadGif()
  }

  const handleReset = () => {
    reset()
    setInputPath('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">MP4 转 GIF</h1>
        <p className="text-gray-600 mt-1">将游戏视频转换为 GIF 动图</p>
      </div>

      {/* FFmpeg 状态检查 */}
      <div className={`mb-6 p-4 rounded-lg border ${
        isFfmpegAvailable
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {isFfmpegAvailable ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p className={`font-medium ${
              isFfmpegAvailable ? 'text-green-800' : 'text-red-800'
            }`}>
              {isFfmpegAvailable ? 'FFmpeg 已就绪' : 'FFmpeg 未安装'}
            </p>
            {!isFfmpegAvailable && (
              <p className="text-sm text-red-600 mt-1">
                请安装 FFmpeg 后再使用此功能。
                <a
                  href="https://ffmpeg.org/download.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  下载 FFmpeg
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：视频输入和参数设置 */}
        <div className="space-y-6">
          {/* 视频输入 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Film className="w-5 h-5" />
              视频文件
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  视频路径
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputPath}
                    onChange={(e) => setInputPath(e.target.value)}
                    placeholder="输入视频文件完整路径"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleLoadVideo}
                    disabled={!inputPath.trim() || !isFfmpegAvailable}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    加载
                  </button>
                </div>
              </div>

              {videoInfo && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">视频信息</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">时长:</div>
                    <div>{formatDuration(videoInfo.duration)}</div>
                    <div className="text-gray-500">分辨率:</div>
                    <div>{videoInfo.width} × {videoInfo.height}</div>
                    <div className="text-gray-500">帧率:</div>
                    <div>{videoInfo.fps} fps</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 转换参数 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              转换参数
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帧率 (FPS): {fps}
                </label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 fps (低)</span>
                  <span>25 fps (高)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  宽度: {width}px
                </label>
                <input
                  type="range"
                  min="120"
                  max="1080"
                  step="10"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>120px (小)</span>
                  <span>1080px (大)</span>
                </div>
              </div>

              {videoInfo && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间: {formatDuration(startTime)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={videoInfo.duration - 0.1}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => setStartTime(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      持续时间: {duration > 0 ? formatDuration(duration) : '完整视频'}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max={videoInfo.duration - startTime}
                      step="0.1"
                      value={duration || videoInfo.duration - startTime}
                      onChange={(e) => setDuration(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      设置为 0 表示转换完整视频
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：预览和转换 */}
        <div className="space-y-6">
          {/* 参数预览 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              转换预览
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">输出格式</span>
                <span className="font-medium">GIF</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">帧率</span>
                <span className="font-medium">{fps} fps</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">宽度</span>
                <span className="font-medium">{width}px</span>
              </div>
              {videoInfo && (
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">高度</span>
                    <span className="font-medium">
                      {Math.round(videoInfo.height * width / videoInfo.width)}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">时长</span>
                    <span className="font-medium">
                      {duration > 0 ? formatDuration(duration) : formatDuration(videoInfo.duration - startTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">预计帧数</span>
                    <span className="font-medium">
                      {Math.ceil((duration || videoInfo.duration - startTime) * fps)} 帧
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 转换按钮和进度 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {!conversionResult ? (
                <button
                  onClick={handleConvert}
                  disabled={!videoPath || isConverting || !isFfmpegAvailable}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    !videoPath || isConverting || !isFfmpegAvailable
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                  }`}
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      转换中... {Math.round(conversionProgress)}%
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      开始转换
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">转换完成！</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      文件大小: {formatBytes(conversionResult.fileSize)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      下载 GIF
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      重新转换
                    </button>
                  </div>
                </div>
              )}

              {/* 进度条 */}
              {isConverting && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${conversionProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    正在处理，请稍候...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>确保已安装 FFmpeg</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>输入视频文件的完整路径</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>调整帧率、宽度等参数</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>点击"开始转换"按钮</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">5.</span>
                <span>转换完成后下载 GIF 文件</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
