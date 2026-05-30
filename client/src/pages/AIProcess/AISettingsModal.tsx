import { useState, useEffect, useRef } from 'react'
import { X, Download, Check, Loader2, HardDrive, Cpu, Zap, XCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useTaskStore } from '@/stores/useTaskStore'
import toast from 'react-hot-toast'

interface ModelInfo {
  id: string
  name: string
  nameZh: string
  description: string
  type: 'classification' | 'detection' | 'segmentation'
  size: string
  downloadUrl: string
  inputSize: [number, number]
  labels: string[]
  performance: {
    gpu: string
    cpu: string
  }
  downloaded: boolean
}

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
  gpuInfo: any
}

export default function AISettingsModal({ isOpen, onClose, gpuInfo }: AISettingsModalProps) {
  const { scheme } = useTheme()
  const { tasks } = useTaskStore()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadTaskId, setDownloadTaskId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchModels()
    }
  }, [isOpen])

  // 监听下载任务的进度（通过任务系统SSE推送）
  useEffect(() => {
    if (!downloadTaskId || !downloading) return

    const task = tasks.find(t => t.id === downloadTaskId)
    if (task) {
      setDownloadProgress(prev => ({ ...prev, [downloading]: task.progress || 0 }))
      setDownloadStatus(prev => ({ ...prev, [downloading]: task.currentStep || '下载中...' }))

      if (task.status === 'completed') {
        setDownloadProgress(prev => ({ ...prev, [downloading]: 100 }))
        setModels(prev =>
          prev.map(m => m.id === downloading ? { ...m, downloaded: true } : m)
        )
        toast.success(`模型下载完成`)
        setDownloading(null)
        setDownloadTaskId(null)
      } else if (task.status === 'failed') {
        toast.error(`下载失败: ${task.error || '未知错误'}`)
        setDownloading(null)
        setDownloadTaskId(null)
      } else if (task.status === 'cancelled') {
        toast('下载已取消')
        setDownloading(null)
        setDownloadTaskId(null)
      }
    }
  }, [tasks, downloadTaskId, downloading])

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const fetchModels = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/models')
      const data = await response.json()
      if (data.success) {
        setModels(data.data)
      }
    } catch (error) {
      toast.error('获取模型列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (model: ModelInfo) => {
    setDownloading(model.id)
    setDownloadProgress(prev => ({ ...prev, [model.id]: 0 }))
    setDownloadStatus(prev => ({ ...prev, [model.id]: '正在提交下载任务...' }))

    try {
      const response = await fetch('/api/ai/download-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          downloadUrl: model.downloadUrl,
        }),
      })

      const result = await response.json()

      if (result.success && result.data.taskId) {
        setDownloadTaskId(result.data.taskId)
        setDownloadStatus(prev => ({ ...prev, [model.id]: '下载已开始...' }))
      } else {
        throw new Error(result.error || '提交下载任务失败')
      }
    } catch (error: any) {
      toast.error(`下载失败: ${error.message}`)
      setDownloading(null)
      setDownloadTaskId(null)
    }
  }

  const handleCancelDownload = async () => {
    if (!downloadTaskId) return

    try {
      await fetch('/api/ai/cancel-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: downloadTaskId }),
      })
      toast.success('下载已取消')
    } catch (error) {
      // 忽略取消错误
    } finally {
      setDownloading(null)
      setDownloadTaskId(null)
      setDownloadProgress(prev => ({ ...prev, [downloading || '']: 0 }))
      setDownloadStatus(prev => ({ ...prev, [downloading || '']: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: scheme.bgCard,
          boxShadow: scheme.shadowLg,
          border: `1px solid ${scheme.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${scheme.borderLight}` }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: scheme.textPrimary }}>AI模型设置</h2>
            <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>管理AI识别模型，下载和配置</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: scheme.textTertiary }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPU信息卡片 */}
        <div
          className="mx-6 mt-4 p-4 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${scheme.gradientStart}10, ${scheme.gradientEnd}10)`,
            border: `1px solid ${scheme.borderLight}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: scheme.bgCard, boxShadow: scheme.shadowSm }}
            >
              <Zap className="w-6 h-6" style={{ color: scheme.warning }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: scheme.textPrimary }}>GPU加速信息</h3>
              {gpuInfo ? (
                <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                  <span className="flex items-center gap-1" style={{ color: scheme.textSecondary }}>
                    <Cpu className="w-4 h-4" />
                    {gpuInfo.type === 'discrete' ? '独立显卡' :
                     gpuInfo.type === 'integrated' ? '集成显卡' : 'CPU模式'}
                  </span>
                  <span style={{ color: scheme.textTertiary }}>|</span>
                  <span style={{ color: scheme.textSecondary }}>{gpuInfo.renderer || '未知'}</span>
                  <span style={{ color: scheme.textTertiary }}>|</span>
                  <span className="font-medium" style={{ color: scheme.info }}>{gpuInfo.backend?.toUpperCase()}</span>
                </div>
              ) : (
                <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>正在检测GPU信息...</p>
              )}
            </div>
          </div>
        </div>

        {/* 模型列表 */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <h3 className="font-semibold mb-4" style={{ color: scheme.textPrimary }}>可用模型</h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="p-4 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: model.downloaded ? `${scheme.success}08` : scheme.bgCard,
                    border: `2px solid ${model.downloaded ? scheme.success : scheme.border}`,
                    boxShadow: scheme.shadowSm,
                  }}
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold" style={{ color: scheme.textPrimary }}>{model.nameZh}</h4>
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${scheme.info}15`,
                            color: scheme.info,
                          }}
                        >
                          {model.type === 'classification' ? '分类' :
                           model.type === 'detection' ? '检测' : '分割'}
                        </span>
                        {model.downloaded && (
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1"
                            style={{ backgroundColor: `${scheme.success}15`, color: scheme.success }}
                          >
                            <Check className="w-3 h-3" />
                            已下载
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>{model.description}</p>

                      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: scheme.textTertiary }}>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {model.size}
                        </span>
                        <span>输入尺寸: {model.inputSize[0]}x{model.inputSize[1]}</span>
                        <span style={{ color: scheme.success }}>GPU: {model.performance.gpu}</span>
                        <span style={{ color: scheme.warning }}>CPU: {model.performance.cpu}</span>
                      </div>

                      {model.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {model.labels.slice(0, 8).map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: scheme.bgHover, color: scheme.textSecondary }}
                            >
                              {label}
                            </span>
                          ))}
                          {model.labels.length > 8 && (
                            <span
                              className="px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: scheme.bgHover, color: scheme.textTertiary }}
                            >
                              +{model.labels.length - 8} 更多
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto">
                      {model.downloaded ? (
                        <div
                          className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto"
                          style={{ backgroundColor: `${scheme.success}15`, color: scheme.success }}
                        >
                          <Check className="w-4 h-4" />
                          已就绪
                        </div>
                      ) : downloading === model.id ? (
                        <div className="w-full sm:w-52">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs truncate max-w-[150px]" style={{ color: scheme.textTertiary }}>
                              {downloadStatus[model.id] || '下载中...'}
                            </span>
                            <span className="text-xs font-medium" style={{ color: scheme.primary }}>
                              {downloadProgress[model.id] || 0}%
                            </span>
                          </div>
                          <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: scheme.bgHover }}>
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${downloadProgress[model.id] || 0}%`,
                                background: `linear-gradient(90deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                              }}
                            />
                          </div>
                          <button
                            onClick={handleCancelDownload}
                            className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:opacity-80"
                            style={{
                              backgroundColor: `${scheme.error}15`,
                              color: scheme.error,
                              border: `1px solid ${scheme.error}30`,
                            }}
                          >
                            <XCircle className="w-3 h-3" />
                            取消下载
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownload(model)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                          style={{
                            background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                            boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
                          }}
                        >
                          <Download className="w-4 h-4" />
                          下载模型
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div
          className="px-6 py-4"
          style={{ borderTop: `1px solid ${scheme.borderLight}`, backgroundColor: scheme.bgHover }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: scheme.textTertiary }}>
              模型文件保存在项目目录的 models 文件夹中
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: scheme.bgActive,
                color: scheme.textSecondary,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.border)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
