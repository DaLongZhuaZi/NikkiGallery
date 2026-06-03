import { NavLink } from 'react-router-dom'
import {
  Home, Image, Map, Shirt,
  Tag, Copy, Camera, FileVideo, Cpu,
  FolderOpen, User, Puzzle,
  Wifi, Share2, Archive,
  Monitor, Trash2, Settings,
  X, Heart, ListTodo, Ribbon,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '@/contexts/ThemeContext'
import { useTaskStore } from '@/stores/useTaskStore'
import type { LucideIcon } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  path: string
  icon: LucideIcon
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '\u6D4F\u89C8',
    items: [
      { path: '/', icon: Home, label: '\u9996\u9875' },
      { path: '/gallery', icon: Image, label: '\u76F8\u518C' },
      { path: '/map', icon: Map, label: '\u5730\u56FE' },
      { path: '/wardrobe', icon: Shirt, label: '\u8863\u67DC' },
    ],
  },
  {
    title: '\u5DE5\u5177',
    items: [
      { path: '/tags', icon: Tag, label: '\u6807\u7B7E\u7BA1\u7406' },
      { path: '/dedup', icon: Copy, label: '\u667A\u80FD\u53BB\u91CD' },
      { path: '/live-photo', icon: Camera, label: '\u5B9E\u51B5\u7167\u7247' },
      { path: '/gif-converter', icon: FileVideo, label: 'MP4\u8F6CGIF' },
      { path: '/ai-process', icon: Cpu, label: 'AI\u5904\u7406' },
    ],
  },
  {
    title: '\u8D44\u6E90',
    items: [
      { path: '/resources', icon: FolderOpen, label: '\u6E38\u620F\u8D44\u6E90' },
      { path: '/accounts', icon: User, label: '\u8D26\u53F7\u7BA1\u7406' },
      { path: '/plugins', icon: Puzzle, label: '\u63D2\u4EF6\u7BA1\u7406' },
    ],
  },
  {
    title: '\u4F20\u8F93',
    items: [
      { path: '/transfer', icon: Wifi, label: '\u5C40\u57DF\u7F51\u4F20\u8F93' },
      { path: '/share-codes', icon: Share2, label: '\u5206\u4EAB\u7801' },
      { path: '/archives', icon: Archive, label: '\u5F52\u6863\u7BA1\u7406' },
    ],
  },
  {
    title: '\u7CFB\u7EDF',
    items: [
      { path: '/dashboard', icon: Monitor, label: '\u7CFB\u7EDF\u76D1\u63A7' },
      { path: '/trash', icon: Trash2, label: '\u56DE\u6536\u7AD9' },
      { path: '/settings', icon: Settings, label: '\u8BBE\u7F6E' },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { scheme } = useTheme()
  const { stats, togglePanel, showPanel } = useTaskStore()

  const activeTaskCount = stats.running + stats.pending

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col',
          'w-[260px] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: scheme.bgSidebar,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderRight: `1px solid ${scheme.border}`,
        }}
      >
        {/* ── Logo Section ── */}
        <div
          className="flex h-16 shrink-0 items-center justify-between px-5"
          style={{ borderBottom: `1px solid ${scheme.border}` }}
        >
          <div className="flex items-center gap-3">
            {/* Gradient icon badge */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                boxShadow: `0 4px 12px ${scheme.primary}33`,
              }}
            >
              <Ribbon className="h-[18px] w-[18px]" style={{ color: scheme.textInverse }} />
            </div>

            <span
              className="text-[17px] font-bold tracking-tight"
              style={{
                background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NikkiGallery
            </span>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors lg:hidden"
            style={{ color: scheme.textSecondary }}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${scheme.border} transparent`,
          }}
        >
          {navGroups.map((group, groupIdx) => (
            <div
              key={group.title}
              style={{ marginTop: groupIdx === 0 ? 0 : 20 }}
            >
              {/* Group label */}
              <div
                className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: scheme.textTertiary }}
              >
                {group.title}
              </div>

              {/* Group items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className="sidebar-link"
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? scheme.primary : scheme.textSecondary,
                        background: isActive ? scheme.primaryLight : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className="h-[18px] w-[18px] shrink-0"
                            style={{
                              color: isActive ? scheme.primary : scheme.textSecondary,
                              transition: 'color 0.2s ease',
                            }}
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Task Panel Toggle ── */}
          <div style={{ marginTop: 24 }}>
            <div
              className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: scheme.textTertiary }}
            >
              {'\u4EFB\u52A1'}
            </div>
            <button
              onClick={() => {
                togglePanel()
                onClose()
              }}
              className="sidebar-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: showPanel ? 600 : 500,
                width: '100%',
                color: showPanel ? scheme.primary : scheme.textSecondary,
                background: showPanel ? scheme.primaryLight : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: 'none',
                textAlign: 'left',
              }}
            >
              <ListTodo
                className="h-[18px] w-[18px] shrink-0"
                style={{
                  color: showPanel ? scheme.primary : scheme.textSecondary,
                  transition: 'color 0.2s ease',
                }}
              />
              <span className="truncate">{'\u540E\u53F0\u4EFB\u52A1'}</span>
              {activeTaskCount > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                  style={{
                    background: scheme.primary,
                    color: scheme.textInverse,
                    lineHeight: 1,
                  }}
                >
                  {activeTaskCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* ── Footer ── */}
        <div className="shrink-0 p-3">
          <div
            className="relative overflow-hidden rounded-xl px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${scheme.bgHover}, ${scheme.bgActive})`,
              border: `1px solid ${scheme.borderLight}`,
            }}
          >
            {/* Decorative gradient orb */}
            <div
              className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full opacity-40"
              style={{
                background: `radial-gradient(circle, ${scheme.primary}66 0%, transparent 70%)`,
              }}
            />

            <div className="relative flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}22, ${scheme.gradientEnd}22)`,
                  border: `1px solid ${scheme.borderLight}`,
                }}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  style={{ color: scheme.primary }}
                />
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold leading-tight"
                  style={{ color: scheme.textPrimary }}
                >
                  Nikki Gallery
                </div>
                <div
                  className="mt-0.5 text-[10px] leading-tight"
                  style={{ color: scheme.textTertiary }}
                >
                  v1.0 &middot; {'\u8BB0\u5F55\u6BCF\u4E00\u4EFD\u7F8E\u597D'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
