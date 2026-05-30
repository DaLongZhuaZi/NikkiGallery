import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { mapApi, GameMap, GameRegion, RegionDetectResponse } from '@/api/map'
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Layers, Loader2 } from 'lucide-react'

interface MapViewerProps {
  /** 游戏坐标 X */
  coordX?: number
  /** 游戏坐标 Y */
  coordY?: number
  /** 游戏坐标 Z */
  coordZ?: number
  /** 指定地图ID，不传则自动检测 */
  mapId?: string
  /** 关闭回调 */
  onClose?: () => void
}

/** 初始缩放比例 */
const INITIAL_ZOOM = 0.5
/** 最小/最大缩放 */
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export default function MapViewer({ coordX, coordY, coordZ, mapId: initialMapId, onClose }: MapViewerProps) {
  const { scheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  // 地图数据
  const [maps, setMaps] = useState<GameMap[]>([])
  const [regions, setRegions] = useState<GameRegion[]>([])
  const [currentMapId, setCurrentMapId] = useState<string | null>(initialMapId || null)
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null)

  // 标记位置（图片像素坐标）
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number } | null>(null)
  const [detectedRegion, setDetectedRegion] = useState<RegionDetectResponse | null>(null)

  // 交互状态
  // position 是图片左上角在容器坐标系中的偏移
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)
  const [showRegions, setShowRegions] = useState(false)

  // 容器尺寸（通过 ResizeObserver 跟踪）
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 })

  // ResizeObserver：跟踪容器尺寸变化
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        })
      }
    })
    ro.observe(el)
    // 初始化
    setContainerSize({
      width: Math.round(el.clientWidth),
      height: Math.round(el.clientHeight),
    })
    return () => ro.disconnect()
  }, [])

  // 加载地图列表
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const mapList = await mapApi.getMaps()
        setMaps(mapList)

        // 如果有坐标，自动检测区域和地图
        if (coordX !== undefined && coordY !== undefined && coordZ !== undefined) {
          const regionResult = await mapApi.detectRegion({ x: coordX, y: coordY, z: coordZ })
          setDetectedRegion(regionResult)

          // 使用检测到的地图或指定的地图
          const targetMapId = initialMapId || regionResult.mapId || mapList[0]?.id
          if (targetMapId) {
            setCurrentMapId(String(targetMapId))
            const targetMap = mapList.find(m => String(m.id) === String(targetMapId))
            if (targetMap) {
              setCurrentMap(targetMap)

              // 计算像素坐标
              const pixelResult = await mapApi.coordToPixel({
                coordX,
                coordY,
                mapId: targetMapId,
              })
              if (typeof pixelResult.pixelX === 'number' && typeof pixelResult.pixelY === 'number' &&
                  !isNaN(pixelResult.pixelX) && !isNaN(pixelResult.pixelY)) {
                setMarkerPos({ x: pixelResult.pixelX, y: pixelResult.pixelY })
              } else {
                console.warn('coordToPixel returned invalid values:', pixelResult)
              }
            }
          }
        } else {
          // 没有坐标，显示第一张地图
          if (mapList.length > 0) {
            setCurrentMapId(mapList[0].id)
            setCurrentMap(mapList[0])
          }
        }
      } catch (error) {
        console.error('Failed to load maps:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMaps()
  }, [coordX, coordY, coordZ, initialMapId])

  // 加载区域数据
  useEffect(() => {
    if (currentMapId) {
      mapApi.getRegions(currentMapId).then(setRegions).catch(console.error)
    }
  }, [currentMapId])

  // 切换地图
  const handleMapChange = useCallback(async (newMapId: string) => {
    const map = maps.find(m => String(m.id) === String(newMapId))
    if (!map) return

    setCurrentMapId(newMapId)
    setCurrentMap(map)
    setImageLoaded(false)
    setMarkerPos(null)

    // 如果有坐标，重新计算像素位置
    if (coordX !== undefined && coordY !== undefined) {
      try {
        const pixelResult = await mapApi.coordToPixel({
          coordX,
          coordY,
          mapId: newMapId,
        })
        if (typeof pixelResult.pixelX === 'number' && typeof pixelResult.pixelY === 'number' &&
            !isNaN(pixelResult.pixelX) && !isNaN(pixelResult.pixelY)) {
          setMarkerPos({ x: pixelResult.pixelX, y: pixelResult.pixelY })
        }
      } catch (error) {
        console.error('Failed to convert coordinates:', error)
      }
    }
  }, [maps, coordX, coordY])

  // 标记已定位的引用（防止重复定位）
  const positionedRef = useRef(false)
  // 当前定位所用的 markerPos key（用于检测 markerPos 是否变化）
  const positionedMarkerKeyRef = useRef<string | null>(null)

  /**
   * fitToMarker：将视图定位到标记点，使其居中并自适应缩放。
   * 可被 handleImageLoad、markerPos 变化 effect、handleReset 共用。
   */
  const fitToMarker = useCallback((marker: { x: number; y: number }, cw?: number, ch?: number) => {
    if (!imgRef.current || !currentMap) return

    const imgW = imgRef.current.naturalWidth
    const imgH = imgRef.current.naturalHeight
    const containerW = cw ?? containerSize.width
    const containerH = ch ?? containerSize.height

    if (imgW === 0 || imgH === 0 || containerW === 0 || containerH === 0) return

    // 根据真实图片尺寸计算缩放：让图片完整适应容器
    const fitZoom = Math.min(containerW / imgW, containerH / imgH) * 0.95 // 95% 容器，留点边距
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom))

    // 定位：让标记点居中
    const posX = containerW / 2 - marker.x * clampedZoom
    const posY = containerH / 2 - marker.y * clampedZoom

    setZoom(clampedZoom)
    setPosition({ x: posX, y: posY })

    console.log('Map positioned:', {
      imageSize: `${imgW}x${imgH}`,
      containerSize: `${containerW}x${containerH}`,
      marker,
      zoom: clampedZoom.toFixed(4),
      position: `(${Math.round(posX)}, ${Math.round(posY)})`,
    })
  }, [currentMap, containerSize])

  // 图片加载完成后的回调
  const handleImageLoad = useCallback(() => {
    console.log('Map image loaded:', currentMap?.assetName)
    setImageLoaded(true)

    // 记录图片自然尺寸
    if (imgRef.current) {
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      })
    }

    // 如果 markerPos 已就绪且尚未定位，立即定位
    if (markerPos && !positionedRef.current) {
      positionedRef.current = true
      positionedMarkerKeyRef.current = `${markerPos.x},${markerPos.y}`
      fitToMarker(markerPos)
    }
  }, [markerPos, currentMap, fitToMarker])

  /**
   * 关键修复：当 markerPos 异步到达时（图片已加载完毕），触发定位。
   * 这解决了图片先于 markerPos 加载完成的竞态问题。
   */
  useEffect(() => {
    if (!markerPos || !imageLoaded || !currentMap) return

    const markerKey = `${markerPos.x},${markerPos.y}`

    // 如果是同一个 marker 且已定位过，跳过
    if (positionedRef.current && positionedMarkerKeyRef.current === markerKey) return

    positionedRef.current = true
    positionedMarkerKeyRef.current = markerKey
    fitToMarker(markerPos)
  }, [markerPos, imageLoaded, currentMap, fitToMarker])

  // 切换地图时重置定位标记和图片状态
  useEffect(() => {
    positionedRef.current = false
    positionedMarkerKeyRef.current = null
    setImageLoaded(false)
    setImgNaturalSize({ width: 0, height: 0 })
  }, [currentMapId])

  // 处理缓存图片：浏览器可能在 React 附加 onLoad 之前就加载完成
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true)
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      })
    }
  }, [currentMap?.assetName])

  // 缩放控制（以容器中心为缩放焦点）
  const handleZoomAt = useCallback((newZoom: number, focalX?: number, focalY?: number) => {
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    // 默认以容器中心为焦点
    const fx = focalX ?? width / 2
    const fy = focalY ?? height / 2
    setZoom(prev => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
      if (clamped === prev) return prev
      // 缩放公式：保持焦点位置不变
      // screenPoint = imgPoint * zoom + position
      // 缩放前后 screenPoint 不变：imgPoint * oldZoom + oldPos = imgPoint * newPos + ... 
      // newPos = focalScreen - (focalScreen - oldPos) * newZoom / oldZoom
      setPosition(prevPos => ({
        x: fx - (fx - prevPos.x) * clamped / prev,
        y: fy - (fy - prevPos.y) * clamped / prev,
      }))
      return clamped
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    handleZoomAt(zoom + 0.25)
  }, [handleZoomAt, zoom])

  const handleZoomOut = useCallback(() => {
    handleZoomAt(zoom - 0.25)
  }, [handleZoomAt, zoom])

  const handleReset = useCallback(() => {
    if (markerPos && containerSize.width > 0 && containerSize.height > 0) {
      fitToMarker(markerPos, containerSize.width, containerSize.height)
    } else {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [markerPos, fitToMarker, containerSize])

  // 容器坐标转图片像素坐标
  const containerToImage = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    // 容器内坐标
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    // 反推图片像素坐标：screen = imgPixel * zoom + position
    const imgX = (cx - position.x) / zoom
    const imgY = (cy - position.y) / zoom
    if (isNaN(imgX) || isNaN(imgY)) return null
    return { x: imgX, y: imgY }
  }, [position, zoom])

  // 拖拽控制
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 滚轮缩放（以鼠标位置为焦点）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const focalX = e.clientX - rect.left
    const focalY = e.clientY - rect.top
    const delta = e.deltaY < 0 ? 0.25 : -0.25
    handleZoomAt(zoom + delta, focalX, focalY)
  }

  // 点击地图获取坐标
  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentMap || isDragging) return

    const imgCoord = containerToImage(e.clientX, e.clientY)
    if (!imgCoord) return

    // 只有在图片范围内的点击才有效
    if (imgCoord.x < 0 || imgCoord.y < 0 ||
        (currentMap.mapSize && imgCoord.x > currentMap.mapSize.width) ||
        (currentMap.mapSize && imgCoord.y > currentMap.mapSize.height)) {
      return
    }

    // 设置标记并居中
    setMarkerPos(imgCoord)

    // 反向转换为游戏坐标
    try {
      const coordResult = await mapApi.pixelToCoord({
        pixelX: imgCoord.x,
        pixelY: imgCoord.y,
        mapId: currentMap.id,
      })
      console.log('Game coordinates:', coordResult)
    } catch (error) {
      console.error('Failed to convert pixel to coord:', error)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* 工具栏 */}
      {currentMap && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: scheme.borderLight }}
        >
          <div className="flex items-center gap-3">
            {/* 地图选择 */}
            <select
              value={currentMapId || ''}
              onChange={(e) => handleMapChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 outline-none transition-colors cursor-pointer"
              style={{
                color: scheme.textPrimary,
                border: `1px solid ${scheme.borderLight}`,
              }}
            >
              {maps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>

            {/* 区域显示切换 */}
            <button
              onClick={() => setShowRegions(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                !showRegions ? 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10' : ''
              }`}
              style={{
                background: showRegions ? scheme.primaryLight : undefined,
                color: showRegions ? scheme.primary : scheme.textSecondary,
                border: `1px solid ${showRegions ? scheme.primary : scheme.borderLight}`,
              }}
            >
              <Layers className="w-4 h-4" />
              区域
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 缩放控制 */}
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: scheme.textSecondary }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[50px] text-center" style={{ color: scheme.textPrimary }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: scheme.textSecondary }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: scheme.textSecondary }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 地图容器 - 始终渲染，确保 ResizeObserver 能绑定 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden relative cursor-grab select-none"
        style={{ background: scheme.bgMain }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleMapClick}
      >
        {/* 加载中覆盖层 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: scheme.bgMain }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
          </div>
        )}

        {/* 无地图数据 */}
        {!loading && !currentMap && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4" style={{ color: scheme.textTertiary }} />
              <p style={{ color: scheme.textSecondary }}>暂无地图数据</p>
            </div>
          </div>
        )}

        {/* 诊断面板 - 临时调试 */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0,0,0,0.9)',
            color: '#00ff00',
            padding: '8px 12px',
            borderRadius: 6,
            zIndex: 9999,
            fontSize: 11,
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            lineHeight: 1.5,
            pointerEvents: 'none',
          }}
        >
{`CONTAINER: ${containerSize.width} x ${containerSize.height}
IMG NATURAL: ${imgNaturalSize.width} x ${imgNaturalSize.height}
POSITION: (${Math.round(position.x)}, ${Math.round(position.y)})
ZOOM: ${zoom.toFixed(4)}
MARKER: ${markerPos ? `(${Math.round(markerPos.x)}, ${Math.round(markerPos.y)})` : 'null'}
POSITIONED: ${positionedRef.current}
IMG: ${currentMap?.assetName || 'null'}`}
        </div>

        {/* 地图内容 - 仅在 currentMap 存在时渲染 */}
        {currentMap && (
        <>
        {/* 图片加载指示器 */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: scheme.bgCard + 'E6' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: scheme.primary }} />
              <span className="text-sm" style={{ color: scheme.textSecondary }}>加载地图中...</span>
            </div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            willChange: 'transform',
          }}
        >
          {/* 地图图片 - 不限制宽度，按原始尺寸渲染 */}
          <img
            ref={imgRef}
            src={currentMap.assetName}
            alt={currentMap.name}
            draggable={false}
            style={{
              display: 'block',
            }}
            onLoad={handleImageLoad}
            onError={(e) => {
              console.error('Map image failed to load:', currentMap.assetName)
              setImageLoaded(true)
            }}
          />

          {/* 区域覆盖层 */}
          {showRegions && regions.map(region => (
            <div
              key={region.id}
              className="absolute border-2 rounded-sm pointer-events-none"
              style={{
                borderColor: scheme.primary + '80',
                background: scheme.primary + '15',
                left: Math.min(...region.polygon.map(p => p[0])),
                top: Math.min(...region.polygon.map(p => p[1])),
                width: Math.max(...region.polygon.map(p => p[0])) - Math.min(...region.polygon.map(p => p[0])),
                height: Math.max(...region.polygon.map(p => p[1])) - Math.min(...region.polygon.map(p => p[1])),
              }}
            >
              <span
                className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: scheme.bgCard + 'E6',
                  color: scheme.textPrimary,
                }}
              >
                {region.name}
              </span>
            </div>
          ))}

          {/* 位置标记 */}
          {markerPos && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: markerPos.x,
                top: markerPos.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {/* 标记图标 */}
              <div className="relative">
                <MapPin
                  className="w-8 h-8 drop-shadow-lg"
                  style={{ color: scheme.error }}
                  fill={scheme.error}
                />
                {/* 脉冲动画 */}
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    background: scheme.error + '40',
                    transform: 'scale(0.5)',
                    transformOrigin: 'center bottom',
                  }}
                />
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* 底部信息栏 */}
      {detectedRegion && (
        <div
          className="px-4 py-3 border-t flex items-center justify-between"
          style={{ borderColor: scheme.borderLight }}
        >
          <div className="flex items-center gap-4">
            {detectedRegion.region && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: scheme.primary }} />
                <span className="text-sm" style={{ color: scheme.textPrimary }}>
                  {detectedRegion.region.name}
                </span>
              </div>
            )}
            {coordX !== undefined && coordY !== undefined && (
              <div className="text-xs" style={{ color: scheme.textTertiary }}>
                坐标: ({coordX.toFixed(1)}, {coordY.toFixed(1)}
                {coordZ !== undefined && `, ${coordZ.toFixed(1)}`})
              </div>
            )}
          </div>

          {markerPos && (
            <div className="text-xs" style={{ color: scheme.textTertiary }}>
              像素: ({Math.round(markerPos.x)}, {Math.round(markerPos.y)})
            </div>
          )}
        </div>
      )}
    </div>
  )
}
