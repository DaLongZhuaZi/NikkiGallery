import { useState } from 'react'
import { Trash2, Move, Tag, Heart, X, FolderOpen } from 'lucide-react'
import { useImageStore } from '@/stores/useImageStore'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

interface BatchActionsProps {
  selectedCount: number
  onClearSelection: () => void
}

export default function BatchActions({ selectedCount, onClearSelection }: BatchActionsProps) {
  const { selectedImages, batchDelete, batchMove, batchFavorite } = useImageStore()
  const { albums } = useAlbumStore()
  const { scheme } = useTheme()
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [tagName, setTagName] = useState('')

  const handleBatchDelete = async () => {
    if (window.confirm(`确定要删除选中的 ${selectedCount} 张图片吗？此操作不可恢复。`)) {
      try {
        await batchDelete(selectedImages)
        toast.success(`成功删除 ${selectedCount} 张图片`)
        onClearSelection()
      } catch (error) {
        toast.error('批量删除失败')
      }
    }
  }

  const handleBatchMove = async (targetAlbumId: string) => {
    try {
      await batchMove(selectedImages, targetAlbumId)
      toast.success(`已移动 ${selectedCount} 张图片`)
      setShowMoveDialog(false)
      onClearSelection()
    } catch (error) {
      toast.error('批量移动失败')
    }
  }

  const handleBatchTag = async () => {
    if (!tagName.trim()) {
      toast.error('请输入标签名称')
      return
    }
    try {
      // 调用批量标签API
      const response = await fetch('/api/batch/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: selectedImages, tag: tagName.trim() }),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success(`已为 ${selectedCount} 张图片添加标签 "${tagName}"`)
      setShowTagDialog(false)
      setTagName('')
      onClearSelection()
    } catch (error) {
      toast.error('批量添加标签失败')
    }
  }

  const handleBatchFavorite = async () => {
    try {
      await batchFavorite(selectedImages)
      toast.success(`已收藏 ${selectedCount} 张图片`)
      onClearSelection()
    } catch (error) {
      toast.error('批量收藏失败')
    }
  }

  return (
    <>
      <div
        className="rounded-xl p-4 mb-6 transition-all duration-300"
        style={{
          backgroundColor: scheme.bgCard,
          border: `1px solid ${scheme.border}`,
          boxShadow: scheme.shadowMd,
          background: `linear-gradient(135deg, ${scheme.bgCard}, ${scheme.primaryLight})`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm" style={{ color: scheme.textSecondary }}>
              已选择{' '}
              <span
                className="font-bold text-lg"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {selectedCount}
              </span>{' '}
              张图片
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: scheme.error, backgroundColor: `${scheme.error}10` }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${scheme.error}20`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${scheme.error}10`)}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>

              <button
                onClick={() => setShowMoveDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: scheme.textSecondary, backgroundColor: scheme.bgHover }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
              >
                <Move className="w-4 h-4" />
                移动
              </button>

              <button
                onClick={() => setShowTagDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: scheme.textSecondary, backgroundColor: scheme.bgHover }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = scheme.bgActive)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.bgHover)}
              >
                <Tag className="w-4 h-4" />
                标签
              </button>

              <button
                onClick={handleBatchFavorite}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ color: scheme.primary, backgroundColor: scheme.primaryLight }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${scheme.primary}20`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = scheme.primaryLight)}
              >
                <Heart className="w-4 h-4" />
                收藏
              </button>
            </div>
          </div>

          <button
            onClick={onClearSelection}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: scheme.textTertiary }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = scheme.bgHover
              e.currentTarget.style.color = scheme.textPrimary
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = scheme.textTertiary
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 移动到相册对话框 */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-xl p-6 w-96 max-w-[90vw] shadow-xl"
            style={{ backgroundColor: scheme.bgCard }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <FolderOpen className="w-5 h-5" style={{ color: scheme.primary }} />
                移动到相册
              </h3>
              <button
                onClick={() => setShowMoveDialog(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: scheme.textTertiary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => handleBatchMove(album.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: scheme.textSecondary,
                    backgroundColor: scheme.bgHover,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = scheme.primaryLight
                    e.currentTarget.style.color = scheme.primary
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = scheme.bgHover
                    e.currentTarget.style.color = scheme.textSecondary
                  }}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="flex-1 text-left">{album.name}</span>
                  <span className="text-xs" style={{ color: scheme.textTertiary }}>{album.imageCount} 张</span>
                </button>
              ))}
              {albums.length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: scheme.textTertiary }}>
                  暂无可用相册
                </p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: scheme.textSecondary,
                  backgroundColor: scheme.bgHover,
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加标签对话框 */}
      {showTagDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-xl p-6 w-96 max-w-[90vw] shadow-xl"
            style={{ backgroundColor: scheme.bgCard }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <Tag className="w-5 h-5" style={{ color: scheme.primary }} />
                批量添加标签
              </h3>
              <button
                onClick={() => { setShowTagDialog(false); setTagName('') }}
                className="p-1 rounded-lg transition-colors"
                style={{ color: scheme.textTertiary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: scheme.textSecondary }}>
                标签名称
              </label>
              <input
                type="text"
                value={tagName}
                onChange={e => setTagName(e.target.value)}
                placeholder="输入标签名称"
                className="w-full px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: scheme.bgInput,
                  border: `1px solid ${scheme.border}`,
                  color: scheme.textPrimary,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = scheme.borderFocus}
                onBlur={e => e.target.style.borderColor = scheme.border}
                onKeyDown={e => e.key === 'Enter' && handleBatchTag()}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowTagDialog(false); setTagName('') }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: scheme.textSecondary,
                  backgroundColor: scheme.bgHover,
                }}
              >
                取消
              </button>
              <button
                onClick={handleBatchTag}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
