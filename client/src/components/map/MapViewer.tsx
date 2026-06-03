import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { mapApi, GameMap, GameRegion, RegionDetectResponse } from '@/api/map'
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Layers, Loader2 } from 'lucide-react'

export interface MapMarker {
  id: string
  x: number
  y: number
  imageUrl?: string
  image?: any
  title?: string
  mapId?: string
}

interface MapViewerProps {
  coordX?: number
  coordY?: number
  coordZ?: number
  mapId?: string
  markers?: MapMarker[]
  allowClickToMark?: boolean
  onMarkerClick?: (marker: MapMarker) => void
  onClose?: () => void
}

const INITIAL_ZOOM = 1
const MIN_ZOOM = 0.02
const MAX_ZOOM = 5

export default function MapViewer({ coordX, coordY, coordZ, mapId: initialMapId, markers = [], onMarkerClick, allowClickToMark = false, onClose }: MapViewerProps) {
  const { scheme, isDark } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  // 地图数据
  const [maps, setMaps] = useState<GameMap[]>([])
  const [regions, setRegions] = useState<GameRegion[]>([])
  const [currentMapId, setCurrentMapId] = useState<string | null>(initialMapId || null)
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null)
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number } | null>(null)
  const [detectedRegion, setDetectedRegion] = useState<RegionDetectResponse | null>(null)

  // 交互状态
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)
  const [showRegions, setShowRegions] = useState(false)

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 })

  // ========== 性能优化核心：Refs 用于零开销读取 ==========
  const posRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(INITIAL_ZOOM)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const markerPosRef = useRef<{ x: number; y: number } | null>(null)
  const scaleXRef = useRef(1)
  const scaleYRef = useRef(1)
  const applyZoomRef = useRef<(factor: number, mx?: number, my?: number) => void>(() => {})

  // 触屏状态
  const touchRef = useRef({
    startX: 0, startY: 0,
    startDist: 0, startZoom: 1,
    isPinching: false,
  })

  // 同步 ref ← state
  useEffect(() => { posRef.current = position }, [position])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { markerPosRef.current = markerPos }, [markerPos])

  // ========== ResizeObserver ==========
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
    setContainerSize({
      width: Math.round(el.clientWidth),
      height: Math.round(el.clientHeight),
    })
    return () => ro.disconnect()
  }, [])

  // ========== 加载地图列表 ==========
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const mapList = await mapApi.getMaps()
        setMaps(mapList)

        if (coordX !== undefined && coordY !== undefined && coordZ !== undefined) {
          const regionResult = await mapApi.detectRegion({ x: coordX, y: coordY, z: coordZ })
          setDetectedRegion(regionResult)
          const targetMapId = initialMapId || regionResult.mapId || mapList[0]?.id
          if (targetMapId) {
            setCurrentMapId(String(targetMapId))
            const targetMap = mapList.find(m => String(m.id) === String(targetMapId))
            if (targetMap) {
              setCurrentMap(targetMap)
              const pixelResult = await mapApi.coordToPixel({ coordX, coordY, mapId: targetMapId })
              if (typeof pixelResult.pixelX === 'number' && typeof pixelResult.pixelY === 'number' &&
                  !isNaN(pixelResult.pixelX) && !isNaN(pixelResult.pixelY)) {
                setMarkerPos({ x: pixelResult.pixelX, y: pixelResult.pixelY })
              }
            }
          }
        } else {
          const targetMapId = initialMapId || (mapList.length > 0 ? mapList[0].id : null)
          if (targetMapId) {
            setCurrentMapId(String(targetMapId))
            const targetMap = mapList.find(m => String(m.id) === String(targetMapId))
            if (targetMap) setCurrentMap(targetMap)
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

  useEffect(() => {
    if (currentMapId) {
      mapApi.getRegions(currentMapId).then(setRegions).catch(console.error)
    }
  }, [currentMapId])

  // ========== 切换地图 ==========
  const handleMapChange = useCallback(async (newMapId: string) => {
    const map = maps.find(m => String(m.id) === String(newMapId))
    if (!map) return
    setCurrentMapId(newMapId)
    setCurrentMap(map)
    setImageLoaded(false)
    setMarkerPos(null)
    if (coordX !== undefined && coordY !== undefined) {
      try {
        const pixelResult = await mapApi.coordToPixel({ coordX, coordY, mapId: newMapId })
        if (typeof pixelResult.pixelX === 'number' && typeof pixelResult.pixelY === 'number' &&
            !isNaN(pixelResult.pixelX) && !isNaN(pixelResult.pixelY)) {
          setMarkerPos({ x: pixelResult.pixelX, y: pixelResult.pixelY })
        }
      } catch (error) {
        console.error('Failed to convert coordinates:', error)
      }
    }
  }, [maps, coordX, coordY])

  const positionedRef = useRef(false)
  const positionedMarkerKeyRef = useRef<string | null>(null)

  // ========== 图片缩放比例 ==========
  const scaleX = (imgNaturalSize.width > 0 && currentMap?.mapSize?.width) ? imgNaturalSize.width / currentMap.mapSize.width : 1
  const scaleY = (imgNaturalSize.height > 0 && currentMap?.mapSize?.height) ? imgNaturalSize.height / currentMap.mapSize.height : 1
  useEffect(() => { scaleXRef.current = scaleX }, [scaleX])
  useEffect(() => { scaleYRef.current = scaleY }, [scaleY])

  // ========== 性能关键：缓存 inverseZoom ==========
  const inverseZoom = useMemo(() => (zoom > 0 ? 1 / zoom : 1), [zoom])

  // ========== fitToMarker ==========
  const fitToMarker = useCallback((marker: { x: number; y: number }, cw?: number, ch?: number) => {
    if (!imgRef.current || !currentMap) return
    const imgW = imgRef.current.naturalWidth
    const imgH = imgRef.current.naturalHeight
    const containerW = cw ?? containerSize.width
    const containerH = ch ?? containerSize.height
    if (imgW === 0 || imgH === 0 || containerW === 0 || containerH === 0) return

    const clampedZoom = 1.0
    const posX = containerW / 2 - (marker.x * scaleX) * clampedZoom
    const posY = containerH / 2 - (marker.y * scaleY) * clampedZoom

    zoomRef.current = clampedZoom
    posRef.current = { x: posX, y: posY }
    setZoom(clampedZoom)
    setPosition({ x: posX, y: posY })
  }, [currentMap, containerSize, scaleX, scaleY])

  // ========== 图片加载完成 ==========
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    if (imgRef.current) {
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      })
    }
    if (!positionedRef.current) {
      positionedRef.current = true
      if (markerPos) {
        positionedMarkerKeyRef.current = `${markerPos.x},${markerPos.y}`
        fitToMarker(markerPos)
      } else {
        if (imgRef.current && containerRef.current) {
          const imgW = imgRef.current.naturalWidth
          const imgH = imgRef.current.naturalHeight
          const cw = containerRef.current.clientWidth
          const ch = containerRef.current.clientHeight
          const baseZoom = Math.min(cw / imgW, ch / imgH) * 0.9
          const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseZoom))
          const newPos = {
            x: cw / 2 - (imgW / 2) * clampedZoom,
            y: ch / 2 - (imgH / 2) * clampedZoom,
          }
          zoomRef.current = clampedZoom
          posRef.current = newPos
          setZoom(clampedZoom)
          setPosition(newPos)
        }
      }
    }
  }, [markerPos, currentMap, fitToMarker])

  // markerPos 异步到达时触发定位
  useEffect(() => {
    if (!markerPos || !imageLoaded || !currentMap) return
    const markerKey = `${markerPos.x},${markerPos.y}`
    if (positionedRef.current && positionedMarkerKeyRef.current === markerKey) return
    positionedRef.current = true
    positionedMarkerKeyRef.current = markerKey
    fitToMarker(markerPos)
  }, [markerPos, imageLoaded, currentMap, fitToMarker])

  // 切换地图时重置
  useEffect(() => {
    positionedRef.current = false
    positionedMarkerKeyRef.current = null
    setImageLoaded(false)
    setImgNaturalSize({ width: 0, height: 0 })
  }, [currentMapId])

  // 缓存图片可能已加载
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true)
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      })
    }
  }, [currentMap?.assetName])

  // ========== 缩放控制（ref-based，零依赖） ==========
  const applyZoom = useCallback((zoomFactor: number, mouseX?: number, mouseY?: number) => {
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const prevZoom = zoomRef.current
    const targetZoom = prevZoom * zoomFactor
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom))
    if (clamped === prevZoom) return

    const prevPos = posRef.current
    const mPos = markerPosRef.current
    const sx = scaleXRef.current
    const sy = scaleYRef.current

    let newPos: { x: number; y: number }
    if (mPos) {
      newPos = {
        x: width / 2 - (mPos.x * sx) * clamped,
        y: height / 2 - (mPos.y * sy) * clamped,
      }
    } else {
      const fx = mouseX ?? width / 2
      const fy = mouseY ?? height / 2
      newPos = {
        x: fx - (fx - prevPos.x) * clamped / prevZoom,
        y: fy - (fy - prevPos.y) * clamped / prevZoom,
      }
    }

    zoomRef.current = clamped
    posRef.current = newPos
    setZoom(clamped)
    setPosition(newPos)
  }, [])

  useEffect(() => { applyZoomRef.current = applyZoom }, [applyZoom])

  const handleZoomIn = useCallback(() => applyZoom(1.25), [applyZoom])
  const handleZoomOut = useCallback(() => applyZoom(0.8), [applyZoom])

  const handleReset = useCallback(() => {
    if (markerPos && containerSize.width > 0 && containerSize.height > 0) {
      fitToMarker(markerPos, containerSize.width, containerSize.height)
    } else {
      zoomRef.current = 1
      posRef.current = { x: 0, y: 0 }
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [markerPos, fitToMarker, containerSize])

  // ========== 坐标转换 ==========
  const containerToImage = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    const p = posRef.current
    const z = zoomRef.current
    const imgX = (cx - p.x) / z
    const imgY = (cy - p.y) / z
    if (isNaN(imgX) || isNaN(imgY)) return null
    return { x: imgX, y: imgY }
  }, [])

  // ========== RAF 拖拽（核心性能优化） ==========
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    posRef.current = { x: newX, y: newY }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setPosition({ ...posRef.current })
        rafRef.current = null
      })
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPosition({ ...posRef.current })
  }, [])

  // ========== 非 passive wheel 监听器 ==========
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      applyZoomRef.current(
        e.deltaY < 0 ? 1.15 : (1 / 1.15),
        e.clientX - rect.left,
        e.clientY - rect.top,
      )
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ========== 触屏手势（拖拽 + 双指缩放） ==========
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchRef.current.isPinching = false
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - posRef.current.x,
        y: e.touches[0].clientY - posRef.current.y,
      }
    } else if (e.touches.length === 2) {
      touchRef.current.isPinching = true
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current.startDist = Math.sqrt(dx * dx + dy * dy)
      touchRef.current.startZoom = zoomRef.current
      touchRef.current.startX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      touchRef.current.startY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !touchRef.current.isPinching) {
      const newX = e.touches[0].clientX - dragStartRef.current.x
      const newY = e.touches[0].clientY - dragStartRef.current.y
      posRef.current = { x: newX, y: newY }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setPosition({ ...posRef.current })
          rafRef.current = null
        })
      }
    } else if (e.touches.length === 2 && touchRef.current.isPinching) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const factor = dist / touchRef.current.startDist
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchRef.current.startZoom * factor))

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        const prevZoom = zoomRef.current
        const prevPos = posRef.current

        const newPos = {
          x: mx - (mx - prevPos.x) * newZoom / prevZoom,
          y: my - (my - prevPos.y) * newZoom / prevZoom,
        }
        zoomRef.current = newZoom
        posRef.current = newPos
        setZoom(newZoom)
        setPosition(newPos)
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    touchRef.current.isPinching = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPosition({ ...posRef.current })
  }, [])

  // ========== 点击地图获取坐标 ==========
  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentMap || isDragging || !allowClickToMark) return
    const imgCoord = containerToImage(e.clientX, e.clientY)
    if (!imgCoord) return
    const originalX = imgCoord.x / scaleX
    const originalY = imgCoord.y / scaleY
    if (originalX < 0 || originalY < 0 ||
        (currentMap.mapSize && originalX > currentMap.mapSize.width) ||
        (currentMap.mapSize && originalY > currentMap.mapSize.height)) {
      return
    }
    positionedRef.current = true
    positionedMarkerKeyRef.current = `${originalX},${originalY}`
    setMarkerPos({ x: originalX, y: originalY })
    try {
      const coordResult = await mapApi.pixelToCoord({ pixelX: originalX, pixelY: originalY, mapId: currentMap.id })
      console.log('Game coordinates:', coordResult)
    } catch (error) {
      console.error('Failed to convert pixel to coord:', error)
    }
  }

  // ========== 性能关键：视口裁剪 — 只渲染可见标记 ==========
  const visibleMarkers = useMemo(() => {
    if (markers.length === 0) return []

    const cw = containerSize.width
    const ch = containerSize.height
    // 容器尺寸未知时渲染全部（降级）
    if (cw === 0 || ch === 0) return markers

    const z = zoom
    const px = position.x
    const py = position.y
    const sx = scaleX
    const sy = scaleY
    const MARKER_SIZE = 60
    const BUFFER = 120

    return markers.filter(m => {
      const screenX = m.x * sx * z + px
      const screenY = m.y * sy * z + py
      return screenX > -MARKER_SIZE - BUFFER &&
             screenX < cw + BUFFER &&
             screenY > -MARKER_SIZE - BUFFER &&
             screenY < ch + BUFFER
    })
  }, [markers, zoom, position, containerSize, scaleX, scaleY])

  // RAF 清理
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* 工具栏 */}
      {currentMap && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: scheme.borderLight }}
        >
          <div className="flex items-center gap-3">
            <select
              value={currentMapId || ''}
              onChange={(e) => handleMapChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 outline-none transition-colors cursor-pointer"
              style={{ color: scheme.textPrimary, border: `1px solid ${scheme.borderLight}` }}
            >
              {maps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowRegions(prev => !prev)}
              className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
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
            <button onClick={handleZoomOut} className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: scheme.textSecondary }}>
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[50px] text-center" style={{ color: scheme.textPrimary }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: scheme.textSecondary }}>
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: scheme.textSecondary }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 地图容器 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden relative cursor-grab select-none"
        style={{ background: scheme.bgMain, touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleMapClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: scheme.bgMain }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
          </div>
        )}

        {!loading && !currentMap && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4" style={{ color: scheme.textTertiary }} />
              <p style={{ color: scheme.textSecondary }}>暂无地图数据</p>
            </div>
          </div>
        )}

        {currentMap && (
        <>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: scheme.bgCard + 'E6' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: scheme.primary }} />
              <span className="text-sm" style={{ color: scheme.textSecondary }}>加载地图中...</span>
            </div>
          </div>
        )}

        {/* 地图变换层 — GPU 加速 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)',
            willChange: isDragging ? 'transform' : 'auto',
          }}
        >
          <img
            ref={imgRef}
            src={currentMap.assetName}
            alt={currentMap.name}
            draggable={false}
            style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }}
            onLoad={handleImageLoad}
            onError={() => setImageLoaded(true)}
          />

          {/* 区域覆盖层 */}
          {showRegions && regions.map(region => (
            <div
              key={region.id}
              className="absolute border-2 rounded-sm pointer-events-none"
              style={{
                borderColor: scheme.primary + '80',
                background: scheme.primary + '15',
                left: Math.min(...region.polygon.map(p => p.x || 0)),
                top: Math.min(...region.polygon.map(p => p.y || 0)),
                width: Math.max(...region.polygon.map(p => p.x || 0)) - Math.min(...region.polygon.map(p => p.x || 0)),
                height: Math.max(...region.polygon.map(p => p.y || 0)) - Math.min(...region.polygon.map(p => p.y || 0)),
              }}
            >
              <span
                className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded"
                style={{ background: scheme.bgCard + 'E6', color: scheme.textPrimary }}
              >
                {region.name}
              </span>
            </div>
          ))}

          {/* 视口裁剪后的标记点（核心优化：只渲染可见标记） */}
          {visibleMarkers.map(marker => (
            <div
              key={marker.id}
              className="absolute cursor-pointer hover:z-20"
              style={{
                left: marker.x * scaleX,
                top: marker.y * scaleY,
                transform: 'translate(-50%, -100%)',
                zIndex: 10,
              }}
              onClick={(e) => { e.stopPropagation(); onMarkerClick?.(marker) }}
            >
              <div
                className="relative group"
                style={{
                  transform: `scale(${inverseZoom})`,
                  transformOrigin: 'center bottom',
                }}
              >
                {marker.imageUrl ? (
                  <>
                    {/* 标记圆形头像（移除 backdrop-blur 降低 GPU 开销） */}
                    <div
                      className="w-10 h-10 rounded-full border-2 overflow-hidden group-hover:scale-110 transition-transform bg-white/80 p-0.5 relative z-10"
                      style={{ borderColor: scheme.primary, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                    >
                      <img
                        src={marker.imageUrl}
                        className="w-full h-full object-cover rounded-full"
                        alt="marker"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    {/* 悬浮提示框（移除 backdrop-blur-xl） */}
                    <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full opacity-0 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-[120%] transition-all duration-200 z-50 flex flex-col items-center">
                      <div
                        className="p-1.5 rounded-xl flex flex-col gap-2 border"
                        style={{
                          background: isDark ? 'rgba(30, 30, 35, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
                        }}
                      >
                        <div className="w-32 h-20 rounded-lg overflow-hidden shrink-0 bg-black/5">
                          <img src={marker.imageUrl} className="w-full h-full object-cover" alt="preview" loading="lazy" />
                        </div>
                        <p className="text-xs font-medium px-1 text-center truncate w-32" style={{ color: scheme.textPrimary }}>
                          {marker.title || '照片'}
                        </p>
                      </div>
                      <div
                        className="w-3 h-3 rotate-45 -mt-1.5 border-r border-b"
                        style={{
                          background: isDark ? 'rgba(30, 30, 35, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <MapPin
                    className="w-8 h-8 drop-shadow-lg transition-transform group-hover:scale-110"
                    style={{ color: scheme.primary }}
                    fill={scheme.primary}
                  />
                )}
              </div>
            </div>
          ))}

          {/* 用户手动定位标记 */}
          {markerPos && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: markerPos.x * scaleX,
                top: markerPos.y * scaleY,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div
                className="relative"
                style={{
                  transform: `scale(${inverseZoom})`,
                  transformOrigin: 'center bottom',
                }}
              >
                <MapPin className="w-8 h-8 drop-shadow-lg" style={{ color: scheme.error }} fill={scheme.error} />
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: scheme.error + '40', transform: 'scale(0.5)', transformOrigin: 'center bottom' }}
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
        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: scheme.borderLight }}>
          <div className="flex items-center gap-4">
            {detectedRegion.region && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: scheme.primary }} />
                <span className="text-sm" style={{ color: scheme.textPrimary }}>{detectedRegion.region.name}</span>
              </div>
            )}
            {coordX !== undefined && coordY !== undefined && (
              <div className="text-xs" style={{ color: scheme.textTertiary }}>
                坐标: ({coordX.toFixed(1)}, {coordY.toFixed(1)}{coordZ !== undefined && `, ${coordZ.toFixed(1)}`})
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
