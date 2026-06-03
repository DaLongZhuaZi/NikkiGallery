import { useTheme, ThemeMode, colorSchemes } from '@/contexts/ThemeContext'
import { Check, Star, Zap, Droplet, Moon, Sparkles } from 'lucide-react'

const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { mode: 'nikki-fantasy', label: '幻梦奇缘', icon: <Sparkles className="w-5 h-5 text-pink-400" />, desc: '无限暖暖 · 梦幻樱花' },
  { mode: 'cyber-neon', label: '赛博霓虹', icon: <Zap className="w-5 h-5 text-cyan-400" />, desc: '赛博朋克 · 故障扫描' },
  { mode: 'crystal-palace', label: '水晶神殿', icon: <Droplet className="w-5 h-5 text-teal-400" />, desc: '原神塞尔达 · 清新丁达尔' },
  { mode: 'starry-night', label: '奇想星海', icon: <Star className="w-5 h-5 text-yellow-400" />, desc: '奇幻星空 · 璀璨银河' },
  { mode: 'abyss-dark', label: '深渊余烬', icon: <Moon className="w-5 h-5 text-red-500" />, desc: '暗黑魂系 · 飘落火星' },
]

export default function ThemeSwitcher() {
  const { mode, setMode, scheme } = useTheme()

  return (
    <div className="space-y-4">
      {/* 主题选择 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: scheme.textPrimary }}>沉浸式主题 (Immersion Themes)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themeOptions.map((opt) => {
            const isActive = mode === opt.mode
            const optScheme = colorSchemes[opt.mode]
            
            return (
              <button
                key={opt.mode}
                onClick={() => setMode(opt.mode)}
                className="relative rounded-2xl p-4 text-left transition-all duration-300 overflow-hidden group hover:-translate-y-1"
                style={{
                  background: isActive ? optScheme.bgActive : optScheme.bgCard,
                  border: `2px solid ${isActive ? optScheme.primary : optScheme.border}`,
                  boxShadow: isActive ? `0 0 15px ${optScheme.primary}40` : optScheme.shadowSm,
                }}
              >
                {/* 悬浮背景流光 */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(45deg, transparent, ${optScheme.primary}, transparent)`
                  }}
                />

                {/* 选中指示 */}
                {isActive && (
                  <div 
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center animate-in zoom-in duration-300"
                    style={{ background: optScheme.primary, boxShadow: `0 0 10px ${optScheme.primary}` }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: optScheme.textInverse }} />
                  </div>
                )}

                {/* 预览色块与图标 */}
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${optScheme.gradientStart}30, ${optScheme.gradientEnd}30)`,
                      border: `1px solid ${optScheme.primary}50`
                    }}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: optScheme.textPrimary }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5 opacity-80" style={{ color: optScheme.textSecondary }}>
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {/* 配色预览条 */}
                <div className="flex gap-1.5 mt-3 relative z-10">
                  <div className="flex-1 h-2 rounded-full" style={{ background: optScheme.bgMain }} />
                  <div className="flex-1 h-2 rounded-full" style={{ background: optScheme.primary }} />
                  <div className="flex-[2] h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${optScheme.gradientStart}, ${optScheme.gradientEnd})` }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
