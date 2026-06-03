import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useImageStore } from '@/stores/useImageStore'
import { useTheme } from '@/contexts/ThemeContext'
import AlbumList from './AlbumList'
import ImageGrid from '@/components/gallery/ImageGrid'
import BatchActions from '@/components/gallery/BatchActions'
import TagFilter from '@/components/gallery/TagFilter'
import MetadataParseModal from '@/components/gallery/MetadataParseModal'
import { LayoutGrid, Rows, Sparkles, Gamepad2, Folder, Image } from 'lucide-react'

export default function GalleryPage() {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const { scheme } = useTheme()
  const { albums, fetchAlbums, currentAlbum, selectAlbum } = useAlbumStore()
  const { images, fetchImages, selectedImages, clearSelection, filter, setFilter } = useImageStore()
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')
  const [isParseModalOpen, setIsParseModalOpen] = useState(false)
  const albumStripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAlbums()
  }, [fetchAlbums])

  useEffect(() => {
    if (albumId) {
      selectAlbum(albumId)
      fetchImages(albumId)
    } else {
      fetchImages()
    }
  }, [albumId, selectAlbum, fetchImages])

  // 移动端：自动将当前选中的相册滚动到可视区域
  useEffect(() => {
    if (!albumStripRef.current) return
    const active = albumStripRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [albumId, albums])

  return (
    <div className="page-transition max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: scheme.textPrimary }}>
            {currentAlbum ? currentAlbum.name : '全部相册'}
          </h1>
          {currentAlbum && (
            <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
              {currentAlbum.description || currentAlbum.path}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 解析元数据按钮 */}
          <button
            onClick={() => setIsParseModalOpen(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5"
            style={{ 
              background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.primary}DD)`,
              color: '#fff',
              boxShadow: `0 4px 12px ${scheme.primary}40`,
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">解析元数据</span>
          </button>

          {/* 排序切换 */}
          <div className="flex rounded-xl p-1" style={{ background: scheme.bgHover }}>
            <select
              value={`${filter.sortBy}-${filter.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                setFilter({ sortBy: sortBy as any, sortOrder: sortOrder as 'asc'|'desc', page: 1 })
              }}
              className="px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer"
              style={{
                background: scheme.bgCard,
                color: scheme.textPrimary,
                boxShadow: scheme.shadowSm,
                border: `1px solid ${scheme.borderLight}`,
              }}
            >
              <option value="createdAt-desc">最新创建</option>
              <option value="createdAt-asc">最早创建</option>
              <option value="fileSize-desc">文件最大</option>
              <option value="fileSize-asc">文件最小</option>
              <option value="filename-asc">名称 A-Z</option>
              <option value="filename-desc">名称 Z-A</option>
            </select>
          </div>

          {/* 视图切换 */}
          <div 
            className="flex rounded-xl p-1"
            style={{ background: scheme.bgHover }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
              style={{ 
                background: viewMode === 'grid' ? scheme.bgCard : 'transparent',
                color: viewMode === 'grid' ? scheme.textPrimary : scheme.textSecondary,
                boxShadow: viewMode === 'grid' ? scheme.shadowSm : 'none',
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">网格</span>
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
              style={{ 
                background: viewMode === 'masonry' ? scheme.bgCard : 'transparent',
                color: viewMode === 'masonry' ? scheme.textPrimary : scheme.textSecondary,
                boxShadow: viewMode === 'masonry' ? scheme.shadowSm : 'none',
              }}
            >
              <Rows className="w-4 h-4" />
              <span className="hidden sm:inline">瀑布流</span>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端：横向可滚动相册选择器 */}
      <div
        ref={albumStripRef}
        className="md:hidden hide-scrollbar flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 全部图片 */}
        <button
          data-active={!albumId ? 'true' : 'false'}
          onClick={() => navigate('/gallery')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: !albumId ? scheme.primary : scheme.bgCard,
            color: !albumId ? '#ffffff' : scheme.textSecondary,
            border: `1px solid ${!albumId ? scheme.primary : scheme.borderLight}`,
            boxShadow: !albumId ? `0 2px 8px ${scheme.primary}40` : scheme.shadowSm,
          }}
        >
          <Image className="w-3.5 h-3.5" />
          <span>全部</span>
        </button>

        {/* 各个相册 */}
        {albums.map(album => {
          const isActive = albumId === album.id
          return (
            <button
              key={album.id}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => navigate(`/gallery/${album.id}`)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? scheme.primary : scheme.bgCard,
                color: isActive ? '#ffffff' : scheme.textSecondary,
                border: `1px solid ${isActive ? scheme.primary : scheme.borderLight}`,
                boxShadow: isActive ? `0 2px 8px ${scheme.primary}40` : scheme.shadowSm,
              }}
            >
              {album.type === 'game'
                ? <Gamepad2 className="w-3.5 h-3.5" />
                : <Folder className="w-3.5 h-3.5" />
              }
              <span className="max-w-24 truncate">{album.name}</span>
              <span
                className="text-xs px-1 py-0 rounded-full"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : scheme.bgHover,
                  color: isActive ? '#ffffff' : scheme.textTertiary,
                }}
              >
                {album.imageCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* 服饰筛选标签 */}
      {filter.clothesId && (
        <div className="mb-6 flex items-center">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ 
              background: `linear-gradient(135deg, ${scheme.gradientStart}20, ${scheme.gradientEnd}20)`,
              color: scheme.primary,
              border: `1px solid ${scheme.gradientStart}30`,
            }}
          >
            <span>已筛选服饰 ID: <span className="font-mono font-bold">{filter.clothesId}</span></span>
            <button
              onClick={() => setFilter({ clothesId: undefined, page: 1 })}
              className="ml-1 p-0.5 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 标签筛选 */}
      <TagFilter />

      {/* 批量操作 */}
      {selectedImages.length > 0 && (
        <BatchActions
          selectedCount={selectedImages.length}
          onClearSelection={clearSelection}
        />
      )}

      {/* 主内容区域 */}
      <div className="flex gap-6">
        {/* 相册列表（侧边栏） */}
        <div className="w-56 lg:w-64 flex-shrink-0 hidden md:block">
          <AlbumList albums={albums} currentAlbumId={albumId} />
        </div>

        {/* 图片网格 */}
        <div className="flex-1 min-w-0">
          <ImageGrid images={images} viewMode={viewMode} />
        </div>
      </div>

      {/* 元数据解析弹窗 */}
      <MetadataParseModal 
        isOpen={isParseModalOpen} 
        onClose={() => setIsParseModalOpen(false)} 
      />
    </div>
  )
}
