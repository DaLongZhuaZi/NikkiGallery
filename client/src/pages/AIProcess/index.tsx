import { useEffect, useState } from 'react'
import { Cpu, Play, Pause, Settings, Zap, Image, Search, CheckCircle, Clock, Tag, Layers, ChevronDown, X, Loader2 } from 'lucide-react'
import { useAIStore } from '@/stores/useAIStore'
import { useImageStore } from '@/stores/useImageStore'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'
import AISettingsModal from './AISettingsModal'
import AIProcessDialog from '@/components/ai/AIProcessDialog'
import * as aiApi from '@/api/ai'

interface SimilarImage {
  imageId: string
  similarity: number
  thumbnailPath?: string
  filename?: string
}

export default function AIProcessPage() {
  const {
    processStatus,
    gpuInfo,
    tags,
    fetchTags,
    detectGPU,
    batchProcess,
    lastProcessResult
  } = useAIStore()
  const { images, fetchImages, imageStats, fetchImageStats } = useImageStore()
  const { scheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [showProcessDialog, setShowProcessDialog] = useState(false)
  const [gpuDetecting, setGpuDetecting] = useState(true)

  // 以图搜图状态
  const [searchImageId, setSearchImageId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SimilarImage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)

  useEffect(() => {
    fetchTags()
    fetchImages()
    fetchImageStats()
    // GPU检测带状态追踪
    setGpuDetecting(true)
    detectGPU().finally(() => setGpuDetecting(false))
  }, [fetchTags, detectGPU, fetchImages, fetchImageStats])

  const unprocessedImages = images.filter(img => !img.aiProcessed)
  const processedImages = images.filter(img => img.aiProcessed)

  const handleStartProcess = async (options: { targetScope: string; albumId?: string; tasks: string[]; imageIds?: string[] }) => {
    try {
      setShowProcessDialog(false)
      const batchOptions: aiApi.BatchProcessOptions = {
        tasks: options.tasks,
        targetScope: options.targetScope,
        albumId: options.albumId
      }

      // 'current' 映射到后端的 'unprocessed'（不限于前端加载的50张）
      if (options.targetScope === 'current') {
        batchOptions.targetScope = 'unprocessed'
      } else if (options.targetScope === 'reprocess') {
        // 直接传给后端处理，后端会查询所有已处理的图片
        batchOptions.targetScope = 'reprocess'
        toast('将重新处理所有已分析图片，旧 AI 标签会被覆盖', { icon: '⚠️' })
      }

      await batchProcess(batchOptions)
      toast.success('后台批量处理任务已启动，请在任务面板查看进度')
    } catch (error) {
      toast.error('启动AI处理任务失败')
    }
  }

  const handleStopProcess = () => {
    toast.error('当前使用后台任务，请在任务面板取消任务')
  }

  // 以图搜图
  const handleSearchSimilar = async () => {
    if (!searchImageId) {
      toast.error('请先选择一张图片')
      return
    }

    setIsSearching(true)
    setSearchResults([])
    try {
      const results = await aiApi.searchSimilar(searchImageId)
      setSearchResults(results || [])
      if (results && results.length > 0) {
        toast.success(`找到 ${results.length} 张相似图片`)
      } else {
        toast('未找到相似图片')
      }
    } catch (error) {
      toast.error('搜索失败，请确保已下载特征提取模型')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchImageId(null)
    setSearchResults([])
  }

  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  const iconBoxStyle = (color: string) => ({
    backgroundColor: `${color}15`,
    color: color,
  })

  return (
    <div className="page-transition">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: scheme.textPrimary }}>
            AI智能识别
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            使用AI自动识别图片内容，生成智能标签
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            color: scheme.textSecondary,
            backgroundColor: scheme.bgCard,
            border: `1px solid ${scheme.border}`,
          }}
        >
          <Settings className="w-4 h-4" />
          AI设置
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：GPU信息和模型选择 */}
        <div className="space-y-6">
          {/* GPU信息 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#f59e0b')}>
                <Zap className="w-4 h-4" />
              </div>
              加速设备
            </h3>

            {gpuDetecting ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: scheme.primary }} />
                <p className="text-sm mt-2" style={{ color: scheme.textSecondary }}>正在检测GPU...</p>
              </div>
            ) : gpuInfo ? (
              <div className="space-y-3">
                {/* GPU类型标签 - 更醒目 */}
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: gpuInfo.type === 'discrete'
                      ? `linear-gradient(135deg, #10b98115, #3b82f615)`
                      : gpuInfo.type === 'integrated'
                        ? `linear-gradient(135deg, #f59e0b15, #3b82f615)`
                        : `${scheme.bgHover}`,
                    border: `1px solid ${gpuInfo.type === 'discrete' ? '#10b98140' : gpuInfo.type === 'integrated' ? '#f59e0b40' : scheme.borderLight}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: gpuInfo.type === 'discrete' ? '#10b98120' : gpuInfo.type === 'integrated' ? '#f59e0b20' : scheme.bgHover,
                      color: gpuInfo.type === 'discrete' ? '#10b981' : gpuInfo.type === 'integrated' ? '#f59e0b' : scheme.textTertiary,
                    }}
                  >
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: scheme.textPrimary }}>
                      {gpuInfo.type === 'discrete' ? '独立显卡 (GPU加速)' : gpuInfo.type === 'integrated' ? '集成显卡 (GPU加速)' : 'CPU模式'}
                    </p>
                    <p className="text-xs" style={{ color: scheme.textSecondary }}>
                      {gpuInfo.renderer || '未知设备'} · {gpuInfo.backend?.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* 详细信息 */}
                {[
                  ...(gpuInfo.vendor ? [{ label: '厂商', value: gpuInfo.vendor }] : []),
                  ...(gpuInfo.memory ? [{ label: '显存', value: `${gpuInfo.memory} MB` }] : []),
                  { label: '推理后端', value: gpuInfo.backend?.toUpperCase() || 'WASM' },
                  ...(gpuInfo.features ? [{ label: '支持特性', value: gpuInfo.features.join(', ') }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: scheme.textSecondary }}>{item.label}</span>
                    <span className="text-sm font-medium truncate ml-2" style={{ color: scheme.textPrimary }}>{item.value}</span>
                  </div>
                ))}

                {/* 重新检测按钮 */}
                <button
                  onClick={() => {
                    setGpuDetecting(true)
                    detectGPU().finally(() => setGpuDetecting(false))
                  }}
                  className="w-full mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-80"
                  style={{
                    backgroundColor: scheme.bgHover,
                    color: scheme.textSecondary,
                    border: `1px solid ${scheme.borderLight}`,
                  }}
                >
                  重新检测
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm" style={{ color: scheme.textSecondary }}>GPU检测失败</p>
                <button
                  onClick={() => {
                    setGpuDetecting(true)
                    detectGPU().finally(() => setGpuDetecting(false))
                  }}
                  className="mt-2 px-3 py-1 rounded text-xs"
                  style={{ color: scheme.primary }}
                >
                  重试
                </button>
              </div>
            )}
          </div>

        </div>

        {/* 中间：处理状态和进度 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 处理状态 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold" style={{ color: scheme.textPrimary }}>处理状态</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProcessDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                    boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
                  }}
                >
                  <Play className="w-4 h-4" />
                  配置并执行
                </button>
              </div>
            </div>



            {/* 进度条 */}
            {processStatus.isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: scheme.textSecondary }}>处理进度</span>
                  <span className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                    {Math.round(processStatus.progress)}%
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: scheme.bgHover }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${processStatus.progress}%`,
                      background: `linear-gradient(90deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: scheme.textTertiary }}>
                  已处理 {processStatus.processedCount} / {processStatus.totalCount} 张图片
                </p>
              </div>
            )}

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '总图片数', value: imageStats.total || images.length, color: scheme.textPrimary },
                { label: '已处理', value: imageStats.aiProcessed || images.filter(i => i.aiProcessed).length, color: scheme.success },
                { label: '待处理', value: (imageStats.total || images.length) - (imageStats.aiProcessed || images.filter(i => i.aiProcessed).length), color: scheme.warning },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg p-4 text-center" style={{ backgroundColor: scheme.bgHover }}>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-sm" style={{ color: scheme.textSecondary }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 最近处理结果 */}
          {lastProcessResult && (
            <div className="rounded-xl p-6" style={cardStyle}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#10b981')}>
                  <CheckCircle className="w-4 h-4" />
                </div>
                最近处理结果
              </h3>

              <div className="space-y-4">
                {/* 图片信息 */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: scheme.bgHover }}>
                  <Image className="w-5 h-5" style={{ color: scheme.textTertiary }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                      图片ID: {lastProcessResult.imageId.substring(0, 8)}...
                    </p>
                    <p className="text-xs" style={{ color: scheme.textTertiary }}>
                      处理时间: {new Date(lastProcessResult.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* 分类结果 */}
                {lastProcessResult.classifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: scheme.textSecondary }}>
                      <Tag className="w-4 h-4" />
                      识别标签
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {lastProcessResult.classifications.map((cls, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{
                            background: `linear-gradient(135deg, ${scheme.gradientStart}20, ${scheme.gradientEnd}20)`,
                            color: scheme.primary,
                            border: `1px solid ${scheme.gradientStart}30`,
                          }}
                        >
                          {cls.tagNameZh || cls.tagNameEn || cls.tagId}
                          <span className="ml-1 opacity-75">
                            {(cls.confidence * 100).toFixed(0)}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 检测结果 */}
                {lastProcessResult.detections && lastProcessResult.detections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: scheme.textSecondary }}>
                      <Search className="w-4 h-4" />
                      检测目标
                    </h4>
                    <div className="space-y-2">
                      {lastProcessResult.detections.map((det: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: scheme.bgHover }}
                        >
                          <span className="text-sm" style={{ color: scheme.textPrimary }}>
                            {det.label || det.class || `目标 ${index + 1}`}
                          </span>
                          <span className="text-xs font-medium" style={{ color: scheme.success }}>
                            {(det.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 无结果提示 */}
                {lastProcessResult.classifications.length === 0 && 
                 (!lastProcessResult.detections || lastProcessResult.detections.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-sm" style={{ color: scheme.textTertiary }}>
                      未识别到任何标签或目标
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 标签统计 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#8b5cf6')}>
                <Image className="w-4 h-4" />
              </div>
              标签统计
            </h3>

            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 20).map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.gradientStart}20, ${scheme.gradientEnd}20)`,
                    color: scheme.primary,
                    border: `1px solid ${scheme.gradientStart}30`,
                  }}
                >
                  {tag.nameZh}
                  <span className="ml-1 opacity-75">({tag.usageCount})</span>
                </span>
              ))}
              {tags.length > 20 && (
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: scheme.bgHover, color: scheme.textTertiary }}
                >
                  +{tags.length - 20} 更多
                </span>
              )}
            </div>
          </div>

          {/* 以图搜图 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#10b981')}>
                <Search className="w-4 h-4" />
              </div>
              以图搜图
            </h3>

            {/* 图片选择 */}
            <div className="mb-4">
              <label className="text-sm mb-2 block" style={{ color: scheme.textSecondary }}>选择查询图片:</label>
              {searchImageId ? (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: scheme.bgHover }}>
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={`/api/images/${searchImageId}/thumbnail`}
                      alt="Selected"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png'
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>
                      已选择图片
                    </p>
                    <p className="text-xs truncate" style={{ color: scheme.textTertiary }}>
                      {searchImageId.substring(0, 12)}...
                    </p>
                  </div>
                  <button
                    onClick={handleClearSearch}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    style={{ color: scheme.textTertiary }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowImagePicker(true)}
                  className="w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:border-solid"
                  style={{
                    borderColor: scheme.borderLight,
                    color: scheme.textSecondary,
                  }}
                >
                  <Image className="w-8 h-8 mx-auto mb-2" style={{ color: scheme.textTertiary }} />
                  <p className="text-sm">点击选择图片</p>
                </button>
              )}
            </div>

            {/* 搜索按钮 */}
            <button
              onClick={handleSearchSimilar}
              disabled={!searchImageId || isSearching}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, #10b981, #059669)`,
                boxShadow: `0 4px 14px #10b98140`,
              }}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  搜索中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  搜索相似图片
                </>
              )}
            </button>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-3" style={{ color: scheme.textSecondary }}>
                  相似图片 ({searchResults.length})
                </h4>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.imageId}
                      className="relative group rounded-lg overflow-hidden cursor-pointer"
                      style={{ aspectRatio: '1' }}
                    >
                      <img
                        src={`/api/images/${result.imageId}/thumbnail`}
                        alt={`Similar ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <div className="w-full">
                          <p className="text-white text-xs font-medium">
                            相似度: {(result.similarity * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无结果提示 */}
            {!isSearching && searchResults.length === 0 && searchImageId && (
              <div className="mt-4 text-center py-4">
                <p className="text-sm" style={{ color: scheme.textTertiary }}>
                  点击"搜索相似图片"开始搜索
                </p>
              </div>
            )}

            {/* 提示信息 */}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: scheme.bgHover }}>
              <p className="text-xs" style={{ color: scheme.textTertiary }}>
                💡 提示: 以图搜图需要下载特征提取模型(ResNet-18)才能使用
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI设置模态框 */}
      <AISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        gpuInfo={gpuInfo}
      />

      {/* 自定义处理任务对话框 */}
      <AIProcessDialog
        isOpen={showProcessDialog}
        onClose={() => setShowProcessDialog(false)}
        onStart={handleStartProcess}
        unprocessedCount={(imageStats.total || 0) - (imageStats.aiProcessed || 0)}
        processedCount={imageStats.aiProcessed || processedImages.length}
      />

      {/* 图片选择器模态框 */}
      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-2xl max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: scheme.bgCard, border: `1px solid ${scheme.border}` }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: scheme.borderLight }}>
              <h3 className="font-semibold" style={{ color: scheme.textPrimary }}>选择图片</h3>
              <button
                onClick={() => setShowImagePicker(false)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                style={{ color: scheme.textTertiary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.slice(0, 50).map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ aspectRatio: '1' }}
                    onClick={() => {
                      setSearchImageId(img.id)
                      setShowImagePicker(false)
                      setSearchResults([])
                    }}
                  >
                    <img
                      src={`/api/images/${img.id}/thumbnail`}
                      alt={img.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png'
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
              {images.length > 50 && (
                <p className="text-center text-sm mt-4" style={{ color: scheme.textTertiary }}>
                  显示前 50 张图片
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
