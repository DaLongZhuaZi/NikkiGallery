import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tag as TagIcon,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  TrendingUp,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useImageStore } from '@/stores/useImageStore'
import * as tagApi from '@/api/tags'
import type { Tag, TagStats, CreateTagDTO } from '@/api/tags'
import toast from 'react-hot-toast'

const TAG_TYPES: { value: Tag['type'] | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: '#6b7280' },
  { value: 'ai', label: 'AI标签', color: '#8b5cf6' },
  { value: 'user', label: '用户标签', color: '#3b82f6' },
  { value: 'system', label: '系统标签', color: '#64748b' },
  { value: 'scene', label: '场景', color: '#10b981' },
  { value: 'clothing', label: '服饰', color: '#ec4899' },
  { value: 'action', label: '动作', color: '#f59e0b' },
]

const TYPE_COLORS: Record<string, string> = {
  ai: '#8b5cf6',
  user: '#3b82f6',
  system: '#64748b',
  scene: '#10b981',
  clothing: '#ec4899',
  action: '#f59e0b',
}

export default function TagsPage() {
  const { scheme } = useTheme()
  const navigate = useNavigate()
  const { setFilter } = useImageStore()

  const [tags, setTags] = useState<Tag[]>([])
  const [stats, setStats] = useState<TagStats>({ total: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<Tag['type'] | 'all'>('all')

  // 编辑/创建弹窗
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState<CreateTagDTO>({
    nameZh: '', nameEn: '', type: 'user', category: '', color: '', icon: '',
  })
  const [saving, setSaving] = useState(false)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const [tagsData, statsData] = await Promise.all([
        tagApi.getTags(typeFilter === 'all' ? undefined : typeFilter),
        tagApi.getTagStats(),
      ])
      setTags(tagsData)
      setStats(statsData)
    } catch (err) {
      toast.error('加载标签失败')
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { loadTags() }, [loadTags])

  const filteredTags = tags.filter(t =>
    t.nameZh.includes(searchQuery) ||
    t.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = () => {
    setEditingTag(null)
    setFormData({ nameZh: '', nameEn: '', type: 'user', category: '', color: '', icon: '' })
    setShowModal(true)
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      nameZh: tag.nameZh,
      nameEn: tag.nameEn,
      type: tag.type,
      category: tag.category || '',
      color: tag.color || '',
      icon: tag.icon || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.nameZh.trim() || !formData.nameEn.trim()) {
      toast.error('请填写中英文标签名')
      return
    }
    setSaving(true)
    try {
      if (editingTag) {
        await tagApi.updateTag(editingTag.id, formData)
        toast.success('标签已更新')
      } else {
        await tagApi.createTag(formData)
        toast.success('标签已创建')
      }
      setShowModal(false)
      loadTags()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await tagApi.deleteTag(deleteTarget.id)
      toast.success('标签已删除')
      setDeleteTarget(null)
      loadTags()
    } catch {
      toast.error('删除失败')
    }
  }

  const handleTagClick = (tag: Tag) => {
    // 按标签筛选图片，跳转相册
    setFilter({ tags: [tag.id], page: 1, albumId: undefined })
    navigate('/gallery')
  }

  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  return (
    <div className="page-transition max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <TagIcon className="w-6 h-6" />
            标签管理
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            共 {stats.total} 个标签，管理 AI 识别和用户自定义标签
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
            boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
          }}
        >
          <Plus className="w-4 h-4" />
          创建标签
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {TAG_TYPES.map(t => {
          const count = t.value === 'all' ? stats.total : (stats.byType[t.value] || 0)
          return (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className="p-3 rounded-xl text-center transition-all duration-200 hover:-translate-y-0.5"
              style={{
                ...cardStyle,
                borderColor: typeFilter === t.value ? t.color : scheme.borderLight,
                borderWidth: typeFilter === t.value ? '2px' : '1px',
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: t.color }}>{t.label}</p>
              <p className="text-lg font-bold" style={{ color: scheme.textPrimary }}>{count}</p>
            </button>
          )
        })}
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
            style={{
              background: scheme.bgCard,
              border: `1px solid ${scheme.borderLight}`,
              color: scheme.textPrimary,
            }}
          />
        </div>
      </div>

      {/* 标签列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={cardStyle}>
          <TagIcon className="w-16 h-16 mb-4" style={{ color: scheme.textTertiary }} />
          <p className="text-lg font-medium" style={{ color: scheme.textSecondary }}>
            {searchQuery ? '没有找到匹配的标签' : '暂无标签'}
          </p>
          <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>
            点击"创建标签"添加新标签，或使用 AI 处理自动生成标签
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTags.map(tag => (
            <div
              key={tag.id}
              className="group p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={cardStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => handleTagClick(tag)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || TYPE_COLORS[tag.type] || '#6b7280' }}
                    />
                    <span className="font-semibold text-sm truncate" style={{ color: scheme.textPrimary }}>
                      {tag.nameZh}
                    </span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `${TYPE_COLORS[tag.type] || '#6b7280'}20`,
                        color: TYPE_COLORS[tag.type] || '#6b7280',
                      }}
                    >
                      {tag.type}
                    </span>
                  </div>
                  <p className="text-xs truncate mb-2" style={{ color: scheme.textTertiary }}>
                    {tag.nameEn}
                    {tag.category && <span className="ml-2 opacity-60">· {tag.category}</span>}
                  </p>
                  <div className="flex items-center gap-1 text-xs" style={{ color: scheme.textTertiary }}>
                    <TrendingUp className="w-3 h-3" />
                    <span>使用 {tag.usageCount} 次</span>
                  </div>
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                    style={{ color: scheme.textSecondary }}
                    title="编辑"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(tag)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                    style={{ color: scheme.error }}
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-md p-6 rounded-2xl shadow-xl"
            style={{ background: scheme.bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: scheme.textPrimary }}>
                {editingTag ? '编辑标签' : '创建标签'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: scheme.textSecondary }} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>中文名</label>
                  <input
                    type="text"
                    value={formData.nameZh}
                    onChange={e => setFormData({ ...formData, nameZh: e.target.value })}
                    placeholder="例：花海"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                    style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>英文名</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g. flower_sea"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                    style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>类型</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Tag['type'] })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                    style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                  >
                    {TAG_TYPES.filter(t => t.value !== 'all').map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>分类</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder="可选"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                    style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>颜色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color || '#6b7280'}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={formData.color || ''}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#hex"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all font-mono"
                      style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>图标 (emoji)</label>
                  <input
                    type="text"
                    value={formData.icon || ''}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🌸"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                    style={{ background: scheme.bgInput || scheme.bgHover, border: `1px solid ${scheme.border}`, color: scheme.textPrimary }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ color: scheme.textSecondary }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingTag ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-sm p-6 rounded-2xl shadow-xl"
            style={{ background: scheme.bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: scheme.textPrimary }}>删除标签</h3>
            <p className="text-sm mb-6" style={{ color: scheme.textSecondary }}>
              确定要删除标签 <span className="font-semibold" style={{ color: scheme.textPrimary }}>「{deleteTarget.nameZh}」</span> 吗？
              已关联的图片标签关系不会被撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ color: scheme.textSecondary }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: scheme.error }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
