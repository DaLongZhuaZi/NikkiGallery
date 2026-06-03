import { useState } from 'react'
import { X, Sparkles, Folder, CheckSquare, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useImageStore } from '@/stores/useImageStore'
import { useTaskStore } from '@/stores/useTaskStore'
import toast from 'react-hot-toast'
import { createTask } from '@/api/task'

interface MetadataParseModalProps {
  isOpen: boolean
  onClose: () => void
}

type ParseScope = 'selected' | 'current_album' | 'custom_albums'

export default function MetadataParseModal({ isOpen, onClose }: MetadataParseModalProps) {
  const { scheme, isDark } = useTheme()
  const { albums, currentAlbum } = useAlbumStore()
  const { selectedImages, clearSelection } = useImageStore()
  const { fetchTasks, togglePanel } = useTaskStore()
  
  const [scope, setScope] = useState<ParseScope>(
    selectedImages.length > 0 ? 'selected' : (currentAlbum ? 'current_album' : 'custom_albums')
  )
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleToggleAlbum = (albumId: string) => {
    setSelectedAlbumIds(prev => 
      prev.includes(albumId) ? prev.filter(id => id !== albumId) : [...prev, albumId]
    )
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      const payload: { imageIds?: string[], albumIds?: string[] } = {}
      let taskName = '解析元数据'
      
      if (scope === 'selected') {
        if (selectedImages.length === 0) {
          toast.error('未选中任何图片')
          return
        }
        payload.imageIds = selectedImages
        taskName = `解析 ${selectedImages.length} 张选中图片元数据`
      } else if (scope === 'current_album') {
        if (!currentAlbum) {
          toast.error('当前不在任何相册中')
          return
        }
        payload.albumIds = [currentAlbum.id]
        taskName = `解析相册 [${currentAlbum.name}] 元数据`
      } else if (scope === 'custom_albums') {
        if (selectedAlbumIds.length === 0) {
          toast.error('请至少选择一个相册')
          return
        }
        payload.albumIds = selectedAlbumIds
        taskName = `解析 ${selectedAlbumIds.length} 个相册元数据`
      }

      await createTask({
        name: taskName,
        type: 'extract_metadata',
        metadata: payload
      })

      toast.success('已添加到后台解析任务列表')
      if (scope === 'selected') clearSelection()
      fetchTasks()
      onClose()
      
      // 可以自动展开任务面板以便查看进度
      togglePanel()
    } catch (error: any) {
      toast.error('创建任务失败: ' + (error.response?.data?.message || error.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 动态玻璃遮罩背景 */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{ 
          background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(12px)'
        }}
        onClick={onClose}
      />
      
      {/* 弹窗本体 */}
      <div 
        className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ 
          background: isDark ? 'rgba(30, 30, 35, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(150%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${scheme.primary}20, ${scheme.primary}40)` }}>
              <Sparkles className="w-5 h-5" style={{ color: scheme.primary }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: scheme.textPrimary }}>解析照片元数据</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: scheme.textSecondary }} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
          <p className="text-sm" style={{ color: scheme.textSecondary }}>
            请选择需要提取元数据的范围，系统将在后台自动解析 GPS 坐标、相机参数等数据。
          </p>

          <div className="flex flex-col gap-3">
            {/* 选项 1：选中的图片 */}
            <label 
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${scope === 'selected' ? 'ring-2' : ''}`}
              style={{ 
                background: scope === 'selected' ? scheme.bgActive : scheme.bgCard,
                borderColor: scope === 'selected' ? scheme.primary : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                opacity: selectedImages.length > 0 ? 1 : 0.5
              }}
              onClick={() => selectedImages.length > 0 && setScope('selected')}
            >
              <div className="flex-1 flex items-center gap-3">
                <CheckSquare className="w-5 h-5" style={{ color: scope === 'selected' ? scheme.primary : scheme.textSecondary }} />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: scheme.textPrimary }}>解析选中的照片</h3>
                  <p className="text-xs mt-0.5" style={{ color: scheme.textTertiary }}>
                    当前选中 {selectedImages.length} 张
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${scope === 'selected' ? 'border-transparent' : 'border-gray-400'}`} style={{ background: scope === 'selected' ? scheme.primary : 'transparent' }}>
                {scope === 'selected' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </label>

            {/* 选项 2：当前相册 */}
            <label 
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${scope === 'current_album' ? 'ring-2' : ''}`}
              style={{ 
                background: scope === 'current_album' ? scheme.bgActive : scheme.bgCard,
                borderColor: scope === 'current_album' ? scheme.primary : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                opacity: currentAlbum ? 1 : 0.5
              }}
              onClick={() => currentAlbum && setScope('current_album')}
            >
              <div className="flex-1 flex items-center gap-3">
                <Folder className="w-5 h-5" style={{ color: scope === 'current_album' ? scheme.primary : scheme.textSecondary }} />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: scheme.textPrimary }}>解析当前相册全量照片</h3>
                  <p className="text-xs mt-0.5" style={{ color: scheme.textTertiary }}>
                    {currentAlbum ? `[${currentAlbum.name}]` : '当前不在具体相册下'}
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${scope === 'current_album' ? 'border-transparent' : 'border-gray-400'}`} style={{ background: scope === 'current_album' ? scheme.primary : 'transparent' }}>
                {scope === 'current_album' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </label>

            {/* 选项 3：自定义多选相册 */}
            <label 
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${scope === 'custom_albums' ? 'ring-2' : ''}`}
              style={{ 
                background: scope === 'custom_albums' ? scheme.bgActive : scheme.bgCard,
                borderColor: scope === 'custom_albums' ? scheme.primary : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              }}
              onClick={() => setScope('custom_albums')}
            >
              <div className="flex-1 flex items-center gap-3">
                <ImageIcon className="w-5 h-5" style={{ color: scope === 'custom_albums' ? scheme.primary : scheme.textSecondary }} />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: scheme.textPrimary }}>指定一个或多个相册</h3>
                  <p className="text-xs mt-0.5" style={{ color: scheme.textTertiary }}>
                    手动勾选需要处理的相册
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${scope === 'custom_albums' ? 'border-transparent' : 'border-gray-400'}`} style={{ background: scope === 'custom_albums' ? scheme.primary : 'transparent' }}>
                {scope === 'custom_albums' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </label>

            {/* 当选择了 custom_albums 时展示相册列表 */}
            {scope === 'custom_albums' && (
              <div className="mt-2 pl-4 pr-2 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-2 border-l-2" style={{ borderColor: scheme.primary }}>
                {albums.map(album => (
                  <label key={album.id} className="flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={selectedAlbumIds.includes(album.id)}
                      onChange={() => handleToggleAlbum(album.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>{album.name}</p>
                      <p className="text-xs truncate" style={{ color: scheme.textSecondary }}>
                        {album.imageCount} 张照片
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="p-5 flex justify-end gap-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ 
              color: scheme.textSecondary,
              background: 'transparent'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (scope === 'selected' && selectedImages.length === 0) || (scope === 'custom_albums' && selectedAlbumIds.length === 0)}
            className="px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
            style={{ 
              background: scheme.primary,
              color: '#ffffff',
              boxShadow: `0 8px 16px ${scheme.primary}40`
            }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? '提交中...' : '开始解析'}
          </button>
        </div>
      </div>
    </div>
  )
}
