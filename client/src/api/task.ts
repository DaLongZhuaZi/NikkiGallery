import axios from 'axios'

const api = axios.create({
  baseURL: '/api/tasks',
  timeout: 30000,
})

// 任务状态类型
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// 任务类型
export type TaskType =
  | 'scan_albums'
  | 'scan_images'
  | 'extract_metadata'
  | 'generate_thumbnail'
  | 'ai_process'
  | 'batch_operation'
  | 'import_images'
  | 'export_images'
  | 'dedup'
  | 'decrypt'
  | 'custom'

// 任务接口
export interface Task {
  id: string
  name: string
  type: TaskType
  status: TaskStatus
  progress: number
  currentStep: string
  totalItems: number
  processedItems: number
  failedItems: number
  result: any
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  metadata: Record<string, any>
}

// 任务统计
export interface TaskStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

// 创建任务参数
export interface CreateTaskParams {
  name: string
  type: TaskType
  totalItems?: number
  metadata?: Record<string, any>
}

// 获取所有任务
export const getAllTasks = async (): Promise<Task[]> => {
  const response = await api.get('/')
  return response.data.data || response.data || []
}

// 获取活跃任务
export const getActiveTasks = async (): Promise<Task[]> => {
  const response = await api.get('/active')
  return response.data.data || response.data || []
}

// 获取任务统计
export const getTaskStats = async (): Promise<TaskStats> => {
  const response = await api.get('/stats')
  return response.data.data || response.data
}

// 获取单个任务
export const getTask = async (id: string): Promise<Task> => {
  const response = await api.get(`/${id}`)
  return response.data.data || response.data
}

// 创建任务
export const createTask = async (params: CreateTaskParams): Promise<Task> => {
  const response = await api.post('/', params)
  return response.data.data || response.data
}

// 取消任务
export const cancelTask = async (id: string): Promise<void> => {
  await api.post(`/${id}/cancel`)
}

// 清除已完成任务
export const clearCompletedTasks = async (): Promise<{ cleared: number }> => {
  const response = await api.post('/clear-completed')
  return response.data.data || response.data
}

// 设置最大并发数
export const setMaxConcurrent = async (max: number): Promise<void> => {
  await api.put('/max-concurrent', { max })
}

// SSE 连接管理
export type SSEEventCallback = (event: string, data: any) => void

export class TaskSSEConnection {
  private eventSource: EventSource | null = null
  private listeners: Map<string, Set<SSEEventCallback>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10

  connect(): void {
    if (this.eventSource) {
      this.eventSource.close()
    }

    this.eventSource = new EventSource('/api/tasks/sse')

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0
      this.emit('connected', {})
    }

    this.eventSource.onerror = () => {
      this.eventSource?.close()
      this.eventSource = null
      this.emit('disconnected', {})
      this.scheduleReconnect()
    }

    // 监听所有任务事件
    const events = ['connected', 'init', 'task:created', 'task:started', 'task:progress', 'task:completed', 'task:failed', 'task:cancelled']
    events.forEach(event => {
      this.eventSource!.addEventListener(event, ((e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          this.emit(event, data)
        } catch (error) {
          console.error(`Failed to parse SSE event ${event}:`, error)
        }
      }) as EventListener)
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max SSE reconnect attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  on(event: string, callback: SSEEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // 返回取消监听函数
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error(`SSE listener error for ${event}:`, error)
      }
    })
    // 同时触发通配符监听
    this.listeners.get('*')?.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('SSE wildcard listener error:', error)
      }
    })
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }
}

// 全局 SSE 连接实例
let sseInstance: TaskSSEConnection | null = null

export const getTaskSSE = (): TaskSSEConnection => {
  if (!sseInstance) {
    sseInstance = new TaskSSEConnection()
  }
  return sseInstance
}
