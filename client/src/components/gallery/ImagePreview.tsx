import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, ZoomIn, ZoomOut, Heart, Download, Share2, Tag, ChevronLeft, ChevronRight,
  RotateCcw, Info, Edit,
} from 'lucide-react'
import { Image } from '@/types/image'
import { useImageStore } from '@/stores/useImageStore'
import { useTheme } from '@/contexts/ThemeContext'
import { downloadImage } from '@/api/image'
import toast from 'react-hot-toast'
import ImageMetadata from './ImageMetadata'
import ImageEditor from '@/components/editor/ImageEditor'

interface ImagePreviewProps {
  image: Image
  images?: Image[]
  currentIndex?: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function ImagePreview({
  image,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: ImagePreviewProps) {
  const { toggleFavorite } = useImageStore()
  const { scheme } = useTheme()

  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isInfoVisible, setIsInfoVisible] = useState(true)
  const [isMetadataVisible, setIsMetadataVisible] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [previewTags, setPreviewTags] = useState<{ id: string; nameZh: string; nameEn: string }[]>([])

  // LQIP: 低分辨率占位图
  const [fullImageLoaded, setFullImageLoaded] = useState(false)
  const [currentImageId, setCurrentImageId] = useState(image.id)

  // 动画状态
  const [entering, setEntering] = useState(true)
  const [exiting, setExiting] = useState(false)
  const closingRef = useRef(false)

  // 触摸滑动状态
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const hasPrev = !!onPrev && (currentIndex ?? 0) > 0
  const hasNext = !!onNext && currentIndex !== undefined && images !== undefined && currentIndex < images.length - 1

  // 进入动画
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntering(false))
    return () => cancelAnimationFrame(raf)
  }, [])

  // 图片切换时重置 LQIP 状态
  useEffect(() => {
    if (image.id !== currentImageId) {
      setFullImageLoaded(false)
      setCurrentImageId(image.id)
    }
  }, [image.id, currentImageId])

  // 预加载前后各 1 张图的原图
  useEffect(() => {
    const preloadUrls: string[] = []
    if (images && currentIndex !== undefined) {
      if (currentIndex > 0) preloadUrls.push(`/api/images/${images[currentIndex - 1].id}/file`)
      if (currentIndex < images.length - 1) preloadUrls.push(`/api/images/${images[currentIndex + 1].id}/file`)
    }
    const linkElements = preloadUrls.map(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      document.head.appendChild(link)
      return link
    })
    return () => { linkElements.forEach(el => document.head.removeChild(el)) }
  }, [images, currentIndex])

  // 加载标签
  useEffect(() => {
    setPreviewTags([])
    fetch(`/api/images/${image.id}/tags`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) setPreviewTags(res.data)
      })
      .catch(console.error)
  }, [image.id])

  // 关闭动画
  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setExiting(true)
    setTimeout(() => onClose(), 280)
  }, [onClose])

  // 导航时重置缩放和位置
  const navigateTo = useCallback((dir: 'prev' | 'next') => {
    if (dir === 'prev' && hasPrev) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
      onPrev!()
    } else if (dir === 'next' && hasNext) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
      onNext!()
    }
  }, [hasPrev, hasNext, onPrev, onNext])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditorOpen) setIsEditorOpen(false)
        else handleClose()
        return
      }
      if (isEditorOpen) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          navigateTo('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateTo('next')
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleReset()
          break
        case 'i':
          setIsInfoVisible(prev => !prev)
          break
        case 'm':
          setIsMetadataVisible(prev => !prev)
          break
        case 'e':
          setIsEditorOpen(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isEditorOpen, navigateTo])

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.25, 5)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.25, 0.25)), [])
  const handleReset = useCallback(() => { setZoom(1); setPosition({ x: 0, y: 0 }) }, [])

  // 鼠标拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setIsDragging(false)

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.deltaY < 0 ? handleZoomIn() : handleZoomOut()
  }

  // 触摸事件（移动端滑动导航）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom > 1 || !touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    // 水平滑动判定：水平距离 > 垂直距离，距离 > 50px，时间 < 500ms
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50 && dt < 500) {
      if (dx < 0 && hasNext) navigateTo('next')
      else if (dx > 0 && hasPrev) navigateTo('prev')
    }
  }

  const handleDownload = async () => {
    try { await downloadImage(image.id); toast.success('开始下载') }
    catch { toast.error('下载失败') }
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/api/images/${image.id}/file`
      if (navigator.share) await navigator.share({ title: image.filename, url })
      else { await navigator.clipboard.writeText(url); toast.success('链接已复制') }
    } catch { toast.error('分享失败') }
  }

  // 动态样式
  const overlayStyle: React.CSSProperties = {
    backgroundColor: entering || exiting ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.92)',
    backdropFilter: entering || exiting ? 'blur(0px)' : 'blur(8px)',
    transition: 'all 280ms cubic-bezier(0.4,0,0.2,1)',
  }

  const imageStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
    opacity: entering || exiting ? 0 : 1,
    transition: isDragging ? 'none' : 'opacity 250ms ease, transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    filter: entering || exiting ? 'blur(10px)' : 'blur(0)',
  }

  const panelBase: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(16px) saturate(150%)',
    WebkitBackdropFilter: 'blur(16px) saturate(150%)',
    border: `1px solid ${scheme.borderLight}40`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  }

  const btnHover = (e: React.MouseEvent<HTMLButtonElement>, bg = 'rgba(255,255,255,0.15)') =>
    (e.currentTarget.style.backgroundColor = bg)
  const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.backgroundColor = 'transparent')

  return (
    <div className="fixed inset-0 z-50" style={overlayStyle} onClick={handleClose}>
      {/* 顶部工具栏 */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3"
        style={{ opacity: exiting ? 0 : 1, transition: 'opacity 200ms' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 左侧：文件名 (移动端隐藏) */}
        <div className="hidden sm:block text-white/60 text-sm truncate max-w-[30%] ml-12">
          {image.filename}
        </div>

        {/* 中间：工具按钮 */}
        <div
          className="flex flex-wrap justify-center items-center gap-0.5 sm:gap-1 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 mx-auto"
          style={{ ...panelBase, border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <button onClick={e => { e.stopPropagation(); handleZoomOut() }} className="p-1.5 rounded-lg text-white" onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-xs sm:text-sm min-w-[40px] text-center font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={e => { e.stopPropagation(); handleZoomIn() }} className="p-1.5 rounded-lg text-white" onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); handleReset() }} className="p-1.5 rounded-lg text-white" onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 mx-1 hidden sm:block" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <button onClick={e => { e.stopPropagation(); toggleFavorite(image.id) }} className="p-1.5 rounded-lg" style={{ color: image.favorite ? scheme.primary : '#fff' }} onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Heart className="w-4 h-4" fill={image.favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={e => { e.stopPropagation(); handleDownload() }} className="p-1.5 rounded-lg text-white" onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Download className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIsEditorOpen(true) }} className="p-1.5 rounded-lg hidden sm:block" style={{ color: isEditorOpen ? scheme.primary : '#fff' }} onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); handleShare() }} className="p-1.5 rounded-lg text-white" onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIsInfoVisible(p => !p) }} className="p-1.5 rounded-lg" style={{ color: isInfoVisible ? scheme.primary : '#fff' }} onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Tag className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIsMetadataVisible(p => !p) }} className="p-1.5 rounded-lg hidden sm:block" style={{ color: isMetadataVisible ? scheme.primary : '#fff' }} onMouseEnter={e => btnHover(e)} onMouseLeave={btnLeave}>
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* 右侧：关闭按钮 */}
        <button
          onClick={handleClose}
          className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors mr-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 图片容器 */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        {/* LQIP: 低分辨率占位图（先显示，原图加载后淡出） */}
        {!fullImageLoaded && (
          <img
            src={`/api/images/${image.id}/thumbnail?size=large`}
            alt=""
            className="absolute max-w-full max-h-full object-contain select-none"
            style={{ ...imageStyle, filter: 'blur(20px)', transform: `${imageStyle.transform} scale(1.05)` }}
            draggable={false}
          />
        )}
        {/* 原图 */}
        <img
          src={`/api/images/${image.id}/file`}
          alt={image.filename}
          className="max-w-full max-h-full object-contain select-none"
          style={{ ...imageStyle, opacity: fullImageLoaded ? (imageStyle.opacity ?? 1) : 0, transition: 'opacity 300ms ease' }}
          draggable={false}
          onLoad={() => setFullImageLoaded(true)}
        />
      </div>

      {/* 左箭头 */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); navigateTo('prev') }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ opacity: exiting ? 0 : 1 }}
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* 右箭头 */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); navigateTo('next') }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ opacity: exiting ? 0 : 1 }}
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* 底部信息栏 */}
      {isInfoVisible && (
        <div
          className="absolute bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto z-20 sm:rounded-xl p-3 sm:p-4 sm:max-w-sm"
          style={{ ...panelBase, opacity: exiting ? 0 : 1, transition: 'opacity 200ms' }}
          onClick={e => e.stopPropagation()}
        >
          {/* 移动端：文件名 */}
          <p className="font-medium text-white text-sm sm:text-base truncate sm:hidden mb-1">{image.filename}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-white/70">
            <span>{image.width} × {image.height}</span>
            <span>{(image.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <span className="hidden sm:inline">{new Date(image.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>

          {/* 导航指示器 */}
          {images && images.length > 1 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-white/40">{(currentIndex ?? 0) + 1} / {images.length}</span>
              <div className="flex gap-0.5">
                {images.slice(
                  Math.max(0, (currentIndex ?? 0) - 3),
                  Math.min(images.length, (currentIndex ?? 0) + 4)
                ).map((img, i) => {
                  const idx = Math.max(0, (currentIndex ?? 0) - 3) + i
                  return (
                    <div
                      key={img.id}
                      className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                        transform: idx === currentIndex ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI标签 */}
      {isInfoVisible && previewTags.length > 0 && (
        <div
          className="absolute bottom-16 sm:bottom-20 left-0 right-0 sm:left-4 sm:right-auto z-20 sm:rounded-xl p-3 sm:p-4 sm:max-w-xs max-h-[25vh] sm:max-h-none overflow-y-auto"
          style={{ ...panelBase, opacity: exiting ? 0 : 1, transition: 'opacity 200ms' }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs mb-2 text-white/50">AI标签</p>
          <div className="flex flex-wrap gap-1.5">
            {previewTags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}44, ${scheme.gradientEnd}44)`,
                  color: '#fff',
                  border: `1px solid ${scheme.gradientStart}33`,
                }}
              >
                {tag.nameZh || tag.nameEn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 元数据面板 */}
      {isMetadataVisible && (
        <div
          className="absolute top-14 sm:top-16 right-2 left-2 sm:left-auto sm:right-4 sm:w-80 max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl z-30 shadow-2xl"
          style={{ ...panelBase, backgroundColor: 'rgba(0,0,0,0.8)', opacity: exiting ? 0 : 1, transition: 'opacity 200ms' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm sm:text-base">元数据信息</h3>
              <button onClick={() => setIsMetadataVisible(false)} className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ImageMetadata imageId={image.id} />
          </div>
        </div>
      )}

      {/* 键盘快捷键提示 (PC) */}
      <div
        className="absolute bottom-4 right-4 text-xs z-20 px-3 py-1.5 rounded-full hidden sm:block"
        style={{ color: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.3)', opacity: exiting ? 0 : 1 }}
      >
        ← → 切换 · Esc 关闭 · +/- 缩放 · 0 重置 · I 信息 · M 元数据 · E 编辑
      </div>

      {/* 图片编辑器 */}
      {isEditorOpen && (
        <ImageEditor
          imageUrl={`/api/images/${image.id}/download`}
          imageId={image.id}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  )
}
