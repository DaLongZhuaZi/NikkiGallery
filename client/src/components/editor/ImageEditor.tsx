import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import {
  X, Undo2, Redo2, Download, RotateCcw, Crop, Palette,
  Sun, Contrast, Droplets, Thermometer, Sparkles,
  Circle, Layers, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ImageEditorProps {
  /** 图片URL */
  imageUrl: string
  /** 关闭回调 */
  onClose: () => void
  /** 保存回调 */
  onSave?: (editedImageUrl: string) => void
}

/** 编辑参数 — 对标 nikki_albums ImageFragmentParams 全部20项 */
interface EditParams {
  // 基础调整
  brightness: number      // -100 ~ 100
  contrast: number        // -100 ~ 100
  saturation: number      // -100 ~ 100
  exposure: number        // -100 ~ 100

  // 色调调整
  temperature: number     // -100 ~ 100 (冷 -> 暖)
  tint: number            // -100 ~ 100 (绿 -> 紫)

  // 光线调整
  lightSense: number      // -100 ~ 100 感光度
  highlights: number      // -100 ~ 100
  shadows: number         // -100 ~ 100
  whites: number          // -100 ~ 100 白色
  blacks: number          // -100 ~ 100 黑色

  // 细节调整
  clarity: number         // -100 ~ 100
  vibrance: number        // -100 ~ 100

  // HSL 调整
  hslHue: number          // -100 ~ 100
  hslSaturation: number   // -100 ~ 100
  hslLightness: number    // -100 ~ 100

  // 色彩通道 (互补色)
  cyanRed: number         // -100 ~ 100
  magentaGreen: number    // -100 ~ 100
  yellowBlue: number      // -100 ~ 100

  // 效果
  fade: number            // 0 ~ 100 褪色

  // 裁剪
  cropX: number           // 0 ~ 1
  cropY: number           // 0 ~ 1
  cropWidth: number       // 0 ~ 1
  cropHeight: number      // 0 ~ 1
  rotation: number        // -180 ~ 180
}

/** 默认参数 */
const DEFAULT_PARAMS: EditParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  lightSense: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  clarity: 0,
  vibrance: 0,
  hslHue: 0,
  hslSaturation: 0,
  hslLightness: 0,
  cyanRed: 0,
  magentaGreen: 0,
  yellowBlue: 0,
  fade: 0,
  cropX: 0,
  cropY: 0,
  cropWidth: 1,
  cropHeight: 1,
  rotation: 0,
}

/** 裁剪比例预设 */
const CROP_RATIOS = [
  { name: '自由', value: null },
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '3:4', value: 3 / 4 },
  { name: '16:9', value: 16 / 9 },
  { name: '9:16', value: 9 / 16 },
  { name: '3:2', value: 3 / 2 },
  { name: '2:3', value: 2 / 3 },
]

