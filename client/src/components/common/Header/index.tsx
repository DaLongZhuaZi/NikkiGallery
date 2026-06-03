import { useState, useRef, useCallback, useEffect, useMemo, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, RefreshCw, X } from 'lucide-react'
import clsx from 'clsx'
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useImageStore } from '@/stores/useImageStore'
import { scanAll } from '@/api/album'
import toast from 'react-hot-toast'
import NotificationPanel from '@/components/common/NotificationPanel'

interface HeaderProps {
  onMenuClick: () => void
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; color: string }[] = [
  { mode: 'nikki-fantasy', label: '幻梦', color: '#f472b6' },
  { mode: 'cyber-neon', label: '赛博', color: '#00f0ff' },
  { mode: 'crystal-palace', label: '水晶', color: '#2dd4bf' },
  { mode: 'starry-night', label: '星海', color: '#a78bfa' },
  { mode: 'abyss-dark', label: '深渊', color: '#ef4444' },
]

const ROUTE_LABELS: Record<string, string> = {
  '/': '首页',
  '/gallery': '相册',
  '/map': '地图',
  '/wardrobe': '衣橱',
  '/tags': '标签',
  '/dedup': '去重',
  '/live-photo': '实况照片',
  '/gif-converter': 'GIF 转换',
  '/ai-process': 'AI 处理',
  '/resources': '资源',
  '/accounts': '账户',
  '/plugins': '插件',
  '/transfer': '传输',
  '/share-codes': '分享码',
  '/archives': '归档',
  '/dashboard': '仪表盘',
  '/trash': '回收站',
  '/settings': '设置',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Match the first segment for nested routes like /gallery/:albumId
  const firstSegment = '/' + pathname.split('/').filter(Boolean)[0]
  if (ROUTE_LABELS[firstSegment]) return ROUTE_LABELS[firstSegment]
  return 'Nikki Gallery'
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { scheme, mode, setMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadCount, togglePanel } = useNotificationStore()
  const setFilter = useImageStore((s) => s.setFilter)

  const [searchQuery, setSearchQuery] = useState('')
  const [scanning, setScanning] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  // ---- Search handlers ----
  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const q = searchQuery.trim()
      if (q) {
        setFilter({ search: q, page: 1 })
        navigate('/gallery')
      }
    },
    [searchQuery, setFilter, navigate],
  )

  // ---- Cmd+K shortcut ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Try to focus the desktop search input
        if (searchInputRef.current) {
          searchInputRef.current.focus()
          return
        }
        // Fallback: dispatch custom event for CommandPalette
        window.dispatchEvent(new CustomEvent('command-palette-open'))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // ---- Scan handler ----
  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    try {
      await toast.promise(scanAll(), {
        loading: '正在扫描相册...',
        success: '相册扫描完成!',
        error: '扫描失败，请重试',
      })
    } catch {
      // toast.promise handles error display
    } finally {
      setScanning(false)
    }
  }, [scanning])

  // ---- Theme switcher click ----
  const handleThemeSwitch = useCallback(
    (newMode: ThemeMode) => {
      if (newMode !== mode) setMode(newMode)
    },
    [mode, setMode],
  )

  // ---- Gradient text style ----
  const gradientTextStyle = {
    background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  return (
    <div className="sticky top-0 z-30">
      <header
        className={clsx(
          'h-14 md:h-16 flex items-center justify-between px-3 md:px-5 lg:px-6',
          'transition-all duration-300',
        )}
        style={{
          background: scheme.bgHeader,
          backdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
          WebkitBackdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
          borderBottom: `1px solid ${scheme.border}`,
          boxShadow: scheme.shadowSm,
        }}
      >
        {/* ============ Left Section ============ */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg transition-colors flex-shrink-0"
            style={{ color: scheme.textSecondary }}
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title with gradient text */}
          <h1 className="text-base md:text-lg font-bold truncate select-none" style={gradientTextStyle}>
            {pageTitle}
          </h1>
        </div>

        {/* ============ Center Section (desktop search) ============ */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center rounded-xl px-3.5 py-2 mx-4 lg:mx-6 flex-1 max-w-md"
          style={{
            background: scheme.bgInput,
            border: `1px solid ${scheme.borderLight}`,
            boxShadow: scheme.shadowSm,
          }}
        >
          <Search className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: scheme.textTertiary }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索图片、标签... (⌘K)"
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: scheme.textPrimary }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="ml-1 flex-shrink-0 p-0.5 rounded transition-colors"
              style={{ color: scheme.textTertiary }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* ============ Right Section ============ */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Theme quick-switcher */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {THEME_OPTIONS.map((opt) => {
              const isActive = opt.mode === mode
              return (
                <button
                  key={opt.mode}
                  onClick={() => handleThemeSwitch(opt.mode)}
                  title={opt.label}
                  aria-label={`切换主题: ${opt.label}`}
                  className="relative rounded-full transition-all duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: opt.color,
                    border: isActive ? `2px solid ${scheme.bgHeader}` : '2px solid transparent',
                    outlineStyle: 'solid',
                    outlineWidth: isActive ? 2 : 0,
                    outlineColor: isActive ? opt.color : 'transparent',
                    outlineOffset: 1,
                    boxShadow: isActive ? `0 0 8px ${opt.color}` : 'none',
                    transform: isActive ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              )
            })}
          </div>

          {/* Scan button — hidden on mobile (Dock handles scan) */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className={clsx(
              'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-sm font-medium transition-all duration-200',
              scanning && 'cursor-not-allowed',
            )}
            style={{
              background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
              color: scheme.textInverse,
              boxShadow: scheme.shadowSm,
              opacity: scanning ? 0.7 : 1,
            }}
            aria-label="扫描相册"
          >
            <RefreshCw
              className={clsx('w-4 h-4', scanning && 'animate-spin')}
            />
            <span className="hidden md:inline">扫描</span>
          </button>

          {/* Notification bell */}
          <button
            onClick={togglePanel}
            data-notification-toggle
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
            aria-label="通知"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                style={{
                  background: scheme.error,
                  color: '#ffffff',
                  boxShadow: `0 0 6px ${scheme.error}`,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Mobile search toggle — now opens Command Palette (Dock has inline search) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('command-palette-open'))}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
            aria-label="搜索"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Notification Panel (portal-like, rendered here for positioning) */}
      <NotificationPanel />
    </div>
  )
}
