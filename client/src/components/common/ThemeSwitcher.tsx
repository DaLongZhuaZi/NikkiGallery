import { useTheme, ThemeMode, colorSchemes } from '@/contexts/ThemeContext'
import { Check, Moon, Sun } from 'lucide-react'

const themeOptions: { mode: ThemeMode; label: string; emoji: string; desc: string }[] = [
  { mode: 'sakura-pink', label: '樱花粉', emoji: '🌸', desc: '暖暖专属 · 温柔浪漫' },
  { mode: 'light', label: '亮白', emoji: '☀️', desc: '清新明亮 · 简约干净' },
  { mode: 'dark', label: '深色', emoji: '🌙', desc: '护眼暗色 · 酷炫沉稳' },
  { mode: 'sky-blue', label: '天蓝', emoji: '🌊', desc: '清新蓝调 · 自然舒适' },
  { mode: 'warm-yellow', label: '暖黄', emoji: '🌻', desc: '温暖阳光 · 活力满满' },
]

export default function ThemeSwitcher() {
  const { mode, setMode, scheme, toggleDark } = useTheme()

  return (
    <div className="space-y-4">
      {/* 快速切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: scheme.textPrimary }}>深色模式</h3>
          <p className="text-xs mt-0.5" style={{ color: scheme.textTertiary }}>快速切换明暗主题</p>
        </div>
        <button
          onClick={toggleDark}
          className="relative w-14 h-7 rounded-full transition-all duration-300"
          style={{ 
            background: mode === 'dark' ? scheme.primary : scheme.border,
          }}
        >
          <div
            className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ 
              left: mode === 'dark' ? '30px' : '2px',
              background: scheme.bgCard,
              boxShadow: scheme.shadowSm,
            }}
          >
            {mode === 'dark' ? (
              <Moon className="w-3.5 h-3.5" style={{ color: scheme.primary }} />
            ) : (
              <Sun className="w-3.5 h-3.5" style={{ color: scheme.textSecondary }} />
            )}
          </div>
        </button>
      </div>

      {/* 主题选择 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: scheme.textPrimary }}>主题配色</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isActive = mode === opt.mode
            const optScheme = colorSchemes[opt.mode]
            
            return (
              <button
                key={opt.mode}
                onClick={() => setMode(opt.mode)}
                className="relative rounded-xl p-3 text-left transition-all duration-200"
                style={{
                  background: isActive ? optScheme.bgActive : optScheme.bgCard,
                  border: `2px solid ${isActive ? optScheme.primary : optScheme.border}`,
                  boxShadow: isActive ? `0 0 0 1px ${optScheme.primary}` : optScheme.shadowSm,
                }}
              >
                {/* 选中指示 */}
                {isActive && (
                  <div 
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: optScheme.primary }}
                  >
                    <Check className="w-3 h-3" style={{ color: optScheme.textInverse }} />
                  </div>
                )}

                {/* 预览色块 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{opt.emoji}</span>
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ 
                      background: `linear-gradient(135deg, ${optScheme.gradientStart}, ${optScheme.gradientEnd})`,
                      boxShadow: `0 2px 8px ${optScheme.primary}40`,
                    }}
                  />
                </div>

                <p className="text-sm font-medium" style={{ color: optScheme.textPrimary }}>
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: optScheme.textSecondary }}>
                  {opt.desc}
                </p>

                {/* 配色预览条 */}
                <div className="flex gap-1 mt-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: optScheme.bgMain }} />
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: optScheme.primary }} />
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: optScheme.bgCard }} />
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: optScheme.border }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
