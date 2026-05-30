import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useImageStore } from '@/stores/useImageStore'
import { useTheme } from '@/contexts/ThemeContext'
import AlbumList from './AlbumList'
import ImageGrid from '@/components/gallery/ImageGrid'
import BatchActions from '@/components/gallery/BatchActions'
import TagFilter from '@/components/gallery/TagFilter'
import { LayoutGrid, Rows } from 'lucide-react'

export default function GalleryPage() {
  const { albumId } = useParams()
  const { scheme } = useTheme()
  const { albums, fetchAlbums, currentAlbum, selectAlbum } = useAlbumStore()
  const { images, fetchImages, selectedImages, clearSelection, filter, setFilter } = useImageStore()
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')

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
    </div>
  )
}
