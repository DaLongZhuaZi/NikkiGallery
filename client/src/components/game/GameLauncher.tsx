import { useState, useEffect } from 'react'
import { Play, Loader2, AlertCircle, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { LaunchOption, getLaunchOptions, launchGame, validateGamePath, PathValidation } from '@/api/config'
import toast from 'react-hot-toast'

interface GameLauncherProps {
  gamePath: string
  configLoaded?: boolean
  onGameLaunched?: (pid: number) => void
}

export default function GameLauncher({ gamePath, configLoaded = true, onGameLaunched }: GameLauncherProps) {
  const { scheme } = useTheme()
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [launching, setLaunching] = useState<string | null>(null)
  const [validation, setValidation] = useState<PathValidation | null>(null)
  const [validating, setValidating] = useState(false)

  // 加载启动选项
  const loadLaunchOptions = async () => {
    if (!gamePath) return
    
    setLoading(true)
    try {
      const options = await getLaunchOptions()
      setLaunchOptions(options)
    } catch (error) {
      console.error('Failed to load launch options:', error)
      toast.error('加载启动选项失败')
    } finally {
      setLoading(false)
    }
  }

  // 验证游戏路径
  const validatePath = async () => {
    if (!gamePath) return
    
    setValidating(true)
    try {
      const result = await validateGamePath(gamePath)
      setValidation(result)
      
      if (!result.valid) {
        toast.error(result.error || '游戏路径无效')
      }
    } catch (error) {
      console.error('Failed to validate game path:', error)
      toast.error('验证游戏路径失败')
    } finally {
      setValidating(false)
    }
  }

  // 启动游戏
  const handleLaunch = async (option: LaunchOption) => {
    setLaunching(option.path)
    
    try {
      const result = await launchGame(option)
      
      if (result.success) {
        toast.success(`游戏已启动 (PID: ${result.pid})`)
        onGameLaunched?.(result.pid!)
      } else {
        toast.error(result.error || '启动游戏失败')
      }
    } catch (error) {
      console.error('Failed to launch game:', error)
      toast.error('启动游戏失败')
    } finally {
      setLaunching(null)
    }
  }

  // 获取启动选项图标
  const getLaunchOptionIcon = (type: string) => {
    switch (type) {
      case 'exe':
        return <Play className="w-4 h-4" />
      case 'steam':
        return <ExternalLink className="w-4 h-4" />
      case 'epic':
        return <ExternalLink className="w-4 h-4" />
      default:
        return <Play className="w-4 h-4" />
    }
  }

  // 获取启动选项类型标签
  const getLaunchOptionTypeLabel = (type: string, platform?: string) => {
    switch (type) {
      case 'exe':
        return '可执行文件'
      case 'steam':
        return `Steam${platform ? ` (${platform})` : ''}`
      case 'epic':
        return `Epic Games${platform ? ` (${platform})` : ''}`
      default:
        return '自定义'
    }
  }

  useEffect(() => {
    if (gamePath) {
      loadLaunchOptions()
      validatePath()
    }
  }, [gamePath])

  // 配置尚未从后端加载完成，显示加载状态
  if (!configLoaded) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: scheme.bgHover,
          border: `1px solid ${scheme.borderLight}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: scheme.textTertiary }} />
          <span className="text-sm" style={{ color: scheme.textTertiary }}>
            加载配置中...
          </span>
        </div>
      </div>
    )
  }

  if (!gamePath) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: `${scheme.warning}08`,
          border: `1px solid ${scheme.warning}30`,
        }}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" style={{ color: scheme.warning }} />
          <span className="text-sm" style={{ color: scheme.warning }}>
            请先配置游戏路径
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 路径验证状态 */}
      {validation && (
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: validation.valid ? `${scheme.success}08` : `${scheme.error}08`,
            border: `1px solid ${validation.valid ? scheme.success : scheme.error}30`,
          }}
        >
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <Check className="w-5 h-5" style={{ color: scheme.success }} />
            ) : (
              <AlertCircle className="w-5 h-5" style={{ color: scheme.error }} />
            )}
            <span className="text-sm font-medium" style={{ color: validation.valid ? scheme.success : scheme.error }}>
              {validation.valid ? '游戏路径有效' : '游戏路径无效'}
            </span>
          </div>
          
          {validation.valid && validation.exePath && (
            <p className="text-xs mt-2 font-mono" style={{ color: scheme.textSecondary }}>
              主程序: {validation.exePath}
            </p>
          )}
          
          {!validation.valid && validation.error && (
            <p className="text-xs mt-2" style={{ color: scheme.error }}>
              {validation.error}
            </p>
          )}
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            loadLaunchOptions()
            validatePath()
          }}
          disabled={loading || validating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
          style={{
            backgroundColor: scheme.bgHover,
            color: scheme.textSecondary,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
        >
          <RefreshCw className={`w-4 h-4 ${(loading || validating) ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 启动选项列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: scheme.textTertiary }} />
        </div>
      ) : launchOptions.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium" style={{ color: scheme.textPrimary }}>
            可用的启动方式 ({launchOptions.length})
          </h4>
          
          <div className="space-y-2">
            {launchOptions.map((option) => {
              const isLaunching = launching === option.path
              
              return (
                <button
                  key={option.path}
                  onClick={() => handleLaunch(option)}
                  disabled={isLaunching || !validation?.valid}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backgroundColor: scheme.bgHover,
                    border: `1px solid ${scheme.borderLight}`,
                    color: scheme.textPrimary,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{
                      backgroundColor: `${scheme.primary}15`,
                      color: scheme.primary,
                    }}
                  >
                    {isLaunching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      getLaunchOptionIcon(option.type)
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-xs" style={{ color: scheme.textTertiary }}>
                      {getLaunchOptionTypeLabel(option.type, option.platform)}
                    </div>
                    <div className="text-xs mt-1 font-mono truncate" style={{ color: scheme.textTertiary }}>
                      {option.path}
                    </div>
                  </div>
                  
                  <Play className="w-5 h-5" style={{ color: scheme.primary }} />
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 p-4 rounded-lg"
          style={{
            backgroundColor: `${scheme.warning}08`,
            border: `1px solid ${scheme.warning}30`,
          }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: scheme.warning }} />
          <span className="text-sm" style={{ color: scheme.warning }}>
            未找到可用的启动方式
          </span>
        </div>
      )}
    </div>
  )
}