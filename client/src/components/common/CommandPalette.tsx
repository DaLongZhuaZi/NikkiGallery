import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext'
import { scanAll } from '@/api/album'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  Search,
  Home,
  Image,
  Map,
  Shirt,
  Tags,
  Copy,
  Camera,
  Film,
  Sparkles,
  FolderOpen,
  UserCircle,
  Puzzle,
  Wifi,
  Share2,
  Archive,
  LayoutDashboard,
  Trash2,
  Settings,
  RefreshCw,
  Palette,
  Zap,
  Droplet,
  Star,
  Moon,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemType = 'page' | 'action' | 'theme'

interface CommandItem {
  id: string
  type: ItemType
  label: string
  description?: string
  icon: React.ReactNode
  /** For pages: the route path. For actions/themes: an arbitrary action key. */
  value: string
}

interface GroupedItems {
  label: string
  items: CommandItem[]
}

// ─── Static data ─────────────────────────────────────────────────────────────

const pageItems: CommandItem[] = [
  { id: 'page-/', type: 'page', label: '首页', icon: <Home className="w-4 h-4" />, value: '/' },
  { id: 'page-/gallery', type: 'page', label: '相册', icon: <Image className="w-4 h-4" />, value: '/gallery' },
  { id: 'page-/map', type: 'page', label: '地图', icon: <Map className="w-4 h-4" />, value: '/map' },
  { id: 'page-/wardrobe', type: 'page', label: '衣柜', icon: <Shirt className="w-4 h-4" />, value: '/wardrobe' },
  { id: 'page-/tags', type: 'page', label: '标签管理', icon: <Tags className="w-4 h-4" />, value: '/tags' },
  { id: 'page-/dedup', type: 'page', label: '智能去重', icon: <Copy className="w-4 h-4" />, value: '/dedup' },
  { id: 'page-/live-photo', type: 'page', label: '实况照片', icon: <Camera className="w-4 h-4" />, value: '/live-photo' },
  { id: 'page-/gif-converter', type: 'page', label: 'MP4转GIF', icon: <Film className="w-4 h-4" />, value: '/gif-converter' },
  { id: 'page-/ai-process', type: 'page', label: 'AI处理', icon: <Sparkles className="w-4 h-4" />, value: '/ai-process' },
  { id: 'page-/resources', type: 'page', label: '游戏资源', icon: <FolderOpen className="w-4 h-4" />, value: '/resources' },
  { id: 'page-/accounts', type: 'page', label: '账号管理', icon: <UserCircle className="w-4 h-4" />, value: '/accounts' },
  { id: 'page-/plugins', type: 'page', label: '插件管理', icon: <Puzzle className="w-4 h-4" />, value: '/plugins' },
  { id: 'page-/transfer', type: 'page', label: '局域网传输', icon: <Wifi className="w-4 h-4" />, value: '/transfer' },
  { id: 'page-/share-codes', type: 'page', label: '分享码', icon: <Share2 className="w-4 h-4" />, value: '/share-codes' },
  { id: 'page-/archives', type: 'page', label: '归档管理', icon: <Archive className="w-4 h-4" />, value: '/archives' },
  { id: 'page-/dashboard', type: 'page', label: '系统监控', icon: <LayoutDashboard className="w-4 h-4" />, value: '/dashboard' },
  { id: 'page-/trash', type: 'page', label: '回收站', icon: <Trash2 className="w-4 h-4" />, value: '/trash' },
  { id: 'page-/settings', type: 'page', label: '设置', icon: <Settings className="w-4 h-4" />, value: '/settings' },
]

const themeMeta: { mode: ThemeMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { mode: 'nikki-fantasy', label: '幻梦奇缘', desc: '粉色梦幻', icon: <Sparkles className="w-4 h-4" /> },
  { mode: 'cyber-neon', label: '赛博霓虹', desc: '赛博朋克', icon: <Zap className="w-4 h-4" /> },
  { mode: 'crystal-palace', label: '水晶神殿', desc: '清新通透', icon: <Droplet className="w-4 h-4" /> },
  { mode: 'starry-night', label: '奇想星海', desc: '璀璨银河', icon: <Star className="w-4 h-4" /> },
  { mode: 'abyss-dark', label: '深渊余烬', desc: '暗黑深沉', icon: <Moon className="w-4 h-4" /> },
]

