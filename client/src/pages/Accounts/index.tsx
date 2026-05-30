import { useState, useEffect } from 'react'
import {
  User,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  HardDrive,
  Image as ImageIcon,
  Video,
  FolderOpen
} from 'lucide-react'
import { useAccountStore } from '../../stores/useAccountStore'
import type { GameAccount } from '../../stores/useAccountStore'
import { useConfigStore } from '../../stores/useConfigStore'

export default function AccountsPage() {
  const {
    accounts,
    currentUid,
    currentAccount,
    accountStats,
    isLoading,
    error,
    loadAccounts,
    addAccount,
    switchAccount,
    deleteAccount,
    discoverAccounts,
    loadAccountStats,
    clearError
  } = useAccountStore()

  const { config } = useConfigStore()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newUid, setNewUid] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [isDiscovering, setIsDiscovering] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    // 加载所有账号的统计信息
    accounts.forEach(account => {
      loadAccountStats(account.uid)
    })
  }, [accounts, loadAccountStats])

  const handleAddAccount = async () => {
    if (!newUid.trim()) return

    await addAccount({
      uid: newUid.trim(),
      nickname: newNickname.trim() || undefined,
      gamePath: config.gamePath || ''
    })

    setNewUid('')
    setNewNickname('')
    setShowAddDialog(false)
  }

  const handleDiscover = async () => {
    if (!config.gamePath) return

    setIsDiscovering(true)
    try {
      const discovered = await discoverAccounts(config.gamePath)
      alert(`发现 ${discovered.length} 个账号`)
    } catch (error) {
      alert('发现账号失败')
    }
    setIsDiscovering(false)
  }

  const handleDelete = async (uid: string) => {
    if (confirm('确定要删除这个账号吗？这不会删除游戏文件。')) {
      await deleteAccount(uid)
    }
  }

  const handleSwitch = async (uid: string) => {
    await switchAccount(uid)
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* 顶部栏 */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <User className="w-6 h-6" style={{ color: '#6366f1' }} />
          <h1 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
            账号管理
          </h1>
          <span
            className="text-sm px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8'
            }}
          >
            {accounts.length} 个账号
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscover}
            disabled={isDiscovering || !config.gamePath}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              opacity: isDiscovering || !config.gamePath ? 0.5 : 1
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`}
            />
            <span className="text-sm">自动发现</span>
          </button>

          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#6366f1', color: '#ffffff' }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">添加账号</span>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="mx-6 mt-4 p-3 rounded-lg flex items-center justify-between"
          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
        >
          <span>{error}</span>
          <button onClick={clearError} className="text-sm underline">
            关闭
          </button>
        </div>
      )}

      {/* 账号列表 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && accounts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#6366f1' }}
            />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <User
              className="w-16 h-16"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            />
            <div className="text-center">
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                还没有添加任何账号
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                点击"添加账号"或"自动发现"开始使用
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts.map(account => {
              const stats = accountStats[account.uid]
              const isCurrent = account.uid === currentUid

              return (
                <div
                  key={account.uid}
                  className="rounded-xl p-4 transition-all cursor-pointer"
                  style={{
                    background: isCurrent
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      isCurrent
                        ? 'rgba(99, 102, 241, 0.3)'
                        : 'rgba(255,255,255,0.05)'
                    }`
                  }}
                  onClick={() => !isCurrent && handleSwitch(account.uid)}
                >
                  <div className="flex items-center gap-4">
                    {/* 头像 */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: isCurrent
                          ? '#6366f1'
                          : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6" style={{ color: '#ffffff' }} />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium"
                          style={{ color: '#ffffff' }}
                        >
                          {account.nickname || `UID: ${account.uid}`}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: '#6366f1',
                              color: '#ffffff'
                            }}
                          >
                            当前
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm mt-1"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        UID: {account.uid} · 最后活跃:{' '}
                        {formatDate(account.lastActive)}
                      </div>

                      {/* 统计信息 */}
                      {stats && (
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>{stats.imageCount} 张图片</span>
                          </div>
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            <Video className="w-3 h-3" />
                            <span>{stats.videoCount} 个视频</span>
                          </div>
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            <HardDrive className="w-3 h-3" />
                            <span>{formatSize(stats.totalSize)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(account.uid)
                        }}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background =
                            'rgba(239, 68, 68, 0.2)')
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = 'transparent')
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {!isCurrent && (
                        <ChevronRight
                          className="w-5 h-5"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加账号对话框 */}
      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{ background: '#16213e' }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: '#ffffff' }}
            >
              添加账号
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  UID *
                </label>
                <input
                  type="text"
                  value={newUid}
                  onChange={e => setNewUid(e.target.value)}
                  placeholder="输入游戏 UID"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  昵称（可选）
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={e => setNewNickname(e.target.value)}
                  placeholder="输入昵称"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ffffff'
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddAccount}
                disabled={!newUid.trim()}
                className="px-4 py-2 rounded-lg"
                style={{
                  background: '#6366f1',
                  color: '#ffffff',
                  opacity: !newUid.trim() ? 0.5 : 1
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
