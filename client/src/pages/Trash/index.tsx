import { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Trash2, RotateCcw, AlertCircle, Loader2, Search } from 'lucide-react'
import { getTrashImages, getTrashStats, restoreImage, batchRestoreImages, permanentDeleteImage, batchPermanentDeleteImages, emptyTrash } from '@/api/image'
import { Image } from '@/types/image'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50
const THUMB_URL = (id: string) => `/api/images/${id}/thumbnail?size=small`

interface TrashStats {
  count: number
  totalSize: number
}

export default function TrashPage() {
  const { scheme } = useTheme()
  const [images, setImages] = useState<Image[]>([])
  const [stats, setStats] = useState<TrashStats>({ count: 0, totalSize: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const observerTarget = useRef<HTMLDivElement>(null)

  // 加载首页数据
  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    try {
      const [imagesRes, statsRes] = await Promise.all([
        getTrashImages({ search: search || undefined, page: 1, pageSize: PAGE_SIZE }),
        getTrashStats()
      ])
      setImages(imagesRes.images || [])
      setTotal(imagesRes.total || 0)
      setPage(1)
      setStats(statsRes.data || { count: 0, totalSize: 0 })
      setSelectedImages([])
    } catch (error) {
      console.error('Failed to load trash data:', error)
      toast.error('加载回收站数据失败')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadFirstPage() }, [loadFirstPage])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || images.length >= total) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getTrashImages({ search: search || undefined, page: nextPage, pageSize: PAGE_SIZE })
      setImages(prev => [...prev, ...(res.images || [])])
      setPage(nextPage)
    } catch (error) {
      console.error('Failed to load more trash images:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, loading, images.length, total, page, search])

  // IntersectionObserver 无限滚动
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && images.length < total && !loading && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [images.length, total, loading, loadingMore, loadMore])

  // 恢复单张图片
  const handleRestore = async (id: string) => {
    try {
      await restoreImage(id)
      toast.success('图片已恢复')
      loadFirstPage()
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
      loadFirstPage()
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
      loadFirstPage()
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
      loadFirstPage()
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
      loadFirstPage()
    } catch (error) {
      toast.error('清空失败')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([])
    } else {
      setSelectedImages(images.map(i => i.id))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
      </div>
    )
  }

  return (
    <div className="page-transition max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Trash2 className="w-6 h-6" />
            回收站
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            {stats.count} 张图片，占用 {formatSize(stats.totalSize)} 空间
            {total > 0 && <span> · 已加载 {images.length} / {total}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* 搜索 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: scheme.textTertiary }} />
            <input
              type="text"
              placeholder="搜索文件名..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: scheme.bgCard, color: scheme.textPrimary, border: `1px solid ${scheme.borderLight}` }}
            />
          </div>
          {/* 全选 */}
          {images.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ background: scheme.bgHover, color: scheme.textSecondary }}
            >
              {selectedImages.length === images.length ? '取消全选' : `全选 (${images.length})`}
            </button>
          )}
          {selectedImages.length > 0 && (
            <>
              <button
                onClick={handleBatchRestore}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                style={{ background: scheme.primaryLight, color: scheme.primary }}
              >
                <RotateCcw className="w-4 h-4" />
                恢复 ({selectedImages.length})
              </button>
              <button
                onClick={handleBatchPermanentDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                style={{ background: `${scheme.error}15`, color: scheme.error }}
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
              style={{ background: `${scheme.error}15`, color: scheme.error }}
            >
              <Trash2 className="w-4 h-4" />
              清空回收站
            </button>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: `${scheme.warning}15` }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: scheme.warning }} />
        <p className="text-sm" style={{ color: scheme.textSecondary }}>
          回收站中的图片将在 30 天后自动永久删除。您可以恢复图片或永久删除它们。
        </p>
      </div>

      {/* 图片网格 */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ background: scheme.bgCard }}>
          <Trash2 className="w-16 h-16 mb-4" style={{ color: scheme.textTertiary }} />
          <p className="text-lg font-medium" style={{ color: scheme.textSecondary }}>回收站是空的</p>
          <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>删除的图片会出现在这里</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {images.map(image => {
              const isSelected = selectedImages.includes(image.id)
              return (
                <div
                  key={image.id}
                  className="relative group rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: scheme.bgCard, border: `1px solid ${scheme.borderLight}` }}
                >
                  {/* 图片预览 */}
                  <div className="aspect-square relative" style={{ background: scheme.bgHover }}>
                    <img
                      src={THUMB_URL(image.id)}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* 选中遮罩 */}
                    {isSelected && (
                      <div className="absolute inset-0 transition-opacity duration-200" style={{ background: `${scheme.primary}40` }} />
                    )}
                    {/* 选择框 */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(image.id)}
                      className="absolute top-2 left-2 w-5 h-5 rounded cursor-pointer z-10"
                    />
                  </div>

                  {/* 图片信息 */}
                  <div className="p-3">
                    <p className="text-xs truncate mb-2" style={{ color: scheme.textSecondary }} title={image.filename}>
                      {image.filename}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(image.id)}
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
                        style={{ background: scheme.primaryLight, color: scheme.primary }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        恢复
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(image.id)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                        style={{ background: `${scheme.error}15`, color: scheme.error }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 加载更多指示器 */}
          {images.length < total && (
            <div ref={observerTarget} className="flex justify-center p-6 mt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: scheme.primary }} />
                <span className="text-sm" style={{ color: scheme.textSecondary }}>加载更多...</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 清空确认对话框 */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-xl" style={{ background: scheme.bgCard }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: scheme.textPrimary }}>清空回收站</h3>
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
