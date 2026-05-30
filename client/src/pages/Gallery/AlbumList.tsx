import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, Image, Plus, X, FolderPlus, Gamepad2, User, Loader2 } from 'lucide-react'
import { Album } from '@/types/album'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface AlbumListProps {
  albums: Album[]
  currentAlbumId?: string
}

export default function AlbumList({ albums, currentAlbumId }: AlbumListProps) {
  const navigate = useNavigate()
  const { createAlbum, scanGameAlbums, fetchAlbums, loading } = useAlbumStore()
  const { scheme, isDark } = useTheme()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumPath, setNewAlbumPath] = useState('')
  const [newAlbumDesc, setNewAlbumDesc] = useState('')
  const [scanning, setScanning] = useState(false)
  const hasAutoScanned = useRef(false)

  // 分离游戏相册和自定义相册
  const gameAlbums = albums.filter(a => a.type === 'game')
  const customAlbums = albums.filter(a => a.type !== 'game')

  // 首次加载时自动扫描
  useEffect(() => {
    if (!hasAutoScanned.current && albums.length === 0 && !loading) {
      hasAutoScanned.current = true
      handleAutoScan()
    }
  }, [])

  const handleAutoScan = async () => {
    setScanning(true)
    try {
      await scanGameAlbums()
    } catch {
      // 自动扫描失败静默处理
    } finally {
      setScanning(false)
    }
  }

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.error('请输入相册名称')
      return
    }
    if (!newAlbumPath.trim()) {
      toast.error('请输入相册路径')
      return
    }

    try {
      await createAlbum({
        name: newAlbumName.trim(),
        path: newAlbumPath.trim(),
        type: 'custom',
        description: newAlbumDesc.trim() || undefined,
      })
      toast.success('相册创建成功')
      setShowCreateDialog(false)
      setNewAlbumName('')
      setNewAlbumPath('')
      setNewAlbumDesc('')
    } catch {
      toast.error('创建相册失败')
    }
  }

  const handleScanGameAlbums = async () => {
    setScanning(true)
    try {
      await scanGameAlbums()
      toast.success('游戏相册扫描完成')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '扫描游戏相册失败')
    } finally {
      setScanning(false)
    }
  }

  const renderAlbumButton = (album: Album, icon: React.ReactNode) => (
    <button
      key={album.id}
      onClick={() => navigate(`/gallery/${album.id}`)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        backgroundColor: currentAlbumId === album.id ? scheme.primaryLight : 'transparent',
        color: currentAlbumId === album.id ? scheme.primary : scheme.textSecondary,
      }}
      onMouseEnter={e => {
        if (currentAlbumId !== album.id) {
          e.currentTarget.style.backgroundColor = scheme.bgHover
          e.currentTarget.style.color = scheme.textPrimary
        }
      }}
      onMouseLeave={e => {
        if (currentAlbumId !== album.id) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = scheme.textSecondary
        }
      }}
    >
      {icon}
      <span className="flex-1 text-left truncate">{album.name}</span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          backgroundColor: currentAlbumId === album.id ? scheme.primary + '20' : scheme.bgHover,
          color: currentAlbumId === album.id ? scheme.primary : scheme.textTertiary,
        }}
      >
        {album.imageCount}
      </span>
    </button>
  )

  return (
    <div className="rounded-xl shadow-sm p-4" style={{ backgroundColor: scheme.bgCard }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: scheme.textPrimary }}>相册列表</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleScanGameAlbums}
            disabled={loading || scanning}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = scheme.bgHover
              e.currentTarget.style.color = scheme.primary
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = scheme.textSecondary
            }}
            title="扫描游戏相册"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: scheme.textSecondary }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = scheme.bgHover
              e.currentTarget.style.color = scheme.primary
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = scheme.textSecondary
            }}
            title="创建新相册"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {/* 全部图片 */}
        <button
          onClick={() => navigate('/gallery')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: !currentAlbumId ? scheme.primaryLight : 'transparent',
            color: !currentAlbumId ? scheme.primary : scheme.textSecondary,
          }}
          onMouseEnter={e => {
            if (currentAlbumId) {
              e.currentTarget.style.backgroundColor = scheme.bgHover
              e.currentTarget.style.color = scheme.textPrimary
            }
          }}
          onMouseLeave={e => {
            if (currentAlbumId) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = scheme.textSecondary
            }
          }}
        >
          <Image className="w-4 h-4" />
          全部图片
        </button>

        {/* 游戏相册（内置） */}
        {gameAlbums.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 px-3 pb-1.5">
              <Gamepad2 className="w-3.5 h-3.5" style={{ color: scheme.textTertiary }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: scheme.textTertiary }}>
                游戏相册
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: scheme.border }} />
            </div>
            {gameAlbums.map(album =>
              renderAlbumButton(
                album,
                <Gamepad2 className="w-4 h-4 flex-shrink-0" />
              )
            )}
          </div>
        )}

        {/* 自定义相册 */}
        {customAlbums.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 px-3 pb-1.5">
              <User className="w-3.5 h-3.5" style={{ color: scheme.textTertiary }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: scheme.textTertiary }}>
                自定义相册
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: scheme.border }} />
            </div>
            {customAlbums.map(album =>
              renderAlbumButton(
                album,
                <Folder className="w-4 h-4 flex-shrink-0" />
              )
            )}
          </div>
        )}

        {/* 空状态 */}
        {albums.length === 0 && !scanning && (
          <div className="text-center py-6">
            <Folder className="w-10 h-10 mx-auto mb-2" style={{ color: scheme.textTertiary + '60' }} />
            <p className="text-sm" style={{ color: scheme.textTertiary }}>暂无相册</p>
            <p className="text-xs mt-1" style={{ color: scheme.textTertiary + 'aa' }}>
              点击右上角刷新按钮扫描游戏相册
            </p>
          </div>
        )}

        {/* 扫描中状态 */}
        {scanning && (
          <div className="text-center py-6">
            <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin" style={{ color: scheme.primary }} />
            <p className="text-sm" style={{ color: scheme.textSecondary }}>正在扫描游戏相册...</p>
          </div>
        )}
      </div>

      {/* 创建相册对话框 */}
      {showCreateDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            animation: 'fadeIn 200ms ease-out',
          }}
        >
          <div
            className="rounded-xl p-6 w-96 max-w-[90vw] shadow-xl"
            style={{
              backgroundColor: scheme.bgCard,
              border: `1px solid ${scheme.border}`,
              animation: 'scaleIn 200ms ease-out',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <FolderPlus className="w-5 h-5" style={{ color: scheme.primary }} />
                创建新相册
              </h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: scheme.textTertiary }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = scheme.bgHover}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                  相册名称 <span style={{ color: scheme.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  placeholder="输入相册名称"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: scheme.bgInput,
                    border: `1px solid ${scheme.border}`,
                    color: scheme.textPrimary,
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = scheme.borderFocus}
                  onBlur={e => e.target.style.borderColor = scheme.border}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                  存储路径 <span style={{ color: scheme.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAlbumPath}
                  onChange={e => setNewAlbumPath(e.target.value)}
                  placeholder="如: D:\Photos\MyAlbum"
                  className="w-full px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: scheme.bgInput,
                    border: `1px solid ${scheme.border}`,
                    color: scheme.textPrimary,
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = scheme.borderFocus}
                  onBlur={e => e.target.style.borderColor = scheme.border}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                  描述（可选）
                </label>
                <textarea
                  value={newAlbumDesc}
                  onChange={e => setNewAlbumDesc(e.target.value)}
                  placeholder="相册描述..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm transition-all resize-none"
                  style={{
                    backgroundColor: scheme.bgInput,
                    border: `1px solid ${scheme.border}`,
                    color: scheme.textPrimary,
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = scheme.borderFocus}
                  onBlur={e => e.target.style.borderColor = scheme.border}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: scheme.textSecondary,
                  backgroundColor: scheme.bgHover,
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = scheme.bgActive}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = scheme.bgHover}
              >
                取消
              </button>
              <button
                onClick={handleCreateAlbum}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                }}
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