const actionItems: CommandItem[] = [
  {
    id: 'action-scan',
    type: 'action',
    label: '扫描相册',
    description: '扫描所有已配置的截图文件夹',
    icon: <RefreshCw className="w-4 h-4" />,
    value: 'scan',
  },
  {
    id: 'action-theme',
    type: 'action',
    label: '切换主题',
    description: '浏览并切换应用主题',
    icon: <Palette className="w-4 h-4" />,
    value: 'theme-picker',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Fast path: substring match
  if (lowerText.includes(lowerQuery)) return true

  // Character-by-character fuzzy match: each query char must appear
  // in order within the text, but not necessarily contiguous
  let idx = 0
  for (const ch of lowerQuery) {
    const found = lowerText.indexOf(ch, idx)
    if (found === -1) return false
    idx = found + 1
  }
  return true
}

function matchItem(item: CommandItem, query: string): boolean {
  if (!query) return true
  if (fuzzyMatch(item.label, query)) return true
  if (item.description && fuzzyMatch(item.description, query)) return true
  return false
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const navigate = useNavigate()
  const { scheme, mode: currentMode, setMode } = useTheme()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredPages = useMemo(
    () => pageItems.filter((item) => matchItem(item, query)),
    [query],
  )

  const filteredActions = useMemo(
    () => actionItems.filter((item) => matchItem(item, query)),
    [query],
  )

  const filteredThemes = useMemo(() => {
    const items: CommandItem[] = themeMeta.map((t) => ({
      id: `theme-${t.mode}`,
      type: 'theme',
      label: t.label,
      description: t.desc,
      icon: t.icon,
      value: t.mode,
    }))
    return items.filter((item) => matchItem(item, query))
  }, [query])

  const groups: GroupedItems[] = useMemo(() => {
    const result: GroupedItems[] = []
    if (filteredPages.length) result.push({ label: '页面', items: filteredPages })
    if (filteredActions.length) result.push({ label: '操作', items: filteredActions })
    if (filteredThemes.length) result.push({ label: '主题', items: filteredThemes })
    return result
  }, [filteredPages, filteredActions, filteredThemes])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // ── Scroll active item into view ─────────────────────────────────────────

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // ── Open / close ─────────────────────────────────────────────────────────

  const openPalette = useCallback(() => {
    setQuery('')
    setOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const togglePalette = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setQuery('')
      }
      return !prev
    })
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      // Small delay to let the DOM render
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // ── Keyboard shortcut listener ───────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePalette])

  // ── Custom event listener (from Header) ──────────────────────────────────

  useEffect(() => {
    const handler = () => openPalette()
    window.addEventListener('command-palette-open', handler)
    return () => window.removeEventListener('command-palette-open', handler)
  }, [openPalette])

  // ── Lock body scroll when open ───────────────────────────────────────────

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // ── Execute a command ────────────────────────────────────────────────────

  const execute = useCallback(
    (item: CommandItem) => {
      closePalette()

      switch (item.type) {
        case 'page':
          navigate(item.value)
          break

        case 'action':
          if (item.value === 'scan') {
            toast.promise(scanAll(), {
              loading: '正在扫描相册...',
              success: '相册扫描完成!',
              error: '扫描失败，请重试',
            })
          }
          // 'theme-picker' is just a shortcut that expands themes — already
          // handled by the themes group; selecting this item does nothing extra.
          break

        case 'theme':
          setMode(item.value as ThemeMode)
          toast.success(`主题已切换为「${item.label}」`)
          break
      }
    },
    [closePalette, navigate, setMode],
  )

  // ── Keyboard navigation inside the palette ───────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((i) => (i + 1) % Math.max(flatItems.length, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((i) => (i - 1 + flatItems.length) % Math.max(flatItems.length, 1))
          break
        case 'Enter':
          e.preventDefault()
          if (flatItems[activeIndex]) {
            execute(flatItems[activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          closePalette()
          break
      }
    },
    [flatItems, activeIndex, execute, closePalette],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) return null

  let flatIndex = -1

  return (
    /* Portal-like: fixed overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center"
      style={{ paddingTop: '15vh' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={closePalette}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 560,
          margin: '0 16px',
          background: scheme.bgCard,
          backdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
          WebkitBackdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
          border: `1px solid ${scheme.border}`,
          boxShadow: scheme.shadowLg,
          animation: 'cmd-palette-enter 0.18s ease-out',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* ── Search input area ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: `1px solid ${scheme.borderLight}` }}
        >
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: scheme.textTertiary }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面、操作、主题..."
            className="cmd-palette-input flex-1 py-4 bg-transparent outline-none text-base"
            style={{
              color: scheme.textPrimary,
              caretColor: scheme.primary,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md transition-colors flex-shrink-0"
              style={{ color: scheme.textTertiary }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = scheme.bgHover
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Shortcut hint */}
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0 select-none"
            style={{
              color: scheme.textTertiary,
              border: `1px solid ${scheme.borderLight}`,
              backgroundColor: scheme.bgHover,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* ── Results list ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: 360 }}
        >
          {flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-8 h-8 mb-3" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>
                没有找到匹配的结果
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div
                  className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: scheme.textTertiary }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  flatIndex++
                  const isActive = flatIndex === activeIndex
                  const isCurrentTheme =
                    item.type === 'theme' && item.value === currentMode

                  return (
                    <div
                      key={item.id}
                      data-active={isActive}
                      role="option"
                      aria-selected={isActive}
                      className={clsx(
                        'flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-100',
                      )}
                      style={{
                        backgroundColor: isActive ? scheme.bgHover : 'transparent',
                      }}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isActive
                            ? scheme.primaryLight
                            : scheme.bgHover,
                          color: isActive ? scheme.primary : scheme.textSecondary,
                        }}
                      >
                        {item.icon}
                      </div>

                      {/* Label & description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium truncate"
                            style={{
                              color: isActive
                                ? scheme.textPrimary
                                : scheme.textSecondary,
                            }}
                          >
                            {item.label}
                          </span>
                          {isCurrentTheme && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: scheme.primaryLight,
                                color: scheme.primary,
                              }}
                            >
                              当前
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: scheme.textTertiary }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right-side indicator for active item */}
                      {isActive && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <CornerDownLeft
                            className="w-3.5 h-3.5"
                            style={{ color: scheme.textTertiary }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer with keyboard hints ────────────────────────────────── */}
        {flatItems.length > 0 && (
          <div
            className="flex items-center gap-4 px-4 py-2.5 text-[11px]"
            style={{
              borderTop: `1px solid ${scheme.borderLight}`,
              color: scheme.textTertiary,
            }}
          >
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              导航
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="font-mono px-1 py-0.5 rounded"
                style={{
                  border: `1px solid ${scheme.borderLight}`,
                  backgroundColor: scheme.bgHover,
                }}
              >
                esc
              </kbd>
              关闭
            </span>
          </div>
        )}
      </div>

      {/* Scoped animation keyframes */}
      <style>{`
        @keyframes cmd-palette-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .cmd-palette-input::placeholder {
          color: ${scheme.textTertiary};
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}
