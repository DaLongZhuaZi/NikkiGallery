import { NavLink } from 'react-router-dom'
import { Home, Image, Share2, Sparkles, Settings, X, Trash2, Map, Wand2, Activity } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '@/contexts/ThemeContext'
import { useTaskStore } from '@/stores/useTaskStore'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { path: '/', icon: Home, label: '首页', emoji: '🏠' },
  { path: '/gallery', icon: Image, label: '相册', emoji: '📸' },
  { path: '/share-codes', icon: Share2, label: '分享码', emoji: '🔗' },
  { path: '/ai-process', icon: Sparkles, label: 'AI处理', emoji: '✨' },
  { path: '/trash', icon: Trash2, label: '回收站', emoji: '🗑️' },
  { path: '/settings', icon: Settings, label: '设置', emoji: '⚙️' },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { scheme, isDark } = useTheme()
  const { stats, togglePanel, showPanel } = useTaskStore()

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: scheme.bgSidebar,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderRight: `1px solid ${scheme.border}`,
        }}
      >
        {/* Logo */}
        <div 
          className="h-16 flex items-center justify-between px-6"
          style={{ borderBottom: `1px solid ${scheme.border}` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-float">🎀</span>
            <h1 
              className="text-lg font-bold"
              style={{ 
                background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Nikki Gallery
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航 */}
        <nav className="p-4 space-y-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className="sidebar-link"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive ? scheme.primary : scheme.textSecondary,
                background: isActive ? scheme.bgActive : 'transparent',
                transition: 'all 0.2s ease',
                animationDelay: `${index * 50}ms`,
              })}
            >
              <span className="text-lg">{item.emoji}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* 任务面板按钮 */}
          <button
            onClick={() => {
              togglePanel()
              onClose()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: 500,
              width: '100%',
              color: showPanel ? scheme.primary : scheme.textSecondary,
              background: showPanel ? scheme.bgActive : 'transparent',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <span className="text-lg">📊</span>
            <span>后台任务</span>
            {(stats.running > 0 || stats.pending > 0) && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: scheme.primary,
                  color: scheme.textInverse,
                }}
              >
                {stats.running + stats.pending}
              </span>
            )}
          </button>
        </nav>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div 
            className="rounded-2xl p-4 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${scheme.bgHover}, ${scheme.bgActive})`,
              border: `1px solid ${scheme.borderLight}`,
            }}
          >
            <p className="text-2xl mb-2">🌸</p>
            <p className="text-xs" style={{ color: scheme.textSecondary }}>Nikki Gallery v1.0</p>
            <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>记录每一份美好</p>
          </div>
        </div>
      </aside>
    </>
  )
}
