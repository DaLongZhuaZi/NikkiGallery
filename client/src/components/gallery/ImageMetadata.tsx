import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { getImageMetadata, extractMetadata } from '@/api/image'
import { Camera, MapPin, Clock, Settings, Loader2, RefreshCw, Map, Lock, Sparkles, Sun, User, Cloud } from 'lucide-react'
import toast from 'react-hot-toast'
import MapViewer from '@/components/map/MapViewer'
import DecryptPanel from '@/components/decrypt/DecryptPanel'

interface ImageMetadataProps {
  imageId: string
  onClose?: () => void
}

interface ExifData {
  make?: string
  model?: string
  software?: string
  dateTime?: string
  dateTimeOriginal?: string
  imageWidth?: number
  imageHeight?: number
  exposureTime?: string
  fNumber?: number
  isoSpeedRatings?: number
  focalLength?: number
  focalLengthIn35mm?: number
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAltitude?: number
  colorSpace?: string
  whiteBalance?: string
  sceneCaptureType?: string
}

interface CameraParams {
  focalLength?: number
  aperture?: number
  fov?: number
  positionX?: number
  positionY?: number
  positionZ?: number
  pitch?: number
  yaw?: number
  roll?: number
  brightness?: number
  contrast?: number
  saturation?: number
  exposure?: number
  highlights?: number
  shadows?: number
  bloomIntensity?: number
  vignetteIntensity?: number
  filterId?: string
  filterStrength?: number
  portraitMode?: boolean
  weatherType?: number
  gameTime?: string
}

interface Metadata {
  exif: ExifData | null
  cameraParams: CameraParams | null
  gameMetadata: any | null
}

