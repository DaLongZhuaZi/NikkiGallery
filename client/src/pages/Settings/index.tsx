import { useEffect, useState } from 'react'
import { Settings, FolderOpen, Globe, Palette, Cpu, Save, RotateCcw, Cog, HardDrive, Play, Zap } from 'lucide-react'
import { useConfigStore } from '@/stores/useConfigStore'
import { useTheme } from '@/contexts/ThemeContext'
import { getAIDeviceInfo, setAIDevice, type AIDeviceInfo } from '@/api/config'
import toast from 'react-hot-toast'
import GamePathDetector from './GamePathDetector'
import GameLauncher from '@/components/game/GameLauncher'
import ThemeSwitcher from '@/components/common/ThemeSwitcher'

export default function SettingsPage() {
  const { config, fetchConfig, updateConfig, resetConfig, saveGamePath, loading, configLoaded } = useConfigStore()
  const { scheme } = useTheme()
  const [localConfig, setLocalConfig] = useState(config)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])
  const [deviceInfo, setDeviceInfo] = useState<AIDeviceInfo | null>(null)
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // 获取AI设备信息
  useEffect(() => {
    if (localConfig.aiEnabled) {
      getAIDeviceInfo().then(setDeviceInfo).catch(() => {})
    }
  }, [localConfig.aiEnabled])

  useEffect(() => {
    setLocalConfig(config)
    setSelectedFolderPaths(config.screenshotFolders || [])
  }, [config])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateConfig({
        ...localConfig,
        screenshotFolders: selectedFolderPaths,
      })
      toast.success('设置已保存')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (window.confirm('确定要重置所有设置吗？这将清除游戏路径、界面偏好等所有配置。')) {
      try {
        await resetConfig()
        toast.success('设置已重置')
      } catch (error) {
        toast.error('重置失败')
      }
    }
  }

  const handlePathSelect = (path: string) => {
    setLocalConfig({ ...localConfig, gamePath: path })
  }

  // 切换AI设备
  const handleDeviceChange = async (device: 'cpu' | 'cuda' | 'dml' | 'auto') => {
    setLocalConfig({ ...localConfig, aiDevice: device })
    setIsSwitchingDevice(true)
    try {
      const result = await setAIDevice(device)
      setDeviceInfo(result.device || result)
      toast.success(`已切换到 ${device === 'cpu' ? 'CPU' : device === 'cuda' ? 'CUDA GPU' : device === 'dml' ? 'DirectML GPU' : '自动选择'}`)
    } catch (error: any) {
      toast.error(`切换失败: ${error.message}`)
      // 回滚
      setLocalConfig({ ...localConfig, aiDevice: localConfig.aiDevice })
    } finally {
      setIsSwitchingDevice(false)
    }
  }

  const handleFoldersSelect = (folders: any[]) => {
    setSelectedFolderPaths(folders.map(f => f.path))
  }

  // 检测完成后自动保存（确保路径和文件夹配置持久化）
  const handleDetectionResult = async (gamePath: string, folders: any[]) => {
    const folderPaths = folders.map(f => f.path)
    try {
      await updateConfig({
        ...localConfig,
        gamePath,
        screenshotFolders: folderPaths,
      })
      toast.success('游戏路径已自动保存')
    } catch {
      // 静默失败，用户可手动保存
    }
  }

  // 主题化卡片样式
  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  const iconBoxStyle = (color: string) => ({
    backgroundColor: `${color}15`,
    color: color,
  })

  return (
    <div className="page-transition">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: scheme.textPrimary }}
          >
            设置
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            配置应用程序参数（自动保存到 settings.json）
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              color: scheme.textSecondary,
              backgroundColor: scheme.bgCard,
              border: `1px solid ${scheme.border}`,
            }}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
              boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
            }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 游戏路径设置 */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#3b82f6')}>
              <FolderOpen className="w-4 h-4" />
            </div>
            游戏路径
          </h3>

          <div className="space-y-4">
            <GamePathDetector
              currentPath={localConfig.gamePath}
              onPathSelect={handlePathSelect}
              onFoldersSelect={handleFoldersSelect}
              onDetectionResult={handleDetectionResult}
            />

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                游戏 UIDs (用于解密图片元数据，支持多个)
              </label>
              <input
                type="text"
                value={localConfig.uids ? localConfig.uids.join(', ') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const uids = val.split(',').map(s => s.trim().replace(/\D/g, '')).filter(s => s.length > 0);
                  setLocalConfig({ ...localConfig, uids });
                }}
                placeholder="请输入数字UID，多个UID用逗号分隔"
                className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = scheme.borderFocus)}
                onBlur={e => (e.target.style.borderColor = scheme.border)}
              />
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                无限暖暖的截图中隐藏了详细的相机和人物参数，需依赖您的真实 UID 才能解密。若提取元数据为空，请手动填入您的游戏 UID (9位数字)，多个可用逗号分隔。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                自动扫描
              </label>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.autoScan}
                    onChange={(e) => setLocalConfig({ ...localConfig, autoScan: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{
                      backgroundColor: localConfig.autoScan ? scheme.primary : scheme.bgHover,
                      borderColor: localConfig.autoScan ? scheme.primary : scheme.border,
                    }}
                  />
                </label>
                <span className="text-sm" style={{ color: scheme.textSecondary }}>启用自动扫描</span>
              </div>
            </div>

            {localConfig.autoScan && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                  扫描间隔（秒）
                </label>
                <input
                  type="number"
                  value={localConfig.scanInterval}
                  onChange={(e) => setLocalConfig({ ...localConfig, scanInterval: parseInt(e.target.value) || 300 })}
                  min="60"
                  max="3600"
                  className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: scheme.bgInput,
                    border: `1px solid ${scheme.border}`,
                    color: scheme.textPrimary,
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = scheme.borderFocus)}
                  onBlur={e => (e.target.style.borderColor = scheme.border)}
                />
                <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>建议 60-3600 秒</p>
              </div>
            )}

            {selectedFolderPaths.length > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${scheme.info}10` }}>
                <p className="text-sm flex items-center gap-2 mb-2" style={{ color: scheme.info }}>
                  <HardDrive className="w-4 h-4" />
                  已包含 {selectedFolderPaths.length} 个截图文件夹
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 mt-2 p-1">
                  {selectedFolderPaths.map((p, idx) => (
                    <div key={idx} className="text-xs truncate font-mono" style={{ color: scheme.textSecondary }} title={p}>
                      • {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 游戏启动器 */}
          <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${scheme.borderLight}` }}>
            <h4 className="font-medium mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <Play className="w-4 h-4" />
              启动游戏
            </h4>
            <GameLauncher
              gamePath={localConfig.gamePath}
              configLoaded={configLoaded}
              onGameLaunched={(pid) => {
                toast.success(`游戏已启动 (PID: ${pid})`)
              }}
            />
          </div>
        </div>

        {/* 界面设置 */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#8b5cf6')}>
              <Palette className="w-4 h-4" />
            </div>
            界面设置
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                语言
              </label>
              <select
                value={localConfig.language}
                onChange={(e) => setLocalConfig({ ...localConfig, language: e.target.value as 'zh' | 'en' })}
                className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                缩略图大小
              </label>
              <select
                value={localConfig.thumbnailSize}
                onChange={(e) => setLocalConfig({ ...localConfig, thumbnailSize: e.target.value as 'small' | 'medium' | 'large' })}
                className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
              >
                <option value="small">小 (150px)</option>
                <option value="medium">中 (300px)</option>
                <option value="large">大 (450px)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                缩略图质量
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={localConfig.thumbnailQuality}
                  onChange={(e) => setLocalConfig({ ...localConfig, thumbnailQuality: parseInt(e.target.value) })}
                  className="flex-1 accent-pink-500"
                  style={{ accentColor: scheme.primary }}
                />
                <span className="text-sm font-mono w-12" style={{ color: scheme.textSecondary }}>
                  {localConfig.thumbnailQuality}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 主题切换器 - 占满整行 */}
        <div className="lg:col-span-2 rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#ec4899')}>
              <Palette className="w-4 h-4" />
            </div>
            主题风格
          </h3>
          <ThemeSwitcher />
        </div>

        {/* AI设置 */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#10b981')}>
              <Cpu className="w-4 h-4" />
            </div>
            AI设置
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                启用AI功能
              </label>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.aiEnabled}
                    onChange={(e) => setLocalConfig({ ...localConfig, aiEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{
                      backgroundColor: localConfig.aiEnabled ? scheme.primary : scheme.bgHover,
                      borderColor: localConfig.aiEnabled ? scheme.primary : scheme.border,
                    }}
                  />
                </label>
                <span className="text-sm" style={{ color: scheme.textSecondary }}>启用AI图像识别</span>
              </div>
            </div>

            {localConfig.aiEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                    AI推理后端
                  </label>
                  <select
                    value={localConfig.aiBackend}
                    onChange={(e) => setLocalConfig({ ...localConfig, aiBackend: e.target.value as 'webgl' | 'webgpu' | 'wasm' })}
                    className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: scheme.bgInput,
                      border: `1px solid ${scheme.border}`,
                      color: scheme.textPrimary,
                    }}
                  >
                    <option value="webgl">WebGL (兼容性最好)</option>
                    <option value="webgpu">WebGPU (性能最佳)</option>
                    <option value="wasm">WASM (纯CPU)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      推理设备
                    </span>
                  </label>
                  <select
                    value={localConfig.aiDevice || 'cpu'}
                    onChange={(e) => handleDeviceChange(e.target.value as 'cpu' | 'cuda' | 'dml' | 'auto')}
                    disabled={isSwitchingDevice}
                    className="w-full px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: scheme.bgInput,
                      border: `1px solid ${scheme.border}`,
                      color: scheme.textPrimary,
                    }}
                  >
                    <option value="cpu">CPU (兼容性最好)</option>
                    <option value="dml">DirectML GPU (Windows显卡加速)</option>
                    <option value="cuda">CUDA GPU (NVIDIA专用)</option>
                    <option value="auto">自动选择 (推荐)</option>
                  </select>
                  {isSwitchingDevice && (
                    <p className="text-xs mt-1 animate-pulse" style={{ color: scheme.warning }}>
                      正在切换设备并重新加载模型...
                    </p>
                  )}
                  {deviceInfo && !isSwitchingDevice && (
                    <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                      当前使用: {deviceInfo.currentProvider.toUpperCase()}
                      {deviceInfo.providers && deviceInfo.providers.length > 1 &&
                        ` | 可用: ${deviceInfo.providers.join(', ')}`
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                    最大并发处理数
                  </label>
                  <input
                    type="number"
                    value={localConfig.maxConcurrentAI}
                    onChange={(e) => setLocalConfig({ ...localConfig, maxConcurrentAI: parseInt(e.target.value) || 2 })}
                    min="1"
                    max="8"
                    className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: scheme.bgInput,
                      border: `1px solid ${scheme.border}`,
                      color: scheme.textPrimary,
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                    根据您的设备性能调整，核显建议设为1-2，独显可设为4-8
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.autoProcessNewImages}
                      onChange={(e) => setLocalConfig({ ...localConfig, autoProcessNewImages: e.target.checked })}
                      className="rounded"
                      style={{ accentColor: scheme.primary }}
                    />
                    <div>
                      <span className="text-sm font-medium" style={{ color: scheme.textSecondary }}>自动处理新图片</span>
                      <p className="text-xs" style={{ color: scheme.textTertiary }}>新导入的图片自动进行AI分析</p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 高级设置 */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#64748b')}>
              <Cog className="w-4 h-4" />
            </div>
            高级设置
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                日志级别
              </label>
              <select
                value={localConfig.logLevel}
                onChange={(e) => setLocalConfig({ ...localConfig, logLevel: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
              >
                <option value="debug">Debug (调试)</option>
                <option value="info">Info (信息)</option>
                <option value="warn">Warn (警告)</option>
                <option value="error">Error (错误)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
                最大上传大小 (MB)
              </label>
              <input
                type="number"
                value={localConfig.maxUploadSize}
                onChange={(e) => setLocalConfig({ ...localConfig, maxUploadSize: parseInt(e.target.value) || 50 })}
                min="1"
                max="200"
                className="w-full px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                }}
              />
            </div>

            {/* 配置文件信息 */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: scheme.bgHover }}>
              <p className="text-xs" style={{ color: scheme.textTertiary }}>
                配置文件: <code className="px-1 rounded" style={{ backgroundColor: scheme.bgActive }}>data/settings.json</code>
              </p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                可直接编辑此文件修改配置，重启服务后生效
              </p>
              {config._lastModified && (
                <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
                  上次保存: {new Date(config._lastModified).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="lg:col-span-2 rounded-xl p-6" style={cardStyle}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={iconBoxStyle('#64748b')}>
              <Settings className="w-4 h-4" />
            </div>
            系统信息
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '版本', value: '1.0.0' },
              { label: '前端框架', value: 'React 18' },
              { label: 'AI引擎', value: 'ONNX Runtime' },
              { label: '数据库', value: 'SQLite (sql.js)' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg" style={{ backgroundColor: scheme.bgHover }}>
                <span className="text-xs" style={{ color: scheme.textTertiary }}>{item.label}</span>
                <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
