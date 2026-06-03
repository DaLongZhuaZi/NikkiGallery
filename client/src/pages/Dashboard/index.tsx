import { useEffect, useState, useCallback } from 'react'
import {
  Monitor,
  Activity,
  Database,
  HardDrive,
  Image,
  Tag,
  Trash2,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Server,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import axios from 'axios'
import { useTheme } from '@/contexts/ThemeContext'
import { getImageStats, getTrashStats } from '@/api/image'
import { getTagStats } from '@/api/tags'
import type { Task, TaskStats } from '@/api/task'
import toast from 'react-hot-toast'

interface HealthInfo {
  status: string
  timestamp: string
  uptime: number
}

export default function DashboardPage() {
  const { scheme } = useTheme()

  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [imageStats, setImageStats] = useState({ total: 0, aiProcessed: 0 })
  const [trashStats, setTrashStats] = useState({ count: 0, totalSize: 0 })
  const [tagStats, setTagStats] = useState({ total: 0, byType: {} as Record<string, number> })
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [healthRes, imgStats, trashRes, tags, tasksRes] = await Promise.allSettled([
        axios.get('/api/health'),
        getImageStats(),
        getTrashStats(),
        getTagStats(),
        axios.get('/api/tasks'),
      ])

      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value.data.data)
      }
      if (imgStats.status === 'fulfilled') {
        setImageStats(imgStats.value)
      }
      if (trashRes.status === 'fulfilled') {
        const val = trashRes.value as any
        const d = val?.data?.data || val?.data || val
        setTrashStats({ count: d?.count || 0, totalSize: d?.totalSize || 0 })
      }
      if (tags.status === 'fulfilled') {
        setTagStats(tags.value)
      }
      if (tasksRes.status === 'fulfilled') {
        const taskList: Task[] = tasksRes.value.data.data || []
        setTasks(taskList.slice(0, 20))
        // 计算任务统计
        const stats: TaskStats = { total: taskList.length, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 }
        taskList.forEach(t => {
          if (t.status in stats) stats[t.status as keyof Omit<TaskStats, 'total'>]++
        })
        setTaskStats(stats)
      }

      setLastRefresh(new Date())
    } catch (err) {
      toast.error('加载监控数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (d > 0) return `${d}天 ${h}小时`
    if (h > 0) return `${h}小时 ${m}分钟`
    return `${m}分钟`
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const cardStyle = {
    backgroundColor: scheme.bgCard,
    border: `1px solid ${scheme.borderLight}`,
    boxShadow: scheme.shadowSm,
  }

  const statCards = [
    { label: '图片总数', value: imageStats.total, icon: Image, color: '#3b82f6' },
    { label: 'AI已处理', value: imageStats.aiProcessed, icon: Cpu, color: '#8b5cf6' },
    { label: '标签数量', value: tagStats.total, icon: Tag, color: '#10b981' },
    { label: '回收站', value: trashStats.count, icon: Trash2, color: '#ef4444' },
    { label: '回收站占用', value: formatSize(trashStats.totalSize), icon: HardDrive, color: '#f59e0b' },
    { label: '任务总数', value: taskStats.total, icon: Activity, color: '#06b6d4' },
  ]

  return (
    <div className="page-transition max-w-6xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: scheme.textPrimary }}>
            <Monitor className="w-6 h-6" />
            系统监控
          </h1>
          <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
            系统运行状态和数据概览
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs" style={{ color: scheme.textTertiary }}>
              上次刷新: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: scheme.bgHover, color: scheme.textSecondary }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: scheme.primary }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 服务状态 */}
          <div className="rounded-xl p-6" style={cardStyle}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
              <Server className="w-4 h-4" />
              服务状态
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusItem
                label="API 服务"
                status={health?.status === 'ok' ? 'healthy' : 'error'}
                detail={health ? `运行 ${formatUptime(health.uptime)}` : '未知'}
                scheme={scheme}
              />
              <StatusItem
                label="数据库"
                status={health ? 'healthy' : 'error'}
                detail="SQLite (sql.js)"
                scheme={scheme}
              />
              <StatusItem
                label="AI 引擎"
                status="healthy"
                detail="ONNX Runtime"
                scheme={scheme}
              />
              <StatusItem
                label="任务系统"
                status={taskStats.running > 0 ? 'warning' : 'healthy'}
                detail={taskStats.running > 0 ? `${taskStats.running} 个运行中` : '空闲'}
                scheme={scheme}
              />
            </div>
          </div>

          {/* 数据统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map(card => (
              <div
                key={card.label}
                className="p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={cardStyle}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                    <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-xs font-medium mb-0.5" style={{ color: scheme.textSecondary }}>{card.label}</p>
                <p className="text-xl font-bold" style={{ color: scheme.textPrimary }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* 任务统计 & 最近任务 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 任务概览 */}
            <div className="rounded-xl p-6" style={cardStyle}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <Activity className="w-4 h-4" />
                任务概览
              </h3>
              <div className="space-y-3">
                <TaskStatRow label="运行中" count={taskStats.running} color="#3b82f6" scheme={scheme} />
                <TaskStatRow label="等待中" count={taskStats.pending} color="#f59e0b" scheme={scheme} />
                <TaskStatRow label="已完成" count={taskStats.completed} color="#10b981" scheme={scheme} />
                <TaskStatRow label="已失败" count={taskStats.failed} color="#ef4444" scheme={scheme} />
                <TaskStatRow label="已取消" count={taskStats.cancelled} color="#6b7280" scheme={scheme} />
              </div>
            </div>

            {/* 最近任务 */}
            <div className="lg:col-span-2 rounded-xl p-6" style={cardStyle}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <Clock className="w-4 h-4" />
                最近任务
              </h3>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 mx-auto mb-2" style={{ color: scheme.textTertiary }} />
                  <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无任务记录</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tasks.slice(0, 10).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: scheme.bgHover }}
                    >
                      <TaskStatusIcon status={task.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>
                          {task.name}
                        </p>
                        <p className="text-xs" style={{ color: scheme.textTertiary }}>
                          {task.type} · {new Date(task.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {task.status === 'running' && (
                        <span className="text-xs font-mono" style={{ color: scheme.info }}>
                          {task.progress}%
                        </span>
                      )}
                      {task.error && (
                        <span className="text-xs text-red-500 truncate max-w-[120px]" title={task.error}>
                          {task.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 标签分布 */}
          {Object.keys(tagStats.byType).length > 0 && (
            <div className="rounded-xl p-6" style={cardStyle}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: scheme.textPrimary }}>
                <Tag className="w-4 h-4" />
                标签类型分布
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(tagStats.byType).map(([type, count]) => {
                  const colors: Record<string, string> = {
                    ai: '#8b5cf6', user: '#3b82f6', system: '#64748b',
                    scene: '#10b981', clothing: '#ec4899', action: '#f59e0b',
                  }
                  const labels: Record<string, string> = {
                    ai: 'AI标签', user: '用户', system: '系统',
                    scene: '场景', clothing: '服饰', action: '动作',
                  }
                  return (
                    <div
                      key={type}
                      className="p-3 rounded-lg text-center"
                      style={{ backgroundColor: `${colors[type] || '#6b7280'}10` }}
                    >
                      <p className="text-xs font-medium mb-1" style={{ color: colors[type] || '#6b7280' }}>
                        {labels[type] || type}
                      </p>
                      <p className="text-lg font-bold" style={{ color: scheme.textPrimary }}>{count}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 辅助组件
function StatusItem({ label, status, detail, scheme }: {
  label: string; status: 'healthy' | 'warning' | 'error'; detail: string; scheme: any
}) {
  const colors = {
    healthy: { bg: '#10b98120', text: '#10b981', dot: '#10b981' },
    warning: { bg: '#f59e0b20', text: '#f59e0b', dot: '#f59e0b' },
    error: { bg: '#ef444420', text: '#ef4444', dot: '#ef4444' },
  }
  const c = colors[status]
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: c.bg }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
        <span className="text-xs font-medium" style={{ color: c.text }}>{label}</span>
      </div>
      <p className="text-xs" style={{ color: scheme.textSecondary }}>{detail}</p>
    </div>
  )
}

function TaskStatRow({ label, count, color, scheme }: {
  label: string; count: number; color: string; scheme: any
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: scheme.textSecondary }}>{label}</span>
      <span className="text-sm font-bold font-mono" style={{ color: count > 0 ? color : scheme.textTertiary }}>
        {count}
      </span>
    </div>
  )
}

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
    case 'cancelled':
      return <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" />
    default:
      return <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
  }
}
