import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useTransferStore } from '@/stores/useTransferStore'
import { useImageStore } from '@/stores/useImageStore'
import {
  Wifi, Upload, Download, History, Trash2, RefreshCw,
  Copy, QrCode, X, Check, Clock, FileUp, FileDown
} from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

export default function TransferPage() {
  const { scheme } = useTheme()
  const { selectedImages } = useImageStore()
  const {
    serverStatus,
    isServerLoading,
    currentTask,
    isTaskLoading,
    history,
    isHistoryLoading,
    fetchServerStatus,
    createDownload,
    createUpload,
    cancelTransfer,
    fetchHistory,
    deleteTransfer,
    cleanupExpired,
    setCurrentTask,
  } = useTransferStore()

  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'history'>('download')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQrCode, setShowQrCode] = useState(false)

  // 初始化
  useEffect(() => {
    fetchServerStatus()
    fetchHistory()
  }, [fetchServerStatus, fetchHistory])

  // 生成二维码
  const generateQrCode = useCallback(async (url: string) => {
    try {
      const qrUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      setQrCodeUrl(qrUrl)
      setShowQrCode(true)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast.error('生成二维码失败')
    }
  }, [])

  // 复制链接到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('链接已复制')
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('复制失败')
    }
  }

  // 创建下载任务
  const handleCreateDownload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请选择要下载的文件')
      return
    }
    await createDownload(selectedFiles)
  }

  // 创建上传任务
  const handleCreateUpload = async () => {
    await createUpload()
  }

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  // 计算进度百分比
  const getProgress = (task: { transferredBytes: number; totalBytes: number }): number => {
    if (task.totalBytes === 0) return 0
    return Math.round((task.transferredBytes / task.totalBytes) * 100)
  }

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return scheme.primary
      case 'completed': return '#10B981'
      case 'cancelled': return '#F59E0B'
      case 'expired': return '#6B7280'
      default: return scheme.textSecondary
    }
  }

  // 获取状态文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active': return '进行中'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
      case 'expired': return '已过期'
      default: return status
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: scheme.bgMain }}>
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: scheme.borderLight }}
      >
        <div className="flex items-center gap-3">
          <Wifi className="w-6 h-6" style={{ color: scheme.primary }} />
          <h1 className="text-xl font-semibold" style={{ color: scheme.textPrimary }}>
            局域网传输
          </h1>
        </div>

        {serverStatus && (
          <div className="flex items-center gap-2 text-sm" style={{ color: scheme.textSecondary }}>
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>服务运行中</span>
            <span className="font-mono">:{serverStatus.port}</span>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div
        className="flex border-b"
        style={{ borderColor: scheme.borderLight }}
      >
        {[
          { key: 'download', label: '文件下载', icon: Download },
          { key: 'upload', label: '文件上传', icon: Upload },
          { key: 'history', label: '传输历史', icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === key ? scheme.primary : scheme.textSecondary,
              borderBottom: activeTab === key ? `2px solid ${scheme.primary}` : '2px solid transparent',
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 文件下载 */}
        {activeTab === 'download' && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-xl p-6"
              style={{ background: scheme.bgCard }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: scheme.textPrimary }}>
                创建下载任务
              </h2>

              <p className="text-sm mb-4" style={{ color: scheme.textSecondary }}>
                选择要分享给其他设备的文件，生成下载链接和二维码。
              </p>

              {/* 文件选择（使用画廊中已选中的图片） */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors"
                style={{
                  borderColor: selectedImages.length > 0 ? scheme.primary : scheme.borderLight,
                  backgroundColor: selectedImages.length > 0 ? scheme.primaryLight : 'transparent'
                }}
              >
                <FileDown className="w-12 h-12 mx-auto mb-3" style={{ color: selectedImages.length > 0 ? scheme.primary : scheme.textSecondary }} />
                <p style={{ color: selectedImages.length > 0 ? scheme.primary : scheme.textSecondary }} className="font-medium">
                  {selectedImages.length > 0 
                    ? `已从画廊中选择 ${selectedImages.length} 张图片` 
                    : '请先在画廊中选择图片'}
                </p>
                {selectedImages.length === 0 && (
                  <p className="text-xs mt-2" style={{ color: scheme.textTertiary }}>
                    前往左侧菜单栏的「全部照片」或任意相册，勾选照片后再返回此页面
                  </p>
                )}
              </div>

              <button
                onClick={() => createDownload(selectedImages)}
                disabled={isTaskLoading || selectedImages.length === 0}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: scheme.primary, color: '#ffffff' }}
              >
                {isTaskLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                创建下载任务
              </button>
            </div>

            {/* 当前任务 */}
            {currentTask && currentTask.direction === 'download' && (
              <div
                className="rounded-xl p-6 mt-4"
                style={{ background: scheme.bgCard }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium" style={{ color: scheme.textPrimary }}>
                    下载任务已创建
                  </h3>
                  <button
                    onClick={() => setCurrentTask(null)}
                    className="p-1 rounded-lg"
                    style={{ color: scheme.textSecondary }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: scheme.textSecondary }}>
                      {currentTask.files.length} 个文件
                    </span>
                    <span style={{ color: scheme.textSecondary }}>
                      {getProgress(currentTask)}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: scheme.bgHover }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${getProgress(currentTask)}%`,
                        background: scheme.primary,
                      }}
                    />
                  </div>
                </div>

                {/* 文件列表 */}
                <div className="space-y-2 mb-4">
                  {currentTask.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: scheme.bgHover }}
                    >
                      <div className="flex items-center gap-3">
                        <FileDown className="w-4 h-4" style={{ color: scheme.primary }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                            {file.name}
                          </p>
                          <p className="text-xs" style={{ color: scheme.textSecondary }}>
                            {formatSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(file.downloadUrl || '')}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: scheme.textSecondary }}
                        onMouseEnter={e => (e.currentTarget.style.background = scheme.bgCard)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const url = currentTask.files[0]?.downloadUrl
                      if (url) generateQrCode(url)
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: scheme.primaryLight, color: scheme.primary }}
                  >
                    <QrCode className="w-4 h-4" />
                    显示二维码
                  </button>
                  <button
                    onClick={() => cancelTransfer(currentTask.id)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: scheme.bgHover, color: scheme.textPrimary }}
                  >
                    <X className="w-4 h-4" />
                    取消任务
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 文件上传 */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-xl p-6"
              style={{ background: scheme.bgCard }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: scheme.textPrimary }}>
                创建上传任务
              </h2>

              <p className="text-sm mb-4" style={{ color: scheme.textSecondary }}>
                创建上传链接，其他设备可以通过此链接向本机上传文件。
              </p>

              <button
                onClick={handleCreateUpload}
                disabled={isTaskLoading}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: scheme.primary, color: '#ffffff' }}
              >
                {isTaskLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                创建上传任务
              </button>
            </div>

            {/* 当前任务 */}
            {currentTask && currentTask.direction === 'upload' && (
              <div
                className="rounded-xl p-6 mt-4"
                style={{ background: scheme.bgCard }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium" style={{ color: scheme.textPrimary }}>
                    上传任务已创建
                  </h3>
                  <button
                    onClick={() => setCurrentTask(null)}
                    className="p-1 rounded-lg"
                    style={{ color: scheme.textSecondary }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 上传链接 */}
                <div
                  className="flex items-center gap-3 p-4 rounded-lg mb-4"
                  style={{ background: scheme.bgHover }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-1" style={{ color: scheme.textSecondary }}>
                      上传链接
                    </p>
                    <p className="text-sm font-mono truncate" style={{ color: scheme.textPrimary }}>
                      {serverStatus?.addresses[0] && `http://${serverStatus.addresses[0]}:${serverStatus.port}/transfer/upload/${currentTask.id}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const url = `http://${serverStatus?.addresses[0]}:${serverStatus?.port}/transfer/upload/${currentTask.id}`
                      copyToClipboard(url)
                    }}
                    className="p-2 rounded-lg"
                    style={{ color: scheme.primary }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* 已上传文件 */}
                {currentTask.files.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium" style={{ color: scheme.textSecondary }}>
                      已上传文件
                    </p>
                    {currentTask.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ background: scheme.bgHover }}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm" style={{ color: scheme.textPrimary }}>
                            {file.name}
                          </p>
                          <p className="text-xs" style={{ color: scheme.textSecondary }}>
                            {formatSize(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const url = `http://${serverStatus?.addresses[0]}:${serverStatus?.port}/transfer/upload/${currentTask.id}`
                      generateQrCode(url)
                    }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: scheme.primaryLight, color: scheme.primary }}
                  >
                    <QrCode className="w-4 h-4" />
                    显示二维码
                  </button>
                  <button
                    onClick={() => cancelTransfer(currentTask.id)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: scheme.bgHover, color: scheme.textPrimary }}
                  >
                    <X className="w-4 h-4" />
                    取消任务
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 传输历史 */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: scheme.textPrimary }}>
                传输历史
              </h2>
              <button
                onClick={cleanupExpired}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
                style={{ background: scheme.bgHover, color: scheme.textSecondary }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                清理过期
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ color: scheme.textSecondary }} />
              </div>
            ) : history.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{ background: scheme.bgCard }}
              >
                <History className="w-12 h-12 mx-auto mb-3" style={{ color: scheme.textSecondary }} />
                <p style={{ color: scheme.textSecondary }}>暂无传输记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl p-4"
                    style={{ background: scheme.bgCard }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {task.direction === 'download' ? (
                          <FileDown className="w-5 h-5" style={{ color: scheme.primary }} />
                        ) : (
                          <FileUp className="w-5 h-5" style={{ color: scheme.primary }} />
                        )}
                        <div>
                          <p className="font-medium" style={{ color: scheme.textPrimary }}>
                            {task.direction === 'download' ? '文件下载' : '文件上传'}
                          </p>
                          <p className="text-xs" style={{ color: scheme.textSecondary }}>
                            {task.files.length} 个文件 · {formatSize(task.totalBytes)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 rounded-full text-xs"
                          style={{
                            background: `${getStatusColor(task.status)}20`,
                            color: getStatusColor(task.status),
                          }}
                        >
                          {getStatusText(task.status)}
                        </span>
                        <button
                          onClick={() => deleteTransfer(task.id)}
                          className="p-1.5 rounded-lg"
                          style={{ color: scheme.textSecondary }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 进度条 */}
                    {task.status === 'active' && (
                      <div className="mb-3">
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: scheme.bgHover }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${getProgress(task)}%`,
                              background: scheme.primary,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 时间信息 */}
                    <div className="flex items-center gap-4 text-xs" style={{ color: scheme.textSecondary }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(task.createdAt)}
                      </span>
                      {task.completedAt && (
                        <span>
                          完成于 {formatTime(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 二维码弹窗 */}
      {showQrCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowQrCode(false)}
        >
          <div
            className="rounded-xl p-6"
            style={{ background: scheme.bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium" style={{ color: scheme.textPrimary }}>
                扫描二维码下载
              </h3>
              <button
                onClick={() => setShowQrCode(false)}
                className="p-1 rounded-lg"
                style={{ color: scheme.textSecondary }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            )}

            <p className="text-sm mt-4 text-center" style={{ color: scheme.textSecondary }}>
              使用手机扫描二维码访问下载链接
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
