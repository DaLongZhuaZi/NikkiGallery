import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Download, Upload } from 'lucide-react'
import { useShareStore } from '@/stores/useShareStore'
import { useTheme } from '@/contexts/ThemeContext'
import ShareCard from '@/components/share/ShareCard'
import toast from 'react-hot-toast'

export default function ShareCodesPage() {
  const { shareCodes, fetchShareCodes, loading, filter, setFilter } = useShareStore()
  const { scheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

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

  const handleImport = () => {
    toast.success('导入功能开发中')
  }

  const handleExport = () => {
    toast.success('导出功能开发中')
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
            onClick={handleImport}
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
    </div>
  )
}
