import { useEffect, useState, useRef } from 'react'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTheme } from '@/contexts/ThemeContext'
import {
  X,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react'
import clsx from 'clsx'
import type { Task, TaskStatus } from '@/api/task'

// 状态配置 - 使用函数式以支持主题
const getStatusConfig = (scheme: any) => ({
  pending: { icon: Clock, color: scheme.textTertiary, bg: scheme.bgHover },
  running: { icon: Loader2, color: scheme.primary, bg: scheme.primaryLight },
  completed: { icon: CheckCircle2, color: scheme.success, bg: scheme.success + '15' },
  failed: { icon: XCircle, color: scheme.error, bg: scheme.error + '15' },
  cancelled: { icon: AlertCircle, color: scheme.warning, bg: scheme.warning + '15' },
})

// 任务类型中文名
const taskTypeNames: Record<string, string> = {
  scan_albums: '扫描相册',
  scan_images: '扫描图片',
  extract_metadata: '提取元数据',
  generate_thumbnail: '生成缩略图',
  ai_process: 'AI处理',
  batch_operation: '批量操作',
  import_images: '导入图片',
  export_images: '导出图片',
  dedup: '智能去重',
  decrypt: '解密',
  custom: '自定义',
}

// 单个任务卡片
function TaskCard({ task, scheme }: { task: Task; scheme: any }) {
  const { cancelTask } = useTaskStore()
  const statusConfig = getStatusConfig(scheme)
  const config = statusConfig[task.status]
  const Icon = config.icon

  const canCancel = task.status === 'pending' || task.status === 'running'

  return (
    <div
      className="rounded-lg p-3 transition-all duration-300"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${scheme.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className={clsx(
              'w-4 h-4 flex-shrink-0',
              task.status === 'running' && 'animate-spin'
            )}
            style={{ color: config.color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>
              {task.name}
            </p>
            <p className="text-xs" style={{ color: scheme.textTertiary }}>
              {taskTypeNames[task.type] || task.type}
            </p>
          </div>
        </div>
        {canCancel && (
          <button
            onClick={() => cancelTask(task.id)}
            className="p-1 rounded transition-colors"
            style={{ color: scheme.textTertiary }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = scheme.bgActive
              e.currentTarget.style.color = scheme.error
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = scheme.textTertiary
            }}
            title="取消任务"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 进度条 */}
      {(task.status === 'running' || task.status === 'pending') && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: scheme.textTertiary }}>
            <span>{task.currentStep}</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: scheme.bgHover }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${task.progress}%`,
                background: `linear-gradient(90deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
              }}
            />
          </div>
          {task.totalItems > 0 && (
            <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
              {task.processedItems}/{task.totalItems}
              {task.failedItems > 0 && (
                <span className="ml-1" style={{ color: scheme.error }}>({task.failedItems} 失败)</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* 完成/失败信息 */}
      {task.status === 'completed' && (
        <p className="text-xs mt-1" style={{ color: scheme.success }}>{task.currentStep}</p>
      )}
      {task.status === 'failed' && task.error && (
        <p className="text-xs mt-1 truncate" style={{ color: scheme.error }}>{task.error}</p>
      )}
    </div>
  )
}

// 任务面板主体
export default function TaskPanel() {
  const {
    tasks,
    activeTasks,
    stats,
    loading,
    showPanel,
    sseConnected,
    togglePanel,
    fetchTasks,
    fetchStats,
    clearCompleted,
    initSSE,
    disconnectSSE,
  } = useTaskStore()

  const { scheme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // 初始化 SSE 连接
  useEffect(() => {
    initSSE()
    return () => disconnectSSE()
  }, [])

  // 面板打开时刷新数据
  useEffect(() => {
    if (showPanel) {
      fetchTasks()
      fetchStats()
    }
  }, [showPanel])

  // 控制动画
  useEffect(() => {
    if (showPanel) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [showPanel])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ pointerEvents: 'auto' }}>
      {/* 遮罩层 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 300ms ease-out',
        }}
        onClick={togglePanel}
      />

      {/* 面板主体 */}
      <div
        ref={panelRef}
        className="relative w-96 flex flex-col shadow-2xl"
        style={{
          backgroundColor: scheme.bgCard,
          borderLeft: `1px solid ${scheme.border}`,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 头部 */}
        <div
          className="p-4"
          style={{
            background: `linear-gradient(135deg, ${scheme.primaryLight}, ${scheme.gradientStart}20)`,
            borderBottom: `1px solid ${scheme.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: scheme.primary }} />
              <h2 className="text-lg font-semibold" style={{ color: scheme.textPrimary }}>后台任务</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* SSE 连接状态 */}
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{
                backgroundColor: sseConnected ? scheme.success + '15' : scheme.error + '15',
              }}>
                {sseConnected ? (
                  <Wifi className="w-3 h-3" style={{ color: scheme.success }} />
                ) : (
                  <WifiOff className="w-3 h-3" style={{ color: scheme.error }} />
                )}
                <span style={{ color: sseConnected ? scheme.success : scheme.error }}>
                  {sseConnected ? '已连接' : '未连接'}
                </span>
              </div>
              <button
                onClick={togglePanel}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: scheme.textSecondary }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = scheme.bgHover}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {stats.running > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                backgroundColor: scheme.primary + '20',
                color: scheme.primary,
              }}>
                {stats.running} 运行中
              </span>
            )}
            {stats.pending > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                backgroundColor: scheme.bgHover,
                color: scheme.textSecondary,
              }}>
                {stats.pending} 等待中
              </span>
            )}
            {stats.completed > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                backgroundColor: scheme.success + '20',
                color: scheme.success,
              }}>
                {stats.completed} 已完成
              </span>
            )}
            {stats.failed > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                backgroundColor: scheme.error + '20',
                color: scheme.error,
              }}>
                {stats.failed} 失败
              </span>
            )}
          </div>
        </div>

        {/* 操作栏 */}
        <div className="px-4 py-2 flex justify-between" style={{ borderBottom: `1px solid ${scheme.border}` }}>
          <button
            onClick={() => {
              fetchTasks()
              fetchStats()
            }}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: scheme.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.color = scheme.primary}
            onMouseLeave={e => e.currentTarget.style.color = scheme.textSecondary}
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: scheme.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.color = scheme.error}
            onMouseLeave={e => e.currentTarget.style.color = scheme.textSecondary}
          >
            <Trash2 className="w-4 h-4" />
            清除已完成
          </button>
        </div>

        {/* 任务列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase mb-2 tracking-wider" style={{ color: scheme.textTertiary }}>
                进行中
              </h3>
              <div className="space-y-2">
                {activeTasks.map(task => (
                  <TaskCard key={task.id} task={task} scheme={scheme} />
                ))}
              </div>
            </div>
          )}

          {tasks.filter(t => t.status !== 'pending' && t.status !== 'running').length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase mb-2 tracking-wider" style={{ color: scheme.textTertiary }}>
                历史记录
              </h3>
              <div className="space-y-2">
                {tasks
                  .filter(t => t.status !== 'pending' && t.status !== 'running')
                  .slice(0, 20)
                  .map(task => (
                    <TaskCard key={task.id} task={task} scheme={scheme} />
                  ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无任务</p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>执行操作时会自动创建任务</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
