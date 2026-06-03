import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import {
  getWardrobeDetail,
  getImages,
  setWardrobeCover,
  removeWardrobeCover,
  WardrobeItem,
} from '@/api/image'
import { useImageStore } from '@/stores/useImageStore'
import { Image } from '@/types/image'
import {
  Wand2, Loader2, ArrowRight,
  Check, RotateCcw, X, Search, ImageIcon
} from 'lucide-react'

const THUMB_URL = (id: string) => `/api/images/${id}/thumbnail?size=medium`

type ThemeScheme = ReturnType<typeof useTheme>['scheme']

// 单张衣柜卡片
function WardrobeCard({
  item, scheme, onClick, onChangeCover, onResetCover
}: {
  item: WardrobeItem
  scheme: ThemeScheme
  onClick: () => void
  onChangeCover: (e: React.MouseEvent) => void
  onResetCover: (e: React.MouseEvent) => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: scheme.bgCard,
        border: `1px solid ${scheme.borderLight}`,
        boxShadow: scheme.shadowSm,
        contentVisibility: 'auto',
        containIntrinsicSize: '0 280px',
      }}
    >
      {/* 封面图 */}
      <div className="relative aspect-square overflow-hidden" style={{ background: scheme.bgHover }}>
        {!imgError ? (
          <img
            src={THUMB_URL(item.coverImageId)}
            alt={`Clothes ${item.clothesId}`}
            className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} group-hover:scale-105`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 opacity-30" style={{ color: scheme.textTertiary }} />
          </div>
        )}

        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: scheme.textTertiary }} />
          </div>
        )}

        {/* 数量标签 */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          {item.imageCount} 张
        </div>

        {/* 自定义封标记 */}
        {item.customCoverImageId && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(236,72,153,0.8)' }}>
            <Check className="w-3 h-3 text-white" />
          </div>
        )}

        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onChangeCover}
              className="px-3 py-1.5 rounded-lg bg-white/90 text-black text-xs font-medium hover:bg-white transition-colors flex items-center gap-1.5"
              title="更换封面"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              更换封面
            </button>
            {item.customCoverImageId && (
              <button
                onClick={onResetCover}
                className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5"
                title="恢复自动封面"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                恢复默认
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 卡片底部 */}
      <div className="p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: scheme.textTertiary }}>Clothes ID</div>
          <div className="text-sm font-bold font-mono mt-0.5" style={{ color: scheme.primary }}>{item.clothesId}</div>
        </div>
        <div
          className="flex items-center gap-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ color: scheme.textSecondary }}
        >
          查看照片 <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

export default function WardrobePage() {
  const { scheme } = useTheme()
  const navigate = useNavigate()
  const { setFilter } = useImageStore()

  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // 封面选择弹窗
  const [coverModal, setCoverModal] = useState<{
    open: boolean
    clothesId: number
    autoCoverId: string
    currentCoverId: string
    photos: Image[]
    loading: boolean
  }>({ open: false, clothesId: 0, autoCoverId: '', currentCoverId: '', photos: [], loading: false })
  const [selectedCover, setSelectedCover] = useState<string | null>(null)
  const [savingCover, setSavingCover] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getWardrobeDetail()
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch wardrobe:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSelectClothes = (id: number) => {
    setFilter({ clothesId: id, page: 1, albumId: undefined })
    navigate('/gallery')
  }

  const openCoverModal = async (item: WardrobeItem, e: React.MouseEvent) => {
    e.stopPropagation()
    // autoCoverId: 自动选择的封面, currentCoverId: 当前显示的封面
    const autoCoverId = item.coverImageId // 这是后端自动选的（未来自定义覆盖后 coverImageId 会变成自定义的）
    setCoverModal({
      open: true,
      clothesId: item.clothesId,
      autoCoverId: autoCoverId,
      currentCoverId: item.coverImageId,
      photos: [],
      loading: true,
    })
    setSelectedCover(item.coverImageId)

    try {
      const res = await getImages({ clothesId: item.clothesId, page: 1, pageSize: 200 })
      setCoverModal(prev => ({ ...prev, photos: res.images, loading: false }))
    } catch {
      setCoverModal(prev => ({ ...prev, loading: false }))
    }
  }

  const closeCoverModal = () => {
    setCoverModal(prev => ({ ...prev, open: false }))
    setSelectedCover(null)
  }

  const saveCover = async () => {
    if (!selectedCover) return
    try {
      setSavingCover(true)
      await setWardrobeCover(coverModal.clothesId, selectedCover)
      setItems(prev => prev.map(it =>
        it.clothesId === coverModal.clothesId
          ? { ...it, coverImageId: selectedCover, customCoverImageId: selectedCover }
          : it
      ))
      closeCoverModal()
    } catch (error) {
      console.error('Failed to save cover:', error)
    } finally {
      setSavingCover(false)
    }
  }

  const handleResetCover = async (clothesId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await removeWardrobeCover(clothesId)
      // 重新拉取数据以获取自动封面
      const data = await getWardrobeDetail()
      setItems(data)
    } catch (error) {
      console.error('Failed to reset cover:', error)
    }
  }

  const filteredItems = items.filter(item => item.clothesId.toString().includes(search))

  return (
    <div className="page-transition max-w-7xl mx-auto pb-10">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: scheme.textPrimary }}>
            <span className="p-2 rounded-xl" style={{ background: scheme.bgHover }}>
              <Wand2 className="w-6 h-6 text-pink-500" />
            </span>
            我的衣柜
          </h1>
          <p className="text-sm mt-2" style={{ color: scheme.textSecondary }}>
            共收录 <strong>{items.length}</strong> 套服饰。点击卡片查看相关照片，悬停可更换封面。
          </p>
        </div>

        <div className="w-full md:w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: scheme.textTertiary }} />
          <input
            type="text"
            placeholder="搜索服饰 ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all duration-200 outline-none"
            style={{
              background: scheme.bgCard,
              color: scheme.textPrimary,
              border: `1px solid ${scheme.borderLight}`,
              boxShadow: scheme.shadowSm
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: scheme.primary }} />
          <p className="text-sm font-medium" style={{ color: scheme.textSecondary }}>正在整理衣柜...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: scheme.bgCard }}>
          <span className="text-4xl mb-4">👗</span>
          <h3 className="text-lg font-medium mb-2" style={{ color: scheme.textPrimary }}>衣柜空空如也</h3>
          <p className="text-sm" style={{ color: scheme.textSecondary }}>请先解析包含搭配信息的照片元数据。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map(item => (
            <WardrobeCard
              key={item.clothesId}
              item={item}
              scheme={scheme}
              onClick={() => handleSelectClothes(item.clothesId)}
              onChangeCover={(e) => openCoverModal(item, e)}
              onResetCover={(e) => handleResetCover(item.clothesId, e)}
            />
          ))}

          {filteredItems.length === 0 && search && (
            <div className="col-span-full text-center py-10 text-sm" style={{ color: scheme.textSecondary }}>
              没有找到包含 "{search}" 的服饰 ID
            </div>
          )}
        </div>
      )}

      {/* ====== 封面选择弹窗 ====== */}
      {coverModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeCoverModal}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-3xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: scheme.bgCard }}
            onClick={e => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${scheme.borderLight}` }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: scheme.textPrimary }}>
                  选择封面 — 服饰 ID {coverModal.clothesId}
                </h3>
                <p className="text-xs mt-1" style={{ color: scheme.textSecondary }}>
                  从以下照片中选择一张作为该服饰的封面图
                </p>
              </div>
              <button
                onClick={closeCoverModal}
                className="p-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: scheme.textSecondary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 照片网格 */}
            <div className="flex-1 overflow-y-auto p-6">
              {coverModal.loading ? (
                <div className="flex flex-col items-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: scheme.primary }} />
                  <p className="text-sm" style={{ color: scheme.textSecondary }}>加载照片中...</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {coverModal.photos.map(photo => {
                    const isSelected = selectedCover === photo.id
                    return (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedCover(photo.id)}
                        className="relative aspect-square rounded-xl overflow-hidden transition-all duration-200"
                        style={{
                          border: isSelected
                            ? `3px solid ${scheme.primary}`
                            : `2px solid ${scheme.borderLight}`,
                          transform: isSelected ? 'scale(0.95)' : undefined,
                        }}
                      >
                        <img
                          src={THUMB_URL(photo.id)}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: scheme.primary }}>
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${scheme.borderLight}` }}>
              <button
                onClick={closeCoverModal}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: scheme.textSecondary, background: scheme.bgHover }}
              >
                取消
              </button>
              <div className="flex items-center gap-3">
                {selectedCover && (
                  <span className="text-xs" style={{ color: scheme.textTertiary }}>
                    已选择: {selectedCover.slice(0, 8)}...
                  </span>
                )}
                <button
                  onClick={saveCover}
                  disabled={savingCover || !selectedCover}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  style={{ background: scheme.primary }}
                >
                  {savingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  确认设为封面
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
