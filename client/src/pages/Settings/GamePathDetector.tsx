import { useState } from 'react'
import { Search, FolderOpen, Check, Loader2, AlertCircle, HardDrive } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

interface ScreenshotFolder {
  name: string
  path: string
  type: 'official' | 'custom' | 'backup' | 'unknown'
  description: string
  fileCount?: number
  lastModified?: string
}

interface GamePathInfo {
  gamePath: string
  screenshotFolders: ScreenshotFolder[]
}

interface GamePathDetectorProps {
  currentPath: string
  onPathSelect: (path: string) => void
  onFoldersSelect: (folders: ScreenshotFolder[]) => void
  onDetectionResult?: (gamePath: string, folders: ScreenshotFolder[]) => void
}

export default function GamePathDetector({ currentPath, onPathSelect, onFoldersSelect, onDetectionResult }: GamePathDetectorProps) {
  const { scheme } = useTheme()
  const [detecting, setDetecting] = useState(false)
  const [gamePathInfo, setGamePathInfo] = useState<GamePathInfo | null>(null)
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set())
  const [manualPath, setManualPath] = useState(currentPath)

  const handleAutoDetect = async () => {
    setDetecting(true)
    setGamePathInfo(null)

    try {
      const response = await fetch('/api/settings/detect-game-path')
      const data = await response.json()

      if (data.success && data.data) {
        setGamePathInfo(data.data)
        onPathSelect(data.data.gamePath)
        setManualPath(data.data.gamePath)

        const allFolderPaths = new Set<string>(data.data.screenshotFolders.map((f: ScreenshotFolder) => f.path))
        setSelectedFolders(allFolderPaths)
        onFoldersSelect(data.data.screenshotFolders)
        onDetectionResult?.(data.data.gamePath, data.data.screenshotFolders)

        toast.success(`找到游戏路径，发现 ${data.data.screenshotFolders.length} 个截图文件夹`)
      } else {
        toast.error('未检测到游戏安装路径，请手动选择')
      }
    } catch (error) {
      toast.error('检测失败，请手动选择游戏路径')
    } finally {
      setDetecting(false)
    }
  }

  const handleManualDetect = async () => {
    if (!manualPath) {
      toast.error('请输入游戏路径')
      return
    }

    setDetecting(true)
    try {
      const response = await fetch(`/api/settings/screenshot-folders?path=${encodeURIComponent(manualPath)}`)
      const data = await response.json()

      if (data.success) {
        const info: GamePathInfo = {
          gamePath: manualPath,
          screenshotFolders: data.data,
        }
        setGamePathInfo(info)
        onPathSelect(manualPath)

        const allFolderPaths = new Set<string>(data.data.map((f: ScreenshotFolder) => f.path))
        setSelectedFolders(allFolderPaths)
        onFoldersSelect(data.data)
        onDetectionResult?.(manualPath, data.data)

        toast.success(`找到 ${data.data.length} 个截图文件夹`)
      } else {
        toast.error('未找到截图文件夹')
      }
    } catch (error) {
      toast.error('检测失败')
    } finally {
      setDetecting(false)
    }
  }

  const toggleFolder = (folderPath: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }

  const selectAll = () => {
    if (gamePathInfo) {
      const allPaths = new Set(gamePathInfo.screenshotFolders.map(f => f.path))
      setSelectedFolders(allPaths)
    }
  }

  const deselectAll = () => {
    setSelectedFolders(new Set())
  }

  const getFolderTypeStyle = (type: string) => {
    switch (type) {
      case 'official': return { bg: `${scheme.info}15`, color: scheme.info }
      case 'custom': return { bg: '#8b5cf615', color: '#8b5cf6' }
      case 'backup': return { bg: `${scheme.warning}15`, color: scheme.warning }
      default: return { bg: scheme.bgHover, color: scheme.textTertiary }
    }
  }

  const getFolderTypeLabel = (type: string) => {
    switch (type) {
      case 'official': return '官方'
      case 'custom': return '自定义'
      case 'backup': return '备份'
      default: return '其他'
    }
  }

  return (
    <div className="space-y-4">
      {/* 自动检测按钮 */}
      <button
        onClick={handleAutoDetect}
        disabled={detecting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
          boxShadow: `0 4px 14px ${scheme.gradientStart}40`,
        }}
      >
        {detecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            正在搜索游戏路径...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            自动检测游戏路径
          </>
        )}
      </button>

      {/* 手动输入 */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: scheme.textSecondary }}>
          或手动输入游戏路径
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="例如: C:\Program Files\InfinityNikki"
            className="flex-1 px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: scheme.bgInput,
              border: `1px solid ${scheme.border}`,
              color: scheme.textPrimary,
            }}
            onFocus={e => (e.target.style.borderColor = scheme.borderFocus)}
            onBlur={e => (e.target.style.borderColor = scheme.border)}
          />
          <button
            onClick={handleManualDetect}
            disabled={detecting || !manualPath}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: scheme.bgHover,
              color: scheme.textSecondary,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
          >
            检测
          </button>
        </div>
      </div>

      {/* 检测结果 */}
      {gamePathInfo && (
        <div className="space-y-4">
          {/* 游戏路径 */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: `${scheme.success}08`,
              border: `1px solid ${scheme.success}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" style={{ color: scheme.success }} />
              <span className="font-medium" style={{ color: scheme.success }}>游戏路径已找到</span>
            </div>
            <p className="text-sm mt-1 font-mono" style={{ color: scheme.textSecondary }}>
              {gamePathInfo.gamePath}
            </p>
          </div>

          {/* 截图文件夹列表 */}
          {gamePathInfo.screenshotFolders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium" style={{ color: scheme.textPrimary }}>
                  发现的截图文件夹 ({gamePathInfo.screenshotFolders.length})
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs transition-colors"
                    style={{ color: scheme.info }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    全选
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs transition-colors"
                    style={{ color: scheme.textTertiary }}
                  >
                    取消全选
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {gamePathInfo.screenshotFolders.map((folder) => {
                  const isSelected = selectedFolders.has(folder.path)
                  const typeStyle = getFolderTypeStyle(folder.type)
                  return (
                    <label
                      key={folder.path}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? scheme.primaryLight : scheme.bgHover,
                        border: `1px solid ${isSelected ? scheme.primary : scheme.borderLight}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFolder(folder.path)}
                        className="mt-1"
                        style={{ accentColor: scheme.primary }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: scheme.textTertiary }} />
                          <span className="font-medium truncate" style={{ color: scheme.textPrimary }}>
                            {folder.name}
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                          >
                            {getFolderTypeLabel(folder.type)}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>{folder.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: scheme.textTertiary }}>
                          {folder.fileCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {folder.fileCount} 张图片
                            </span>
                          )}
                          {folder.lastModified && (
                            <span>
                              更新: {new Date(folder.lastModified).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 font-mono truncate" style={{ color: scheme.textTertiary }}>
                          {folder.path}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {gamePathInfo.screenshotFolders.length === 0 && (
            <div
              className="flex items-center gap-2 p-4 rounded-lg"
              style={{
                backgroundColor: `${scheme.warning}08`,
                border: `1px solid ${scheme.warning}30`,
              }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: scheme.warning }} />
              <span className="text-sm" style={{ color: scheme.warning }}>未在游戏目录中找到截图文件夹</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
