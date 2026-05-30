import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Trash2, RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import { getTrashImages, getTrashStats, restoreImage, batchRestoreImages, permanentDeleteImage, batchPermanentDeleteImages, emptyTrash } from '@/api/image'
import { Image } from '@/types/image'
import ImageGrid from '@/components/gallery/ImageGrid'
import toast from 'react-hot-toast'

interface TrashStats {
  count: number
  totalSize: number
}

export default function TrashPage() {
  const { scheme } = useTheme()
  const [images, setImages] = useState<Image[]>([])
  const [stats, setStats] = useState<TrashStats>({ count: 0, totalSize: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  // 加载回收站数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [imagesRes, statsRes] = await Promise.all([
        getTrashImages(),
        getTrashStats()
      ])
      setImages(imagesRes.images || [])
      setStats(statsRes.data || { count: 0, totalSize: 0 })
    } catch (error) {
      console.error('Failed to load trash data:', error)
      toast.error('加载回收站数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 恢复单张图片
  const handleRestore = async (id: string) => {
    try {
      await restoreImage(id)
      toast.success('图片已恢复')
      loadData()
    } catch (error) {
      toast.error('恢复失败')
    }
  }

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedImages.length === 0) return
    try {
      await batchRestoreImages(selectedImages)
      toast.success(`已恢复 ${selectedImages.length} 张图片`)
      setSelectedImages([])
      loadData()
    } catch (error) {
      toast.error('批量恢复失败')
    }
  }

  // 永久删除单张图片
  const handlePermanentDelete = async (id: string) => {
    if (!confirm('确定要永久删除这张图片吗？此操作不可撤销。')) return
    try {
      await permanentDeleteImage(id, true)
      toast.success('图片已永久删除')
      loadData()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 批量永久删除
  const handleBatchPermanentDelete = async () => {
    if (selectedImages.length === 0) return
    if (!confirm(`确定要永久删除 ${selectedImages.length} 张图片吗？此操作不可撤销。`)) return
    try {
      await batchPermanentDeleteImages(selectedImages, true)
      toast.success(`已永久删除 ${selectedImages.length} 张图片`)
      setSelectedImages([])
      loadData()
    } catch (error) {
      toast.error('批量删除失败')
    }
  }

  // 清空回收站
  const handleEmptyTrash = async () => {
    try {
      await emptyTrash(true)
      toast.success('回收站已清空')
      setShowEmptyConfirm(false)
      loadData()
    } catch (error) {
      toast.error('清空失败')
    }
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
      </div>
    )
  }

  return (
    <div className="page-transition max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Trash2 className="w-6 h-6" />
            回收站
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            {stats.count} 张图片，占用 {formatSize(stats.totalSize)} 空间
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedImages.length > 0 && (
            <>
              <button
                onClick={handleBatchRestore}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                style={{ 
                  background: scheme.primaryLight,
                  color: scheme.primary,
                }}
              >
                <RotateCcw className="w-4 h-4" />
                恢复选中 ({selectedImages.length})
              </button>
              <button
                onClick={handleBatchPermanentDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                style={{ 
                  background: `${scheme.error}15`,
                  color: scheme.error,
                }}
              >
                <Trash2 className="w-4 h-4" />
                永久删除
              </button>
            </>
          )}
          {stats.count > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
              style={{ 
                background: `${scheme.error}15`,
                color: scheme.error,
              }}
            >
              <Trash2 className="w-4 h-4" />
              清空回收站
            </button>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      <div 
        className="flex items-center gap-3 p-4 rounded-xl mb-6"
        style={{ background: `${scheme.warning}15` }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: scheme.warning }} />
        <p className="text-sm" style={{ color: scheme.textSecondary }}>
          回收站中的图片将在 30 天后自动永久删除。您可以恢复图片或永久删除它们。
        </p>
      </div>

      {/* 图片网格 */}
      {images.length === 0 ? (
        <div 
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: scheme.bgCard }}
        >
          <Trash2 className="w-16 h-16 mb-4" style={{ color: scheme.textTertiary }} />
          <p className="text-lg font-medium" style={{ color: scheme.textSecondary }}>
            回收站是空的
          </p>
          <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>
            删除的图片会出现在这里
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map(image => (
            <div 
              key={image.id}
              className="relative group rounded-xl overflow-hidden"
              style={{ background: scheme.bgCard }}
            >
              {/* 图片预览 */}
              <div className="aspect-square relative">
                <img
                  src={image.thumbnailPath || image.path}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
                {/* 选中状态 */}
                <div 
                  className="absolute inset-0 transition-opacity duration-200"
                  style={{ 
                    background: selectedImages.includes(image.id) ? `${scheme.primary}40` : 'transparent',
                  }}
                />
                {/* 选择框 */}
                <input
                  type="checkbox"
                  checked={selectedImages.includes(image.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedImages([...selectedImages, image.id])
                    } else {
                      setSelectedImages(selectedImages.filter(id => id !== image.id))
                    }
                  }}
                  className="absolute top-2 left-2 w-5 h-5 rounded cursor-pointer"
                />
              </div>
              
              {/* 图片信息 */}
              <div className="p-3">
                <p 
                  className="text-xs truncate mb-2"
                  style={{ color: scheme.textSecondary }}
                  title={image.filename}
                >
                  {image.filename}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(image.id)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
                    style={{ 
                      background: scheme.primaryLight,
                      color: scheme.primary,
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    恢复
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(image.id)}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                    style={{ 
                      background: `${scheme.error}15`,
                      color: scheme.error,
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 清空确认对话框 */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div 
            className="w-full max-w-md p-6 rounded-2xl shadow-xl"
            style={{ background: scheme.bgCard }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: scheme.textPrimary }}>
              清空回收站
            </h3>
            <p className="text-sm mb-6" style={{ color: scheme.textSecondary }}>
              确定要永久删除回收站中的所有 {stats.count} 张图片吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ color: scheme.textSecondary }}
              >
                取消
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: scheme.error }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
