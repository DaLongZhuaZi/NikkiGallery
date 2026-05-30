import { useState } from 'react'
import { Play, X, Image as ImageIcon, Database, Folder, CheckSquare, Layers, Search, FileText, RefreshCw, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useImageStore } from '@/stores/useImageStore'
import { useAlbumStore } from '@/stores/useAlbumStore'

interface AIProcessDialogProps {
  isOpen: boolean
  onClose: () => void
  onStart: (options: { targetScope: string; albumId?: string; tasks: string[]; imageIds?: string[] }) => void
  unprocessedCount: number
  processedCount?: number
}

export default function AIProcessDialog({ isOpen, onClose, onStart, unprocessedCount, processedCount = 0 }: AIProcessDialogProps) {
  const { scheme } = useTheme()
  const { albums } = useAlbumStore()
  const [targetScope, setTargetScope] = useState<'current' | 'album' | 'unprocessed' | 'reprocess'>('current')
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  
  const [tasks, setTasks] = useState({
    classify: true,
    detect: false,
    feature: false,
    metadata: true
  })

  if (!isOpen) return null

  const handleStart = () => {
    const selectedTasks = Object.entries(tasks)
      .filter(([_, isSelected]) => isSelected)
      .map(([taskKey]) => taskKey)
      
    if (selectedTasks.length === 0) {
      return
    }

    onStart({
      targetScope,
      albumId: targetScope === 'album' ? selectedAlbumId : undefined,
      tasks: selectedTasks
    })
  }

  const toggleTask = (key: keyof typeof tasks) => {
    setTasks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg max-h-[90vh] md:max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: scheme.bgCard, border: `1px solid ${scheme.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: scheme.borderLight }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Play className="w-5 h-5" style={{ color: scheme.primary }} />
            自定义 AI 处理
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-500/10 transition-colors"
            style={{ color: scheme.textTertiary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          
          {/* Target Scope Section */}
          <section>
            <h4 className="text-sm font-medium mb-3" style={{ color: scheme.textSecondary }}>处理范围</h4>
            <div className="space-y-2">
              <label 
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: targetScope === 'current' ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${targetScope === 'current' ? scheme.primary : 'transparent'}`
                }}
              >
                <input 
                  type="radio" 
                  name="targetScope" 
                  checked={targetScope === 'current'} 
                  onChange={() => setTargetScope('current')}
                  className="accent-primary"
                />
                <ImageIcon className="w-4 h-4" style={{ color: scheme.textTertiary }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>所有未处理图片</p>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>处理数据库中所有未被 AI 处理的 {unprocessedCount} 张图片</p>
                </div>
              </label>

              <label 
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: targetScope === 'album' ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${targetScope === 'album' ? scheme.primary : 'transparent'}`
                }}
              >
                <input 
                  type="radio" 
                  name="targetScope" 
                  checked={targetScope === 'album'} 
                  onChange={() => setTargetScope('album')}
                  className="accent-primary"
                />
                <Folder className="w-4 h-4" style={{ color: scheme.textTertiary }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>指定相册</p>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>处理选定相册中的所有未处理图片</p>
                </div>
              </label>
              
              {targetScope === 'album' && (
                <div className="pl-9 pr-3">
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg"
                    style={{ 
                      backgroundColor: scheme.bgInput, 
                      color: scheme.textPrimary,
                      border: `1px solid ${scheme.borderLight}`
                    }}
                  >
                    <option value="" disabled>请选择相册...</option>
                    {albums.map(album => (
                      <option key={album.id} value={album.id}>{album.name} ({album.imageCount})</option>
                    ))}
                  </select>
                </div>
              )}

              <label
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: targetScope === 'unprocessed' ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${targetScope === 'unprocessed' ? scheme.primary : 'transparent'}`
                }}
              >
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'unprocessed'}
                  onChange={() => setTargetScope('unprocessed')}
                  className="accent-primary"
                />
                <Database className="w-4 h-4" style={{ color: scheme.textTertiary }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>全局未处理图片</p>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>处理数据库中所有未经过 AI 处理的图片</p>
                </div>
              </label>

              <label
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: targetScope === 'reprocess' ? '#fef3c7' : scheme.bgHover,
                  border: `1px solid ${targetScope === 'reprocess' ? '#f59e0b' : scheme.borderLight}`
                }}
              >
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'reprocess'}
                  onChange={() => setTargetScope('reprocess')}
                  className="accent-primary"
                />
                <RefreshCw className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>重新处理已分析图片</p>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>
                    对 {processedCount} 张已分析图片重新执行 AI 识别
                  </p>
                </div>
              </label>

              {/* 重新处理警告 */}
              {targetScope === 'reprocess' && (
                <div
                  className="ml-9 mr-3 p-3 rounded-lg flex items-start gap-2.5"
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#92400e' }}>
                      注意：重新处理会覆盖已有 AI 标签
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#a16207' }}>
                      系统会先清除这些图片的 AI 标签，再写入新的识别结果。您手动添加的标签不会受影响。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Tasks Section */}
          <section>
            <h4 className="text-sm font-medium mb-3" style={{ color: scheme.textSecondary }}>处理任务</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: tasks.classify ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${tasks.classify ? scheme.primary : scheme.borderLight}`
                }}
              >
                <input 
                  type="checkbox" 
                  checked={tasks.classify}
                  onChange={() => toggleTask('classify')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="w-4 h-4" style={{ color: scheme.textSecondary }} />
                    <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>图像分类</p>
                  </div>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>识别场景、服装风格等整体信息</p>
                </div>
              </label>

              <label 
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: tasks.detect ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${tasks.detect ? scheme.primary : scheme.borderLight}`
                }}
              >
                <input 
                  type="checkbox" 
                  checked={tasks.detect}
                  onChange={() => toggleTask('detect')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Search className="w-4 h-4" style={{ color: scheme.textSecondary }} />
                    <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>目标检测</p>
                  </div>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>框选并检测图片中的特定人物或部件</p>
                </div>
              </label>

              <label 
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: tasks.feature ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${tasks.feature ? scheme.primary : scheme.borderLight}`
                }}
              >
                <input 
                  type="checkbox" 
                  checked={tasks.feature}
                  onChange={() => toggleTask('feature')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckSquare className="w-4 h-4" style={{ color: scheme.textSecondary }} />
                    <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>特征提取</p>
                  </div>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>提取特征向量，用于以图搜图功能</p>
                </div>
              </label>

              <label 
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ 
                  backgroundColor: tasks.metadata ? scheme.primaryLight : scheme.bgHover,
                  border: `1px solid ${tasks.metadata ? scheme.primary : scheme.borderLight}`
                }}
              >
                <input 
                  type="checkbox" 
                  checked={tasks.metadata}
                  onChange={() => toggleTask('metadata')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-4 h-4" style={{ color: scheme.textSecondary }} />
                    <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>元数据提取</p>
                  </div>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>解析游戏截图末尾自带的相机与位置信息</p>
                </div>
              </label>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: scheme.borderLight, backgroundColor: scheme.bgCard }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: scheme.textSecondary, backgroundColor: scheme.bgHover }}
          >
            取消
          </button>
          <button
            onClick={handleStart}
            disabled={!Object.values(tasks).some(Boolean) || (targetScope === 'album' && !selectedAlbumId)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }}
          >
            <Play className="w-4 h-4" />
            开始执行
          </button>
        </div>
      </div>
    </div>
  )
}
