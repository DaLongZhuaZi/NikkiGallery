import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import MapViewer from '@/components/map/MapViewer'
import { Map, MapPin, Navigation } from 'lucide-react'

export default function MapPage() {
  const { scheme } = useTheme()
  const [coordX, setCoordX] = useState<string>('')
  const [coordY, setCoordY] = useState<string>('')
  const [coordZ, setCoordZ] = useState<string>('')
  const [showMarker, setShowMarker] = useState(false)
  const [markerCoords, setMarkerCoords] = useState<{ x: number; y: number; z?: number } | null>(null)

  const handleLocate = () => {
    const x = parseFloat(coordX)
    const y = parseFloat(coordY)
    const z = parseFloat(coordZ)

    if (isNaN(x) || isNaN(y)) {
      return
    }

    setMarkerCoords({ x, y, z: isNaN(z) ? undefined : z })
    setShowMarker(true)
  }

  const handleClear = () => {
    setCoordX('')
    setCoordY('')
    setCoordZ('')
    setMarkerCoords(null)
    setShowMarker(false)
  }

  return (
    <div className="page-transition max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1
          className="text-xl lg:text-2xl font-bold flex items-center gap-2"
          style={{ color: scheme.textPrimary }}
        >
          <Map className="w-6 h-6" />
          游戏地图
        </h1>
        <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
          查看无限暖暖游戏世界地图，定位拍照位置
        </p>
      </div>

      {/* 坐标输入 */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{ background: scheme.bgCard }}
      >
        <h3
          className="text-sm font-medium mb-3 flex items-center gap-2"
          style={{ color: scheme.textPrimary }}
        >
          <Navigation className="w-4 h-4" />
          坐标定位
        </h3>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>
              X 坐标
            </label>
            <input
              type="number"
              value={coordX}
              onChange={(e) => setCoordX(e.target.value)}
              placeholder="X"
              className="px-3 py-2 rounded-lg text-sm w-28"
              style={{
                background: scheme.bgHover,
                color: scheme.textPrimary,
                border: `1px solid ${scheme.borderLight}`,
              }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>
              Y 坐标（高度）
            </label>
            <input
              type="number"
              value={coordY}
              onChange={(e) => setCoordY(e.target.value)}
              placeholder="Y"
              className="px-3 py-2 rounded-lg text-sm w-28"
              style={{
                background: scheme.bgHover,
                color: scheme.textPrimary,
                border: `1px solid ${scheme.borderLight}`,
              }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: scheme.textTertiary }}>
              Z 坐标
            </label>
            <input
              type="number"
              value={coordZ}
              onChange={(e) => setCoordZ(e.target.value)}
              placeholder="Z"
              className="px-3 py-2 rounded-lg text-sm w-28"
              style={{
                background: scheme.bgHover,
                color: scheme.textPrimary,
                border: `1px solid ${scheme.borderLight}`,
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLocate}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
              style={{
                background: scheme.primary,
                color: '#ffffff',
              }}
            >
              <MapPin className="w-4 h-4" />
              定位
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: scheme.bgHover,
                color: scheme.textSecondary,
              }}
            >
              清除
            </button>
          </div>
        </div>

        <p className="text-xs mt-2" style={{ color: scheme.textTertiary }}>
          提示：从图片元数据中获取游戏坐标，输入后点击定位查看在地图上的位置
        </p>
      </div>

      {/* 地图查看器 */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{
          borderColor: scheme.borderLight,
          height: 'calc(100vh - 320px)',
          minHeight: 500,
        }}
      >
        <MapViewer
          coordX={showMarker && markerCoords ? markerCoords.x : undefined}
          coordY={showMarker && markerCoords ? markerCoords.y : undefined}
          coordZ={showMarker && markerCoords ? markerCoords.z : undefined}
        />
      </div>
    </div>
  )
}
