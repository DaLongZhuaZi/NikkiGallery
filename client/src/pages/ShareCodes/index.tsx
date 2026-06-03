import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Download, Upload, X, ClipboardPaste } from 'lucide-react'
import { useShareStore } from '@/stores/useShareStore'
import { useTheme } from '@/contexts/ThemeContext'
import ShareCard from '@/components/share/ShareCard'
import ShareCodeModal from '@/components/share/ShareCodeModal'
import { importShareCodes, exportShareCodes } from '@/api/share'
import toast from 'react-hot-toast'

export default function ShareCodesPage() {
  const { shareCodes, fetchShareCodes, loading, filter, setFilter } = useShareStore()
  const { scheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    fetchShareCodes()
  }, [fetchShareCodes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilter({ search: searchQuery })
  }

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type)
    setFilter({ type: type === 'all' ? undefined : type as any })
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error('请输入分享码')
      return
    }
    setIsImporting(true)
    try {
      // 支持逗号/换行/空格分隔
      const codes = importText
        .split(/[\n,\s]+/)
        .map(c => c.trim())
        .filter(c => c.length > 0)
      if (codes.length === 0) {
        toast.error('未检测到有效的分享码')
        setIsImporting(false)
        return
      }
      await importShareCodes(codes)
      toast.success(`成功导入 ${codes.length} 个分享码`)
      setShowImportModal(false)
      setImportText('')
      fetchShareCodes()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '导入失败')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportShareCodes()
      toast.success('导出成功')
    } catch (err: any) {
      toast.error('导出失败')
    }
  }

  const shareCodeTypes = [
    { value: 'all', label: '全部' },
    { value: 'dye', label: '染色码' },
    { value: 'home', label: '家园码' },
    { value: 'camera', label: '相机码' },
    { value: 'diy', label: 'DIY码' },
    { value: 'combo', label: '套装码' },
  ]

  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  return (
    <div className="page-transition">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: scheme.textPrimary }}>
            分享码管理
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            管理您的染色码、家园码、相机参数码等
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: scheme.textSecondary,
              backgroundColor: scheme.bgCard,
              border: `1px solid ${scheme.border}`,
            }}
          >
            <Upload className="w-4 h-4" />
            导入
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: scheme.textSecondary,
              backgroundColor: scheme.bgCard,
              border: `1px solid ${scheme.border}`,
            }}
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
              boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
            }}
          >
            <Plus className="w-4 h-4" />
            添加分享码
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="rounded-xl p-4 mb-6" style={cardStyle}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: scheme.textTertiary }} />
              <input
                type="text"
                placeholder="搜索分享码、名称、描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
                onFocus={e => (e.target.style.borderColor = scheme.borderFocus)}
                onBlur={e => (e.target.style.borderColor = scheme.border)}
              />
            </div>
          </form>

          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: scheme.textTertiary }} />
            <div className="flex flex-wrap gap-2">
              {shareCodeTypes.map((type) => {
                const isActive = typeFilter === type.value
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeFilter(type.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: isActive ? scheme.primary : scheme.bgHover,
                      color: isActive ? '#ffffff' : scheme.textSecondary,
                      border: `1px solid ${isActive ? 'transparent' : scheme.borderLight}`,
                      boxShadow: isActive ? `0 2px 8px ${scheme.primary}44` : 'none',
                    }}
                  >
                    {type.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 分享码列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: scheme.primary }} />
        </div>
      ) : shareCodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shareCodes.map((shareCode) => (
            <ShareCard key={shareCode.id} shareCode={shareCode} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
            style={{ backgroundColor: scheme.bgHover }}
          >
            <Plus className="w-8 h-8" style={{ color: scheme.textTertiary }} />
          </div>
          <p style={{ color: scheme.textSecondary }}>暂无分享码</p>
          <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>点击上方按钮添加分享码</p>
        </div>
      )}

      {isModalOpen && <ShareCodeModal onClose={() => setIsModalOpen(false)} />}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportModal(false)}>
          <div
            className="w-full max-w-lg p-6 rounded-2xl shadow-xl"
            style={{ background: scheme.bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: scheme.textPrimary }}>导入分享码</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: scheme.textSecondary }} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                粘贴分享码（支持逗号、换行、空格分隔多个）
              </label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="例如:&#10;ABC123, DEF456&#10;GHI789"
                rows={6}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none transition-all font-mono"
                style={{
                  backgroundColor: scheme.bgInput || scheme.bgHover,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
              />
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                支持染色码、家园码、相机码、DIY码、套装码
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ color: scheme.textSecondary }}
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }}
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ClipboardPaste className="w-4 h-4" />
                )}
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
