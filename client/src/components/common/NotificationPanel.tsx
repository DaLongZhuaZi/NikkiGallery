import { useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, Trash2, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotificationStore, type NotificationType } from '@/stores/useNotificationStore'
import { useTheme } from '@/contexts/ThemeContext'

const typeIcons: Record<NotificationType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const typeColors: Record<NotificationType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export default function NotificationPanel() {
  const { scheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    setPanelOpen,
  } = useNotificationStore()

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // 检查是否点击的是 Header 的通知按钮（避免冲突）
        const btn = (e.target as HTMLElement).closest('[data-notification-toggle]')
        if (!btn) setPanelOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setPanelOpen])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-4 md:right-6 top-14 md:top-16 w-80 sm:w-96 rounded-xl shadow-xl z-50 overflow-hidden"
      style={{
        backgroundColor: scheme.bgCard,
        border: `1px solid ${scheme.borderLight}`,
        boxShadow: scheme.shadowMd || '0 20px 60px rgba(0,0,0,0.15)',
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${scheme.borderLight}` }}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: scheme.textSecondary }} />
          <span className="font-semibold text-sm" style={{ color: scheme.textPrimary }}>通知</span>
          {unreadCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="全部标记已读"
            >
              <CheckCheck className="w-4 h-4" style={{ color: scheme.textSecondary }} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="清空通知"
            >
              <Trash2 className="w-4 h-4" style={{ color: scheme.textSecondary }} />
            </button>
          )}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-10 h-10 mx-auto mb-2" style={{ color: scheme.textTertiary }} />
            <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无通知</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = typeIcons[n.type]
            const color = typeColors[n.type]
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 group"
                style={{
                  backgroundColor: n.read ? 'transparent' : `${color}08`,
                  borderBottom: `1px solid ${scheme.borderLight}`,
                }}
                onClick={() => markAsRead(n.id)}
              >
                <div
                  className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: scheme.textPrimary }}>
                    {n.title}
                  </p>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: scheme.textSecondary }}>
                    {n.message}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: scheme.textTertiary }}>
                    {timeAgo(n.timestamp)}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeNotification(n.id) }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: scheme.textTertiary }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
