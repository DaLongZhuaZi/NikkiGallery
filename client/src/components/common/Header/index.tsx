import { Menu, Bell, Search, User, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { scheme, isDark, toggleDark } = useTheme()

  return (
    <header 
      className="h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
      style={{ 
        background: scheme.bgHeader,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderBottom: `1px solid ${scheme.border}`,
      }}
    >
      {/* 左侧：菜单按钮和搜索 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: scheme.textSecondary }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          className="hidden sm:flex items-center rounded-xl px-4 py-2 w-64 lg:w-80"
          style={{ 
            background: scheme.bgInput,
            border: `1px solid ${scheme.borderLight}`,
          }}
        >
          <Search className="w-4 h-4 mr-2" style={{ color: scheme.textTertiary }} />
          <input
            type="text"
            placeholder="搜索图片、相册、标签..."
            className="bg-transparent text-sm outline-none w-full"
            style={{ 
              color: scheme.textPrimary,
            }}
          />
        </div>
      </div>

      {/* 右侧：主题切换、通知和用户 */}
      <div className="flex items-center gap-2">
        {/* 暗色模式快速切换 */}
        <button 
          onClick={toggleDark}
          className="p-2 rounded-lg transition-all duration-200"
          style={{ 
            color: scheme.textSecondary,
            background: 'transparent',
          }}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button 
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: scheme.textSecondary }}
        >
          <Bell className="w-5 h-5" />
          <span 
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: scheme.primary }}
          />
        </button>

        <div 
          className="flex items-center gap-2 ml-2 pl-3"
          style={{ borderLeft: `1px solid ${scheme.border}` }}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
            }}
          >
            <User className="w-4 h-4" style={{ color: scheme.textInverse }} />
          </div>
          <span 
            className="hidden md:block text-sm font-medium"
            style={{ color: scheme.textPrimary }}
          >
            Nikki
          </span>
        </div>
      </div>
    </header>
  )
}
