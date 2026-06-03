import { useState } from 'react'
import {
  Camera,
  FolderOpen,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Film,
  Image,
  ArrowRight,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import * as livePhotoApi from '@/api/livePhoto'
import type { PairedFile, BatchExportResult } from '@/api/livePhoto'
import toast from 'react-hot-toast'

type TabKey = 'scan' | 'single'

export default function LivePhotoPage() {
  const { scheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('scan')

  // 扫描配对
  const [scanDir, setScanDir] = useState('')
  const [pairs, setPairs] = useState<PairedFile[]>([])
  const [isScanning, setIsScanning] = useState(false)

  // 批量导出
  const [batchInputDir, setBatchInputDir] = useState('')
  const [batchOutputDir, setBatchOutputDir] = useState('')
  const [isBatchExporting, setIsBatchExporting] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchExportResult | null>(null)

  // 单个导出
  const [coverPath, setCoverPath] = useState('')
  const [videoPath, setVideoPath] = useState('')
  const [singleOutputPath, setSingleOutputPath] = useState('')
  const [isSingleExporting, setIsSingleExporting] = useState(false)
  const [singleResult, setSingleResult] = useState<string | null>(null)

  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  const inputStyle = {
    background: scheme.bgInput || scheme.bgHover,
    border: `1px solid ${scheme.border}`,
    color: scheme.textPrimary,
  }

  // 扫描配对文件
  const handleScan = async () => {
    if (!scanDir.trim()) {
      toast.error('请输入目录路径')
      return
    }
    setIsScanning(true)
    setPairs([])
    try {
      const result = await livePhotoApi.findPairedFiles(scanDir.trim())
      setPairs(result.pairs)
      if (result.count === 0) {
        toast('未找到配对的图片和视频文件', { icon: 'ℹ️' })
      } else {
        toast.success(`找到 ${result.count} 对实况照片`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '扫描失败')
    } finally {
      setIsScanning(false)
    }
  }

  // 批量导出
  const handleBatchExport = async () => {
    if (!batchInputDir.trim()) {
      toast.error('请输入输入目录')
      return
    }
    setIsBatchExporting(true)
    setBatchResult(null)
    try {
      const result = await livePhotoApi.batchExportLivePhotos(
        batchInputDir.trim(),
        batchOutputDir.trim() || undefined,
      )
      setBatchResult(result)
      toast.success(`已导出 ${result.exported} 个实况照片`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '批量导出失败')
    } finally {
      setIsBatchExporting(false)
    }
  }

  // 单个导出
  const handleSingleExport = async () => {
    if (!coverPath.trim() || !videoPath.trim()) {
      toast.error('请填写图片路径和视频路径')
      return
    }
    setIsSingleExporting(true)
    setSingleResult(null)
    try {
      const result = await livePhotoApi.exportLivePhoto(
        coverPath.trim(),
        videoPath.trim(),
        singleOutputPath.trim() || undefined,
      )
      setSingleResult(result.outputPath)
      toast.success('实况照片导出成功')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '导出失败')
    } finally {
      setIsSingleExporting(false)
    }
  }

  return (
    <div className="page-transition max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
          <Camera className="w-6 h-6" />
          实况照片 (Live Photo)
        </h1>
        <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
          将游戏截图与对应视频配对，导出为 Google Motion Photo 格式的实况照片
        </p>
      </div>

      {/* 使用说明 */}
      <div className="p-4 rounded-xl mb-6" style={{ background: `${scheme.info}10`, border: `1px solid ${scheme.info}30` }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: scheme.info }} />
          <div className="text-sm" style={{ color: scheme.textSecondary }}>
            <p className="font-medium mb-1" style={{ color: scheme.textPrimary }}>使用说明</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>无限暖暖拍照时会自动生成同名的 <code className="px-1 rounded" style={{ background: scheme.bgHover }}>.jpg</code> 和 <code className="px-1 rounded" style={{ background: scheme.bgHover }}>.mp4</code> 文件</li>
              <li>本工具会自动查找目录中配对的图片和视频，并将它们合并为 Google Motion Photo 格式</li>
              <li>导出的实况照片可在 Google Photos、iOS 相册中查看动态效果</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex rounded-xl p-1 mb-6" style={{ background: scheme.bgHover }}>
        <button
          onClick={() => setActiveTab('scan')}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: activeTab === 'scan' ? scheme.bgCard : 'transparent',
            color: activeTab === 'scan' ? scheme.textPrimary : scheme.textSecondary,
            boxShadow: activeTab === 'scan' ? scheme.shadowSm : 'none',
          }}
        >
          <FolderOpen className="w-4 h-4" />
          扫描目录 & 批量导出
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: activeTab === 'single' ? scheme.bgCard : 'transparent',
            color: activeTab === 'single' ? scheme.textPrimary : scheme.textSecondary,
            boxShadow: activeTab === 'single' ? scheme.shadowSm : 'none',
          }}
        >
          <Camera className="w-4 h-4" />
          单个导出
        </button>
      </div>

      {/* 扫描 & 批量导出 */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {/* 扫描配对 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <Search className="w-4 h-4" />
              扫描配对文件
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                  截图目录路径
                </label>
                <input
                  type="text"
                  value={scanDir}
                  onChange={e => setScanDir(e.target.value)}
                  placeholder="例如: D:\Games\Nikki\Screenshots"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }}
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isScanning ? '扫描中...' : '开始扫描'}
              </button>
            </div>

            {/* 配对结果 */}
            {pairs.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                    找到 {pairs.length} 对配对文件
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {pairs.map((pair, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg text-xs"
                      style={{ background: scheme.bgHover }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Image className="w-4 h-4 flex-shrink-0 text-blue-500" />
                        <span className="truncate" style={{ color: scheme.textSecondary }}>{pair.coverImage}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: scheme.textTertiary }} />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Film className="w-4 h-4 flex-shrink-0 text-purple-500" />
                        <span className="truncate" style={{ color: scheme.textSecondary }}>{pair.video}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 批量导出 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <Download className="w-4 h-4" />
              批量导出
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>输入目录</label>
                <input
                  type="text"
                  value={batchInputDir}
                  onChange={e => setBatchInputDir(e.target.value)}
                  placeholder="包含配对图片和视频的目录"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>输出目录 (可选)</label>
                <input
                  type="text"
                  value={batchOutputDir}
                  onChange={e => setBatchOutputDir(e.target.value)}
                  placeholder="留空则导出到输入目录"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleBatchExport}
                disabled={isBatchExporting}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }}
              >
                {isBatchExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isBatchExporting ? '导出中...' : '批量导出实况照片'}
              </button>
            </div>

            {/* 导出结果 */}
            {batchResult && (
              <div className="mt-5 p-4 rounded-lg" style={{ background: scheme.bgHover }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium" style={{ color: scheme.textPrimary }}>导出完成</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: scheme.textSecondary }}>
                  <div>成功: <span className="font-bold text-green-600">{batchResult.exported}</span></div>
                  <div>失败: <span className="font-bold text-red-500">{batchResult.failed}</span></div>
                </div>
                {batchResult.errors.length > 0 && (
                  <div className="mt-2 text-xs space-y-1">
                    {batchResult.errors.map((err, i) => (
                      <p key={i} className="text-red-500">• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 单个导出 */}
      {activeTab === 'single' && (
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Camera className="w-4 h-4" />
            单个实况照片导出
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>封面图片路径</label>
              <input
                type="text"
                value={coverPath}
                onChange={e => setCoverPath(e.target.value)}
                placeholder="例如: D:\Screenshots\photo_001.jpg"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>视频路径</label>
              <input
                type="text"
                value={videoPath}
                onChange={e => setVideoPath(e.target.value)}
                placeholder="例如: D:\Screenshots\photo_001.mp4"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>输出目录 (可选)</label>
              <input
                type="text"
                value={singleOutputPath}
                onChange={e => setSingleOutputPath(e.target.value)}
                placeholder="留空则输出到图片所在目录"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleSingleExport}
              disabled={isSingleExporting}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }}
            >
              {isSingleExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isSingleExporting ? '导出中...' : '导出实况照片'}
            </button>
          </div>

          {singleResult && (
            <div className="mt-5 p-4 rounded-lg" style={{ background: `${scheme.success}10` }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium" style={{ color: scheme.textPrimary }}>导出成功</span>
              </div>
              <p className="text-xs mt-2 font-mono truncate" style={{ color: scheme.textSecondary }}>
                {singleResult}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