export default function ImageMetadata({ imageId, onClose }: ImageMetadataProps) {
  const { scheme } = useTheme()
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [showMap, setShowMap] = useState(false)

  // 加载元数据
  const loadMetadata = async () => {
    setLoading(true)
    try {
      const data = await getImageMetadata(imageId)
      setMetadata(data)
    } catch (error) {
      console.error('Failed to load metadata:', error)
      toast.error('加载元数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetadata()
  }, [imageId])

  // 提取元数据
  const handleExtract = async () => {
    setExtracting(true)
    try {
      await extractMetadata(imageId)
      toast.success('元数据提取完成')
      await loadMetadata() // 重新加载
    } catch (error) {
      toast.error('提取失败')
    } finally {
      setExtracting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: scheme.primary }} />
      </div>
    )
  }

  if (!metadata || (!metadata.exif && !metadata.cameraParams && !metadata.gameMetadata)) {
    return (
      <div 
        className="p-6 rounded-xl text-center"
        style={{ background: scheme.bgCard }}
      >
        <Settings className="w-12 h-12 mx-auto mb-4" style={{ color: scheme.textTertiary }} />
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
            暂无元数据信息
          </p>
          <p className="text-xs" style={{ color: scheme.textSecondary, lineHeight: 1.5 }}>
            该图片未包含附加的拍照数据。<br/>
            💡 提示：只有使用游戏内“拍照模式”拍摄的截图才会包含相机参数与地理位置。普通的快捷键截图仅为纯图片，无法提取元数据。
          </p>
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
          style={{ 
            background: scheme.primaryLight,
            color: scheme.primary,
            opacity: extracting ? 0.6 : 1,
          }}
        >
          {extracting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {extracting ? '提取中...' : '提取元数据'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      {/* EXIF 数据 */}
      {metadata.exif && (
        <div 
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <h3 
            className="text-sm font-medium mb-4 flex items-center gap-2 pb-2 border-b"
            style={{ color: scheme.textPrimary, borderColor: scheme.borderLight }}
          >
            <Camera className="w-4 h-4 text-blue-500" />
            相机参数
          </h3>
          
          <div className="grid grid-cols-2 gap-y-4 gap-x-3">
            {metadata.exif.make && metadata.exif.model && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>设备 / Device</p>
                <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.make} {metadata.exif.model}
                </p>
              </div>
            )}
            
            {metadata.exif.focalLength && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>焦距 / Focal</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.focalLength}mm
                  {metadata.exif.focalLengthIn35mm && <span className="text-xs ml-1" style={{ color: scheme.textSecondary }}>({metadata.exif.focalLengthIn35mm}mm eq)</span>}
                </p>
              </div>
            )}
            
            {metadata.exif.fNumber && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>光圈 / Aperture</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  f/{metadata.exif.fNumber}
                </p>
              </div>
            )}
            
            {metadata.exif.exposureTime && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>快门 / Shutter</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.exposureTime}s
                </p>
              </div>
            )}
            
            {metadata.exif.isoSpeedRatings && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>感光度 / ISO</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.isoSpeedRatings}
                </p>
              </div>
            )}
            
            {metadata.exif.dateTimeOriginal && (
              <div className="col-span-2 mt-1">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>拍摄时间 / Date</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.dateTimeOriginal}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GPS 信息 */}
      {metadata.exif?.gpsLatitude && metadata.exif?.gpsLongitude && (
        <div 
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <h3 
            className="text-sm font-medium mb-3 flex items-center gap-2 pb-2 border-b"
            style={{ color: scheme.textPrimary, borderColor: scheme.borderLight }}
          >
            <MapPin className="w-4 h-4 text-red-500" />
            位置信息
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>坐标 / Coordinates</p>
              <p className="text-sm font-mono" style={{ color: scheme.textPrimary }}>
                {metadata.exif.gpsLatitude.toFixed(6)}°, {metadata.exif.gpsLongitude.toFixed(6)}°
              </p>
            </div>
            
            {metadata.exif.gpsAltitude && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>海拔 / Altitude</p>
                <p className="text-sm font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.exif.gpsAltitude.toFixed(1)}m
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 相机参数（游戏） */}
      {metadata.cameraParams && (
        <div 
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <h3 
            className="text-sm font-medium mb-4 flex items-center gap-2 pb-2 border-b"
            style={{ color: scheme.textPrimary, borderColor: scheme.borderLight }}
          >
            <Settings className="w-4 h-4 text-purple-500" />
            游戏参数
          </h3>
          
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {metadata.cameraParams.focalLength !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>焦距 / F</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.cameraParams.focalLength.toFixed(1)}
                </p>
              </div>
            )}
            
            {metadata.cameraParams.brightness !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>亮度 / B</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {(metadata.cameraParams.brightness * 100).toFixed(0)}%
                </p>
              </div>
            )}
            
            {metadata.cameraParams.contrast !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>对比度 / C</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {(metadata.cameraParams.contrast * 100).toFixed(0)}%
                </p>
              </div>
            )}
            
            {metadata.cameraParams.saturation !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>饱和度 / S</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {(metadata.cameraParams.saturation * 100).toFixed(0)}%
                </p>
              </div>
            )}
            
            {metadata.cameraParams.exposure !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>曝光 / EV</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.cameraParams.exposure > 0 ? '+' : ''}{metadata.cameraParams.exposure.toFixed(2)}
                </p>
              </div>
            )}
            
            {metadata.cameraParams.portraitMode !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>人像 / P</p>
                <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                  {metadata.cameraParams.portraitMode ? '开启' : '关闭'}
                </p>
              </div>
            )}
            
            {metadata.cameraParams.gameTime && (
              <div className="col-span-3 mt-1">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>游戏时间 / Time</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.cameraParams.gameTime}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 环境与角色状态 */}
      {metadata.gameMetadata?.SocialPhoto?.PhotoInfo && (
        <div
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <h3
            className="text-sm font-medium mb-3 flex items-center gap-2 pb-2 border-b"
            style={{ color: scheme.textPrimary, borderColor: scheme.borderLight }}
          >
            <Cloud className="w-4 h-4 text-blue-500" />
            环境与状态
          </h3>
          
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {metadata.gameMetadata.SocialPhoto.PhotoInfo.lightId && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: scheme.textTertiary }}>
                  <Sun className="w-3 h-3" /> 光照类型
                </p>
                <p className="text-sm font-medium truncate" title={metadata.gameMetadata.SocialPhoto.PhotoInfo.lightId} style={{ color: scheme.textPrimary }}>
                  {metadata.gameMetadata.SocialPhoto.PhotoInfo.lightId.replace('DirectionLight_', '')}
                </p>
              </div>
            )}
            
            {metadata.gameMetadata.SocialPhoto.PhotoInfo.lightStrength !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>光照强度</p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  {metadata.gameMetadata.SocialPhoto.PhotoInfo.lightStrength.toFixed(2)}
                </p>
              </div>
            )}

            {metadata.gameMetadata.SocialPhoto.PhotoInfo.poseId !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: scheme.textTertiary }}>
                  <User className="w-3 h-3" /> 动作姿势
                </p>
                <p className="text-sm font-medium font-mono" style={{ color: scheme.textPrimary }}>
                  ID: {metadata.gameMetadata.SocialPhoto.PhotoInfo.poseId}
                </p>
              </div>
            )}
            
            {metadata.gameMetadata.SocialPhoto.PhotoInfo.nikkiHidden !== undefined && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>人物显示</p>
                <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                  {metadata.gameMetadata.SocialPhoto.PhotoInfo.nikkiHidden ? '隐藏' : '显示'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 游戏服饰信息 */}
      {metadata.gameMetadata?.SocialPhoto?.PhotoInfo?.nikkiClothes && (
        <div
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <h3
            className="text-sm font-medium mb-3 flex items-center gap-2 pb-2 border-b"
            style={{ color: scheme.textPrimary, borderColor: scheme.borderLight }}
          >
            <Sparkles className="w-4 h-4 text-pink-500" />
            搭配服饰
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {metadata.gameMetadata.SocialPhoto.PhotoInfo.nikkiClothes.map((id: number) => (
              <span
                key={id}
                className="px-2 py-1 rounded-md text-xs font-mono font-medium transition-transform hover:scale-105 cursor-default"
                style={{
                  background: scheme.primaryLight,
                  color: scheme.primary,
                  border: `1px solid ${scheme.borderLight}`,
                }}
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 其他游戏元数据（可选折叠显示） */}
      {metadata.gameMetadata && (
        <details className="group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
          <summary 
            className="p-4 rounded-xl cursor-pointer list-none flex items-center justify-between"
            style={{ background: scheme.bgCard, color: scheme.textPrimary }}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              原始元数据 (高级)
            </span>
            <span className="text-xs transition-transform group-open:rotate-180" style={{ color: scheme.textTertiary }}>▼</span>
          </summary>
          <div className="mt-2 p-1">
            <pre
              className="text-xs p-3 rounded-lg overflow-auto max-h-48"
              style={{
                background: scheme.bgHover,
                color: scheme.textSecondary,
              }}
            >
              {JSON.stringify(metadata.gameMetadata, null, 2)}
            </pre>
          </div>
        </details>
      )}

      {/* 游戏位置地图 */}
      {metadata.cameraParams?.positionX !== undefined && metadata.cameraParams?.positionZ !== undefined && (
        <div
          className="p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both"
          style={{ background: scheme.bgCard }}
        >
          <div className="flex items-center justify-between mb-4 border-b pb-2" style={{ borderColor: scheme.borderLight }}>
            <h3
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: scheme.textPrimary }}
            >
              <Map className="w-4 h-4 text-green-500" />
              游戏位置
            </h3>
            <button
              onClick={() => setShowMap(prev => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: showMap ? scheme.primaryLight : scheme.bgHover,
                color: showMap ? scheme.primary : scheme.textSecondary,
              }}
            >
              {showMap ? '收起地图' : '查看地图'}
            </button>
          </div>

          {/* 坐标信息 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 rounded-lg flex flex-col items-center justify-center" style={{ background: scheme.bgHover }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>X</p>
              <p className="text-sm font-mono font-medium" style={{ color: scheme.textPrimary }}>
                {metadata.cameraParams.positionX.toFixed(1)}
              </p>
            </div>
            <div className="p-2 rounded-lg flex flex-col items-center justify-center" style={{ background: scheme.bgHover }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>Y</p>
              <p className="text-sm font-mono font-medium" style={{ color: scheme.textPrimary }}>
                {metadata.cameraParams.positionY?.toFixed(1) || '—'}
              </p>
            </div>
            <div className="p-2 rounded-lg flex flex-col items-center justify-center" style={{ background: scheme.bgHover }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: scheme.textTertiary }}>Z</p>
              <p className="text-sm font-mono font-medium" style={{ color: scheme.textPrimary }}>
                {metadata.cameraParams.positionZ.toFixed(1)}
              </p>
            </div>
          </div>

          {/* 地图查看器弹窗 */}
          {showMap && createPortal(
            <div 
              className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowMap(false)}
            >
              <div 
                className="relative w-[95vw] md:w-[85vw] h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
                style={{ backgroundColor: scheme.bgMain, border: `1px solid ${scheme.borderLight}` }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: scheme.borderLight, backgroundColor: scheme.bgCard }}>
                  <h3 className="font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                    <Map className="w-5 h-5 text-green-500" />
                    游戏大地图
                  </h3>
                  <button 
                    onClick={() => setShowMap(false)}
                    className="p-1.5 px-3 text-sm font-medium rounded-lg transition-colors bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                    style={{ color: scheme.textPrimary }}
                  >
                    关闭
                  </button>
                </div>
                {/* 地图内容 */}
                <div className="flex-1 min-h-0 relative overflow-hidden rounded-b-2xl flex flex-col">
                  <MapViewer
                    coordX={metadata.cameraParams.positionX}
                    coordY={metadata.cameraParams.positionZ}
                    coordZ={metadata.cameraParams.positionY}
                    onClose={() => setShowMap(false)}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* 解密面板 */}
      <DecryptPanel
        imageIds={[imageId]}
        onDecryptComplete={() => loadMetadata()}
      />

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
          style={{ 
            background: scheme.bgHover,
            color: scheme.textSecondary,
            opacity: extracting ? 0.6 : 1,
          }}
        >
          {extracting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          重新提取
        </button>
      </div>
    </div>
  )
}
