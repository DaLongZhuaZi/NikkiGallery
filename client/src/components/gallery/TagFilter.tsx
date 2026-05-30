import { useState, useEffect } from 'react'
import { Tag, X, Sparkles } from 'lucide-react'
import { useAIStore } from '@/stores/useAIStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useImageStore } from '@/stores/useImageStore'
import clsx from 'clsx'

export default function TagFilter() {
  const { tags, fetchTags } = useAIStore()
  const { scheme } = useTheme()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  const { setFilter } = useImageStore()

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
      setFilter({ tags: newTags, page: 1 })
      return newTags
    })
  }

  const clearFilters = () => {
    setSelectedTags([])
    setFilter({ tags: [], page: 1 })
  }

  const displayTags = isExpanded ? tags : tags.slice(0, 10)

  return (
    <div
      className="rounded-xl p-4 mb-6 transition-all duration-300"
      style={{
        backgroundColor: scheme.bgCard,
        border: `1px solid ${scheme.borderLight}`,
        boxShadow: scheme.shadowSm,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: scheme.primaryLight }}
          >
            <Tag className="w-3.5 h-3.5" style={{ color: scheme.primary }} />
          </div>
          <span className="text-sm font-medium" style={{ color: scheme.textPrimary }}>标签筛选</span>
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: scheme.textTertiary }}
            onMouseEnter={e => {
              e.currentTarget.style.color = scheme.textPrimary
              e.currentTarget.style.backgroundColor = scheme.bgHover
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = scheme.textTertiary
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X className="w-3 h-3" />
            清除筛选
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                'hover:scale-105 active:scale-95'
              )}
              style={{
                backgroundColor: isSelected ? scheme.primary : scheme.bgHover,
                color: isSelected ? '#ffffff' : scheme.textSecondary,
                border: `1px solid ${isSelected ? 'transparent' : scheme.borderLight}`,
                boxShadow: isSelected ? `0 2px 8px ${scheme.primary}44` : 'none',
              }}
            >
              {tag.nameZh || tag.nameEn}
            </button>
          )
        })}

        {tags.length > 10 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: scheme.bgHover,
              color: scheme.textTertiary,
              border: `1px solid ${scheme.borderLight}`,
            }}
          >
            {isExpanded ? '收起' : `+${tags.length - 10} 更多`}
          </button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: `1px solid ${scheme.borderLight}` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3" style={{ color: scheme.primary }} />
            <p className="text-xs" style={{ color: scheme.textTertiary }}>已选标签</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagId) => {
              const tag = tags.find(t => t.id === tagId)
              return tag ? (
                <span
                  key={tagId}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.gradientStart}20, ${scheme.gradientEnd}20)`,
                    color: scheme.primary,
                    border: `1px solid ${scheme.gradientStart}30`,
                  }}
                >
                  {tag.nameZh || tag.nameEn}
                  <button
                    onClick={() => toggleTag(tagId)}
                    className="ml-0.5 rounded-full p-0.5 transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${scheme.primary}20`)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
