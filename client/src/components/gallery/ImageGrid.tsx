import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Heart, Eye, Trash2, Move, Download } from 'lucide-react'
import { Image } from '@/types/image'
import { useImageStore } from '@/stores/useImageStore'
import { useTheme } from '@/contexts/ThemeContext'
import ImagePreview from './ImagePreview'
import clsx from 'clsx'

interface ImageGridProps {
  images: Image[]
  viewMode: 'grid' | 'masonry'
}

export default function ImageGrid({ images, viewMode }: ImageGridProps) {
  const { selectedImages, selectImage, toggleFavorite, loadMoreImages, total, loading } = useImageStore()
  const { scheme } = useTheme()
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; imageId: string } | null>(null)

  const openPreview = (image: Image) => {
    const idx = images.findIndex(i => i.id === image.id)
    if (idx !== -1) setPreviewIndex(idx)
  }

  const handlePreviewPrev = () => {
    setPreviewIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))
  }

  const handlePreviewNext = () => {
    setPreviewIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))
  }

  const handleContextMenu = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, imageId })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && images.length < total && !loading) {
          loadMoreImages()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [images.length, total, loading, loadMoreImages])

  if (images.length === 0) {
    return (
      <div className="empty-state">
        <ImageIcon className="w-12 h-12 mb-4" style={{ color: scheme.textTertiary }} />
        <p style={{ color: scheme.textSecondary }}>暂无图片</p>
        <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>扫描游戏相册以获取图片</p>
      </div>
    )
  }

  return (
    <>
      <div
        className={clsx(
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4'
            : 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 md:gap-4 space-y-3 md:space-y-4'
        )}
        onClick={handleCloseContextMenu}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className={clsx(
              'group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300',
              'hover:shadow-lg hover:-translate-y-0.5',
              viewMode === 'masonry' && 'break-inside-avoid'
            )}
            style={{
              backgroundColor: scheme.bgCard,
              boxShadow: scheme.shadowSm,
              animationDelay: `${Math.min(index * 30, 300)}ms`,
            }}
            onClick={() => selectImage(image.id)}
            onDoubleClick={() => openPreview(image)}
            onContextMenu={(e) => handleContextMenu(e, image.id)}
          >
            {/* 选中边框 */}
            {selectedImages.includes(image.id) && (
              <div
                className="absolute inset-0 rounded-xl z-10 pointer-events-none"
                style={{
                  border: `3px solid ${scheme.primary}`,
                  boxShadow: `0 0 0 3px ${scheme.primaryLight}`,
                }}
              />
            )}

            {/* 图片 */}
            <img
              src={`/api/images/${image.id}/thumbnail?size=small`}
              alt={image.filename}
              className={clsx(
                'w-full object-cover transition-transform duration-500 group-hover:scale-110',
                viewMode === 'grid' ? 'aspect-square' : 'h-auto'
              )}
              loading="lazy"
            />

            {/* 悬浮渐变遮罩 */}
            <div
              className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{
                background: `linear-gradient(to top, ${scheme.bgMain}99, transparent 50%)`,
              }}
            />

            {/* 悬浮操作按钮 (移动端半透明常驻) */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-1 md:group-hover:translate-y-0 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(image.id)
                }}
                className={clsx(
                  'p-1.5 rounded-full backdrop-blur-sm transition-all duration-200',
                  'hover:scale-110 active:scale-95'
                )}
                style={{
                  backgroundColor: image.favorite ? scheme.primary : scheme.glassBg,
                  color: image.favorite ? '#ffffff' : scheme.textPrimary,
                  border: `1px solid ${image.favorite ? 'transparent' : scheme.borderLight}`,
                }}
              >
                <Heart className="w-4 h-4" fill={image.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openPreview(image)
                }}
                className="p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: scheme.glassBg,
                  color: scheme.textPrimary,
                  border: `1px solid ${scheme.borderLight}`,
                }}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* 选中状态勾选 */}
            {selectedImages.includes(image.id) && (
              <div className="absolute top-2 left-2 z-10">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: scheme.primary }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}

            {/* AI处理标签 */}
            {image.aiProcessed && (
              <div className="absolute bottom-2 left-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                    color: '#ffffff',
                    boxShadow: `0 2px 8px ${scheme.gradientStart}66`,
                  }}
                >
                  AI
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 加载更多指示器 */}
      {images.length < total && (
        <div ref={observerTarget} className="flex justify-center p-6 mt-4">
          <div 
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" 
            style={{ borderColor: scheme.primary, borderTopColor: 'transparent' }} 
          />
        </div>
      )}

      {/* 图片预览 */}
      {previewIndex !== null && images[previewIndex] && (
        <ImagePreview
          image={images[previewIndex]}
          images={images}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onPrev={handlePreviewPrev}
          onNext={handlePreviewNext}
        />
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed z-50 rounded-xl py-1.5 min-w-[180px] backdrop-blur-xl animate-context-menu"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: scheme.bgCard,
              border: `1px solid ${scheme.border}`,
              boxShadow: scheme.shadowLg,
            }}
          >
            <button
              onClick={() => {
                const img = images.find(i => i.id === contextMenu.imageId)
                if (img) openPreview(img)
                handleCloseContextMenu()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
              style={{ color: scheme.textPrimary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
            <button
              onClick={() => {
                // TODO: 下载图片
                handleCloseContextMenu()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
              style={{ color: scheme.textPrimary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Download className="w-4 h-4" />
              下载
            </button>
            <button
              onClick={() => {
                // TODO: 移动图片
                handleCloseContextMenu()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
              style={{ color: scheme.textPrimary }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Move className="w-4 h-4" />
              移动到...
            </button>
            <hr className="my-1" style={{ borderColor: scheme.borderLight }} />
            <button
              onClick={() => {
                // TODO: 删除图片
                handleCloseContextMenu()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
              style={{ color: scheme.error }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${scheme.error}10`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </>
      )}
    </>
  )
}
