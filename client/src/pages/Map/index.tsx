import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import MapViewer, { MapMarker } from '@/components/map/MapViewer'
import { Map, MapPin, Navigation, Loader2 } from 'lucide-react'
import { getImages, batchGetThumbnailUrls } from '@/api/image'
import { mapApi, GameMap } from '@/api/map'
import { Image as GalleryImage } from '@/types/image'
import ImagePreview from '@/components/gallery/ImagePreview'

export default function MapPage() {
  const { scheme } = useTheme()
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [maps, setMaps] = useState<GameMap[]>([])
  const [currentMapId, setCurrentMapId] = useState<string>('1')
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null)
  
  // 仅保留测试定位状态
  const [coordX, setCoordX] = useState<string>('')
  const [coordY, setCoordY] = useState<string>('')
  const [coordZ, setCoordZ] = useState<string>('')
  const [testCoords, setTestCoords] = useState<{ x: number; y: number; z?: number } | null>(null)
  const [showTestPanel, setShowTestPanel] = useState(false)

  useEffect(() => {
    let mounted = true
    const CACHE_KEY = 'map_markers_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 分钟缓存
    
    const loadMapData = async () => {
      try {
        setLoading(true)

        // 尝试读取 sessionStorage 缓存
        try {
          const cached = sessionStorage.getItem(CACHE_KEY)
          if (cached) {
            const { data, timestamp } = JSON.parse(cached)
            if (Date.now() - timestamp < CACHE_TTL && data.markers && data.maps) {
              if (mounted) {
                setMarkers(data.markers)
                setMaps(data.maps)
                setImages(data.images || [])
                if (data.maps.length > 0) setCurrentMapId(data.maps[0].id)
                setLoading(false)
              }
              return
            }
          }
        } catch { /* 缓存读取失败，继续正常加载 */ }

        // 获取所有带有坐标的图片
        const res = await getImages({ hasCoords: true, pageSize: 9999 })
        if (!mounted) return
        
        const imgs = res.images
        setImages(imgs)

        // 提取游戏坐标
        const coordsToConvert: { coordX: number; coordY: number; coordZ?: number; id: string }[] = []
        
        imgs.forEach(img => {
          if (img.cameraParams) {
            try {
              const params = JSON.parse(img.cameraParams)
              if (typeof params.positionX === 'number' && typeof params.positionZ === 'number') {
                coordsToConvert.push({
                  id: img.id,
                  coordX: params.positionX,
                  coordY: params.positionZ,
                  coordZ: params.positionY
                })
              }
            } catch (e) {
              console.error('Failed to parse cameraParams for image', img.id)
            }
          }
        })

        if (coordsToConvert.length === 0) {
          setMarkers([])
          setLoading(false)
          return
        }

        // 并行加载地图数据 + 批量坐标转换
        const [loadedMaps, pixelResults] = await Promise.all([
          mapApi.getMaps().catch(e => { console.error('Failed to load maps:', e); return [] as GameMap[] }),
          mapApi.batchCoordToPixel({ coords: coordsToConvert })
        ])

        if (!mounted) return
        if (loadedMaps.length > 0) {
          setMaps(loadedMaps)
          setCurrentMapId(loadedMaps[0].id)
        }

        // 批量获取缩略图 URL（替代逐张 blob 请求）
        const validIds = coordsToConvert
          .filter((_, i) => pixelResults[i])
          .map(c => c.id)
        const thumbnailUrls = validIds.length > 0
          ? await batchGetThumbnailUrls(validIds).catch(() => ({} as Record<string, string>))
          : {}

        // 组装 Marker
        const newMarkers: MapMarker[] = []
        for (let index = 0; index < coordsToConvert.length; index++) {
          const c = coordsToConvert[index]
          const px = pixelResults[index]
          if (px) {
            const imgInfo = imgs.find(i => i.id === c.id)
            newMarkers.push({
              id: c.id,
              x: px.pixelX,
              y: px.pixelY,
              mapId: px.mapId,
              imageUrl: thumbnailUrls[c.id] || '',
              title: imgInfo?.filename || '未知图片',
            })
          }
        }

        if (mounted) {
          setMarkers(newMarkers)

          // 写入 sessionStorage 缓存
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              data: { markers: newMarkers, maps: loadedMaps, images: imgs },
              timestamp: Date.now()
            }))
          } catch { /* 存储配额不足时静默失败 */ }
        }
      } catch (error) {
        console.error('Failed to load map markers:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadMapData()

    return () => {
      mounted = false
    }
  }, [])

  const handleTestLocate = () => {
    const x = parseFloat(coordX)
    const heightY = parseFloat(coordY)
    const horizontalZ = parseFloat(coordZ)
    if (!isNaN(x) && !isNaN(horizontalZ)) {
      // 在 UE 中，Z 轴对应水平坐标，Y 轴对应高度
      setTestCoords({ x, y: horizontalZ, z: isNaN(heightY) ? undefined : heightY })
    }
  }

  const handleMarkerClick = (marker: MapMarker) => {
    const img = images.find(i => i.id === marker.id)
    if (img) {
      setPreviewImage(img)
    }
  }

  return (
    <div className="page-transition h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Map className="w-6 h-6" />
            世界足迹
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            已在所有地图上发现 {markers.length} 张照片的位置
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 地图切换下拉框 */}
          {maps.length > 0 && (
            <select
              value={currentMapId}
              onChange={(e) => setCurrentMapId(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none"
              style={{
                background: scheme.bgCard,
                color: scheme.textPrimary,
                border: `1px solid ${scheme.borderLight}`,
              }}
            >
              {maps.map((m) => {
                const count = markers.filter(marker => marker.mapId === String(m.id)).length
                return (
                  <option key={m.id} value={String(m.id)}>
                    {m.name === 'miraland' ? '大世界' : 
                     m.name === 'firework_isles' ? '花焰群岛' :
                     m.name === 'serenity_island' ? '无忧岛' :
                     m.name === 'danqing_island' ? '丹青屿' :
                     m.name === 'danqing_realm' ? '丹青之境' :
                     m.name === 'wanxiang_realm' ? '万相境' : m.name} 
                    ({count})
                  </option>
                )
              })}
            </select>
          )}

          <button
          onClick={() => setShowTestPanel(!showTestPanel)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
          style={{
            background: showTestPanel ? scheme.bgActive : scheme.bgHover,
            color: showTestPanel ? scheme.primary : scheme.textSecondary,
          }}
        >
          <Navigation className="w-4 h-4" />
          测试坐标
        </button>
        </div>
      </div>

      {/* 坐标输入面板 (可折叠) */}
      {showTestPanel && (
        <div className="p-4 rounded-xl mb-4 shrink-0 animate-in fade-in slide-in-from-top-2" style={{ background: scheme.bgCard, border: `1px solid ${scheme.borderLight}` }}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>X 坐标</label>
              <input type="number" value={coordX} onChange={(e) => setCoordX(e.target.value)} placeholder="X" className="px-3 py-2 rounded-lg text-sm w-28" style={{ background: scheme.bgHover, color: scheme.textPrimary, border: `1px solid ${scheme.borderLight}` }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>Y 坐标（高度）</label>
              <input type="number" value={coordY} onChange={(e) => setCoordY(e.target.value)} placeholder="Y" className="px-3 py-2 rounded-lg text-sm w-28" style={{ background: scheme.bgHover, color: scheme.textPrimary, border: `1px solid ${scheme.borderLight}` }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>Z 坐标</label>
              <input type="number" value={coordZ} onChange={(e) => setCoordZ(e.target.value)} placeholder="Z" className="px-3 py-2 rounded-lg text-sm w-28" style={{ background: scheme.bgHover, color: scheme.textPrimary, border: `1px solid ${scheme.borderLight}` }} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleTestLocate} className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5" style={{ background: scheme.primary, color: '#ffffff' }}>
                <MapPin className="w-4 h-4" />
                定位
              </button>
              <button onClick={() => setTestCoords(null)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200" style={{ background: scheme.bgHover, color: scheme.textSecondary }}>
                清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地图查看器 */}
      <div className="rounded-xl overflow-hidden border flex-1 relative min-h-[500px]" style={{ borderColor: scheme.borderLight }}>
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: scheme.bgCard + 'CC', backdropFilter: 'blur(4px)' }}>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
              <span className="text-sm font-medium" style={{ color: scheme.textPrimary }}>正在加载世界足迹...</span>
            </div>
          </div>
        )}
        <MapViewer
          mapId={currentMapId}
          coordX={testCoords?.x}
          coordY={testCoords?.y}
          coordZ={testCoords?.z}
          markers={markers.filter(m => m.mapId === currentMapId || (!m.mapId && currentMapId === '1'))}
          onMarkerClick={handleMarkerClick}
          allowClickToMark={false}
        />
      </div>

      {/* 照片预览 */}
      {previewImage && (
        <ImagePreview
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}