export default function ImageEditor({ imageUrl, onClose, onSave }: ImageEditorProps) {
  const { scheme } = useTheme()

  // 画布引用
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // 编辑状态
  const [params, setParams] = useState<EditParams>({ ...DEFAULT_PARAMS })
  const [history, setHistory] = useState<EditParams[]>([{ ...DEFAULT_PARAMS }])
  const [historyIndex, setHistoryIndex] = useState(0)

  // UI 状态
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop'>('adjust')
  const [selectedCropRatio, setSelectedCropRatio] = useState<number | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // 加载图片
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      renderImage()
    }
    img.src = imageUrl
  }, [imageUrl])

  // 参数变化时重新渲染
  useEffect(() => {
    renderImage()
  }, [params])

  // 渲染图片到画布
  const renderImage = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸
    canvas.width = image.width
    canvas.height = image.height

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 保存状态
    ctx.save()

    // 应用旋转
    if (params.rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((params.rotation * Math.PI) / 180)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)
    }

    // 应用裁剪
    const sx = params.cropX * image.width
    const sy = params.cropY * image.height
    const sw = params.cropWidth * image.width
    const sh = params.cropHeight * image.height

    // 应用 CSS 滤镜
    const filters: string[] = []

    // 亮度 (默认100%)
    filters.push(`brightness(${100 + params.brightness}%)`)

    // 对比度 (默认100%)
    filters.push(`contrast(${100 + params.contrast}%)`)

    // 饱和度 (默认100%)
    filters.push(`saturate(${100 + params.saturation}%)`)

    // 曝光 (使用 brightness 近似)
    if (params.exposure !== 0) {
      filters.push(`brightness(${100 + params.exposure * 0.5}%)`)
    }

    // 色温 (使用 sepia + hue-rotate 近似)
    if (params.temperature !== 0) {
      const warmth = params.temperature / 100
      if (warmth > 0) {
        filters.push(`sepia(${warmth * 30}%)`)
      }
    }

    // 应用滤镜
    ctx.filter = filters.join(' ')

    // 绘制裁剪区域
    ctx.drawImage(
      image,
      sx, sy, sw, sh,
      sx, sy, sw, sh
    )

    // 恢复状态
    ctx.restore()

    // 应用后处理效果（色温、色调、高光、阴影等需要像素级操作）
    const needsPixelProcessing = (
      params.temperature !== 0 || params.tint !== 0 ||
      params.lightSense !== 0 || params.highlights !== 0 ||
      params.shadows !== 0 || params.whites !== 0 ||
      params.blacks !== 0 || params.clarity !== 0 ||
      params.vibrance !== 0 || params.hslHue !== 0 ||
      params.hslSaturation !== 0 || params.hslLightness !== 0 ||
      params.cyanRed !== 0 || params.magentaGreen !== 0 ||
      params.yellowBlue !== 0 || params.fade !== 0
    )
    if (needsPixelProcessing) {
      applyPixelAdjustments(ctx, sx, sy, sw, sh)
    }
  }, [params])

  // ==================== 颜色空间转换辅助函数 ====================

  /** RGB → HSL (h: 0~360, s: 0~1, l: 0~1) */
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return [0, 0, l]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    return [h * 360, s, l]
  }

  /** HSL → RGB */
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360
    if (s === 0) {
      const v = Math.round(l * 255)
      return [v, v, v]
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ]
  }

  // 像素级调整（对标 nikki_albums 全部20项参数）
  const applyPixelAdjustments = (
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, sw: number, sh: number
  ) => {
    const imageData = ctx.getImageData(sx, sy, sw, sh)
    const data = imageData.data

    // 预计算参数值 (归一化到 -1~1 或 0~1)
    const p = {
      brightness: params.brightness / 100,
      contrast: params.contrast / 100,
      saturation: params.saturation / 100,
      exposure: params.exposure / 100,
      temperature: params.temperature / 100,
      tint: params.tint / 100,
      lightSense: params.lightSense / 100,
      highlights: params.highlights / 100,
      shadows: params.shadows / 100,
      whites: params.whites / 100,
      blacks: params.blacks / 100,
      clarity: params.clarity / 100,
      vibrance: params.vibrance / 100,
      hslHue: params.hslHue / 100,
      hslSaturation: params.hslSaturation / 100,
      hslLightness: params.hslLightness / 100,
      cyanRed: params.cyanRed / 100,
      magentaGreen: params.magentaGreen / 100,
      yellowBlue: params.yellowBlue / 100,
      fade: params.fade / 100,
    }

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      // 计算归一化亮度 (0~1)
      const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255

      // ===== 1. 曝光 (exposure) — 整体亮度乘数 =====
      if (params.exposure !== 0) {
        const factor = Math.pow(2, p.exposure)
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 2. 亮度 (brightness) — 线性偏移 =====
      if (params.brightness !== 0) {
        const offset = p.brightness * 255
        r = Math.min(255, Math.max(0, r + offset))
        g = Math.min(255, Math.max(0, g + offset))
        b = Math.min(255, Math.max(0, b + offset))
      }

      // ===== 3. 对比度 (contrast) — 以128为中心拉伸 =====
      if (params.contrast !== 0) {
        const factor = 1 + p.contrast
        r = Math.min(255, Math.max(0, (r - 128) * factor + 128))
        g = Math.min(255, Math.max(0, (g - 128) * factor + 128))
        b = Math.min(255, Math.max(0, (b - 128) * factor + 128))
      }

      // ===== 4. 感光度 (lightSense) — 基于亮度曲线的非线性调整 =====
      if (params.lightSense !== 0) {
        const midtone = 1 - Math.abs(lum - 0.5) * 2 // 中间调权重最大
        const factor = 1 + p.lightSense * midtone * 0.5
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 5. 色温 (temperature) — 蓝色↔橙色 =====
      if (params.temperature !== 0) {
        r = Math.min(255, Math.max(0, r + p.temperature * 25))
        b = Math.min(255, Math.max(0, b - p.temperature * 25))
      }

      // ===== 6. 色调 (tint) — 绿色↔紫色 =====
      if (params.tint !== 0) {
        g = Math.min(255, Math.max(0, g + p.tint * 18))
        r = Math.min(255, Math.max(0, r - p.tint * 6))
        b = Math.min(255, Math.max(0, b - p.tint * 6))
      }

      // ===== 7. 高光 (highlights) — 亮部区域调整 =====
      if (params.highlights !== 0 && lum > 0.5) {
        const weight = (lum - 0.5) * 2 // 0~1
        const factor = 1 + p.highlights * weight * 0.6
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 8. 阴影 (shadows) — 暗部区域调整 =====
      if (params.shadows !== 0 && lum < 0.5) {
        const weight = (0.5 - lum) * 2 // 0~1
        const factor = 1 + p.shadows * weight * 0.6
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 9. 白色 (whites) — 最亮区域调整 =====
      if (params.whites !== 0 && lum > 0.75) {
        const weight = (lum - 0.75) * 4 // 0~1
        const factor = 1 + p.whites * weight * 0.5
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 10. 黑色 (blacks) — 最暗区域调整 =====
      if (params.blacks !== 0 && lum < 0.25) {
        const weight = (0.25 - lum) * 4 // 0~1
        const factor = 1 + p.blacks * weight * 0.5
        r = Math.min(255, Math.max(0, r * factor))
        g = Math.min(255, Math.max(0, g * factor))
        b = Math.min(255, Math.max(0, b * factor))
      }

      // ===== 11. 饱和度 (saturation) =====
      if (params.saturation !== 0) {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const factor = 1 + p.saturation
        r = Math.min(255, Math.max(0, gray + (r - gray) * factor))
        g = Math.min(255, Math.max(0, gray + (g - gray) * factor))
        b = Math.min(255, Math.max(0, gray + (b - gray) * factor))
      }

      // ===== 12. 自然饱和度 (vibrance) — 保护已有饱和度 =====
      if (params.vibrance !== 0) {
        const max = Math.max(r, g, b)
        const avg = (r + g + b) / 3
        const sat = max > 0 ? (max - avg) / max : 0
        const factor = 1 + p.vibrance * (1 - sat) * 0.5
        r = Math.min(255, Math.max(0, avg + (r - avg) * factor))
        g = Math.min(255, Math.max(0, avg + (g - avg) * factor))
        b = Math.min(255, Math.max(0, avg + (b - avg) * factor))
      }

      // ===== 13-15. HSL 调整 =====
      if (params.hslHue !== 0 || params.hslSaturation !== 0 || params.hslLightness !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b)
        const newH = (h + p.hslHue * 360 + 360) % 360
        const newS = Math.max(0, Math.min(1, s + p.hslSaturation * s))
        const newL = Math.max(0, Math.min(1, l + p.hslLightness * 0.5))
        const [nr, ng, nb] = hslToRgb(newH, newS, newL)
        r = nr; g = ng; b = nb
      }

      // ===== 16-18. 互补色通道调整 (cyan-Red, magenta-Green, yellow-Blue) =====
      if (params.cyanRed !== 0) {
        r = Math.min(255, Math.max(0, r + p.cyanRed * 20))
        // Cyan 是减少红色，所以反向影响
        g = Math.min(255, Math.max(0, g - p.cyanRed * 5))
        b = Math.min(255, Math.max(0, b - p.cyanRed * 5))
      }
      if (params.magentaGreen !== 0) {
        g = Math.min(255, Math.max(0, g + p.magentaGreen * 20))
        r = Math.min(255, Math.max(0, r - p.magentaGreen * 5))
        b = Math.min(255, Math.max(0, b - p.magentaGreen * 5))
      }
      if (params.yellowBlue !== 0) {
        b = Math.min(255, Math.max(0, b + p.yellowBlue * 20))
        r = Math.min(255, Math.max(0, r - p.yellowBlue * 5))
        g = Math.min(255, Math.max(0, g - p.yellowBlue * 5))
      }

      // ===== 19. 清晰度 (clarity) — 基于局部对比度增强 =====
      // 简化实现：通过增强边缘对比度来模拟
      if (params.clarity !== 0) {
        const localContrast = Math.abs(r - 128) + Math.abs(g - 128) + Math.abs(b - 128)
        const edgeWeight = Math.min(1, localContrast / 192)
        const factor = 1 + p.clarity * edgeWeight * 0.4
        const mid = 128
        r = Math.min(255, Math.max(0, mid + (r - mid) * factor))
        g = Math.min(255, Math.max(0, mid + (g - mid) * factor))
        b = Math.min(255, Math.max(0, mid + (b - mid) * factor))
      }

      // ===== 20. 褪色 (fade) — 向灰色偏移 =====
      if (params.fade !== 0) {
        const gray = 128 // 中性灰
        r = Math.min(255, Math.max(0, r + (gray - r) * p.fade))
        g = Math.min(255, Math.max(0, g + (gray - g) * p.fade))
        b = Math.min(255, Math.max(0, b + (gray - b) * p.fade))
      }

      data[i] = Math.round(r)
      data[i + 1] = Math.round(g)
      data[i + 2] = Math.round(b)
    }

    ctx.putImageData(imageData, sx, sy)
  }

  // 更新参数
  const updateParam = (key: keyof EditParams, value: number) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)

    // 添加到历史记录
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ ...newParams })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // 撤销
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setParams({ ...history[historyIndex - 1] })
    }
  }

  // 重做
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setParams({ ...history[historyIndex + 1] })
    }
  }

  // 重置参数
  const resetParams = () => {
    const newParams = { ...DEFAULT_PARAMS }
    setParams(newParams)
    const newHistory = [...history, newParams]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // 导出图片
  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 创建导出画布
    const exportCanvas = document.createElement('canvas')
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) return

    // 设置导出尺寸（裁剪后）
    const image = imageRef.current
    if (!image) return

    const sx = params.cropX * image.width
    const sy = params.cropY * image.height
    const sw = params.cropWidth * image.width
    const sh = params.cropHeight * image.height

    exportCanvas.width = sw
    exportCanvas.height = sh

    // 从主画布复制裁剪区域
    exportCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)

    // 转为DataURL并触发下载
    const dataUrl = exportCanvas.toDataURL('image/png', 1.0)
    const link = document.createElement('a')
    link.download = `edited_${Date.now()}.png`
    link.href = dataUrl
    link.click()

    toast.success('图片已导出')
    onSave?.(dataUrl)
  }

  // 设置裁剪比例
  const handleCropRatioChange = (ratio: number | null) => {
    setSelectedCropRatio(ratio)

    if (ratio === null) {
      // 自由裁剪
      return
    }

    // 根据比例调整裁剪框
    const image = imageRef.current
    if (!image) return

    const imgRatio = image.width / image.height
    let newWidth = params.cropWidth
    let newHeight = params.cropHeight

    if (ratio > imgRatio) {
      // 宽度受限
      newWidth = params.cropWidth
      newHeight = newWidth / ratio
    } else {
      // 高度受限
      newHeight = params.cropHeight
      newWidth = newHeight * ratio
    }

    // 居中裁剪
    const newX = params.cropX + (params.cropWidth - newWidth) / 2
    const newY = params.cropY + (params.cropHeight - newHeight) / 2

    updateParam('cropX', Math.max(0, newX))
    updateParam('cropY', Math.max(0, newY))
    updateParam('cropWidth', Math.min(1, newWidth))
    updateParam('cropHeight', Math.min(1, newHeight))
  }

  // 渲染滑块控件
  const renderSlider = (
    label: string,
    paramKey: keyof EditParams,
    icon: React.ReactNode,
    min: number = -100,
    max: number = 100,
    gradient?: string
  ) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm" style={{ color: scheme.textPrimary }}>{label}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: scheme.textSecondary }}>
          {params[paramKey]}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={params[paramKey] as number}
        onChange={(e) => updateParam(paramKey, Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: gradient || scheme.bgHover,
          accentColor: scheme.primary,
        }}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.9)' }}>
      {/* 左侧预览区域 */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{ background: scheme.bgCard }}
        />
      </div>

      {/* 右侧编辑面板 */}
      <div
        className="w-80 flex flex-col overflow-hidden"
        style={{ background: scheme.bgCard }}
      >
        {/* 顶栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: scheme.borderLight }}
        >
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
            onMouseEnter={e => (e.currentTarget.style.background = scheme.bgHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: scheme.textSecondary }}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: scheme.textSecondary }}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={resetParams}
              className="p-2 rounded-lg transition-colors"
              style={{ color: scheme.textSecondary }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{
              background: scheme.primary,
              color: '#ffffff',
            }}
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>

        {/* 标签切换 */}
        <div
          className="flex border-b"
          style={{ borderColor: scheme.borderLight }}
        >
          <button
            onClick={() => setActiveTab('adjust')}
            className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              color: activeTab === 'adjust' ? scheme.primary : scheme.textSecondary,
              borderBottom: activeTab === 'adjust' ? `2px solid ${scheme.primary}` : 'none',
            }}
          >
            <Palette className="w-4 h-4" />
            调色
          </button>
          <button
            onClick={() => setActiveTab('crop')}
            className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              color: activeTab === 'crop' ? scheme.primary : scheme.textSecondary,
              borderBottom: activeTab === 'crop' ? `2px solid ${scheme.primary}` : 'none',
            }}
          >
            <Crop className="w-4 h-4" />
            裁剪
          </button>
        </div>

        {/* 编辑内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'adjust' ? (
            /* 调色面板 — 对标 nikki_albums 20项参数 */
            <div>
              {/* 基础调整 */}
              <div className="mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  基础
                </h4>
              </div>
              {renderSlider('亮度', 'brightness', <Sun className="w-4 h-4" />)}
              {renderSlider('对比度', 'contrast', <Contrast className="w-4 h-4" />)}
              {renderSlider('饱和度', 'saturation', <Droplets className="w-4 h-4" />)}
              {renderSlider('曝光', 'exposure', <Sun className="w-4 h-4" />)}

              {/* 色调调整 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  色调
                </h4>
              </div>
              {renderSlider(
                '色温', 'temperature', <Thermometer className="w-4 h-4" />,
                -100, 100,
                'linear-gradient(to right, #3B82F6, #F97316)'
              )}
              {renderSlider(
                '色调', 'tint', <Sparkles className="w-4 h-4" />,
                -100, 100,
                'linear-gradient(to right, #84CC16, #A855F7)'
              )}

              {/* 光线调整 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  光线
                </h4>
              </div>
              {renderSlider('感光度', 'lightSense', <Eye className="w-4 h-4" />)}
              {renderSlider('高光', 'highlights', <Sun className="w-4 h-4" />)}
              {renderSlider('阴影', 'shadows', <Sun className="w-4 h-4" />)}
              {renderSlider('白色', 'whites', <Circle className="w-4 h-4" />)}
              {renderSlider('黑色', 'blacks', <Circle className="w-4 h-4" />)}

              {/* 细节调整 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  细节
                </h4>
              </div>
              {renderSlider('清晰度', 'clarity', <Sparkles className="w-4 h-4" />)}
              {renderSlider('自然饱和度', 'vibrance', <Droplets className="w-4 h-4" />)}

              {/* HSL 调整 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  HSL
                </h4>
              </div>
              {renderSlider('HSL 色相', 'hslHue', <Palette className="w-4 h-4" />)}
              {renderSlider('HSL 饱和度', 'hslSaturation', <Droplets className="w-4 h-4" />)}
              {renderSlider('HSL 亮度', 'hslLightness', <Sun className="w-4 h-4" />)}

              {/* 色彩通道 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  色彩通道
                </h4>
              </div>
              {renderSlider(
                '青 ↔ 红', 'cyanRed', <Layers className="w-4 h-4" />,
                -100, 100,
                'linear-gradient(to right, #06B6D4, #EF4444)'
              )}
              {renderSlider(
                '品红 ↔ 绿', 'magentaGreen', <Layers className="w-4 h-4" />,
                -100, 100,
                'linear-gradient(to right, #D946EF, #22C55E)'
              )}
              {renderSlider(
                '黄 ↔ 蓝', 'yellowBlue', <Layers className="w-4 h-4" />,
                -100, 100,
                'linear-gradient(to right, #EAB308, #3B82F6)'
              )}

              {/* 效果 */}
              <div className="mt-4 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: scheme.textTertiary || scheme.textSecondary }}>
                  效果
                </h4>
              </div>
              {renderSlider('褪色', 'fade', <Eye className="w-4 h-4" />, 0, 100)}
            </div>
          ) : (
            /* 裁剪面板 */
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: scheme.textPrimary }}>
                裁剪比例
              </h4>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CROP_RATIOS.map((ratio) => (
                  <button
                    key={ratio.name}
                    onClick={() => handleCropRatioChange(ratio.value)}
                    className="px-2 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: selectedCropRatio === ratio.value ? scheme.primaryLight : scheme.bgHover,
                      color: selectedCropRatio === ratio.value ? scheme.primary : scheme.textSecondary,
                    }}
                  >
                    {ratio.name}
                  </button>
                ))}
              </div>

              <h4 className="text-sm font-medium mb-3" style={{ color: scheme.textPrimary }}>
                旋转
              </h4>
              {renderSlider('旋转角度', 'rotation', <RotateCcw className="w-4 h-4" />, -180, 180)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
