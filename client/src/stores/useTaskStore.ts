import { create } from 'zustand'
import * as taskApi from '@/api/task'
import type { Task, TaskStats, TaskType, TaskStatus } from '@/api/task'

interface TaskStore {
  // 状态
  tasks: Task[]
  activeTasks: Task[]
  stats: TaskStats
  loading: boolean
  error: string | null
  sseConnected: boolean
  showPanel: boolean

  // SSE 连接
  sse: taskApi.TaskSSEConnection | null

  // Actions
  initSSE: () => void
  disconnectSSE: () => void
  fetchTasks: () => Promise<void>
  fetchActiveTasks: () => Promise<void>
  fetchStats: () => Promise<void>
  createTask: (params: taskApi.CreateTaskParams) => Promise<Task>
  cancelTask: (id: string) => Promise<void>
  clearCompleted: () => Promise<void>
  togglePanel: () => void

  // 内部方法
  updateTask: (task: Task) => void
  removeTask: (id: string) => void
}

const defaultStats: TaskStats = {
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  activeTasks: [],
  stats: defaultStats,
  loading: false,
  error: null,
  sseConnected: false,
  showPanel: false,
  sse: null,

  initSSE: () => {
    const sse = taskApi.getTaskSSE()

    // 监听连接状态
    sse.on('connected', () => {
      set({ sseConnected: true })
    })

    sse.on('disconnected', () => {
      set({ sseConnected: false })
    })

    // 监听初始任务列表
    sse.on('init', (event, tasks: Task[]) => {
      set({ activeTasks: tasks })
    })

    // 监听任务事件
    sse.on('task:created', (event, task: Task) => {
      set(state => ({
        tasks: [task, ...state.tasks],
        activeTasks: [...state.activeTasks, task],
      }))
      get().fetchStats()
    })

    sse.on('task:started', (event, task: Task) => {
      get().updateTask(task)
    })

    sse.on('task:progress', (event, task: Task) => {
      get().updateTask(task)
    })

    sse.on('task:completed', (event, task: Task) => {
      get().updateTask(task)
      // 从活跃任务中移除
      set(state => ({
        activeTasks: state.activeTasks.filter(t => t.id !== task.id),
      }))
      get().fetchStats()
    })

    sse.on('task:failed', (event, task: Task) => {
      get().updateTask(task)
      set(state => ({
        activeTasks: state.activeTasks.filter(t => t.id !== task.id),
      }))
      get().fetchStats()
    })

    sse.on('task:cancelled', (event, task: Task) => {
      get().updateTask(task)
      set(state => ({
        activeTasks: state.activeTasks.filter(t => t.id !== task.id),
      }))
      get().fetchStats()
    })

    // 连接
    sse.connect()
    set({ sse })
  },

  disconnectSSE: () => {
    const { sse } = get()
    if (sse) {
      sse.disconnect()
      set({ sse: null, sseConnected: false })
    }
  },

  fetchTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await taskApi.getAllTasks()
      set({ tasks, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取任务列表失败',
        loading: false
      })
    }
  },

  fetchActiveTasks: async () => {
    try {
      const activeTasks = await taskApi.getActiveTasks()
      set({ activeTasks })
    } catch (error) {
      console.error('Failed to fetch active tasks:', error)
    }
  },

  fetchStats: async () => {
    try {
      const stats = await taskApi.getTaskStats()
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch task stats:', error)
    }
  },

  createTask: async (params: taskApi.CreateTaskParams) => {
    set({ error: null })
    try {
      const task = await taskApi.createTask(params)
      // SSE 会自动更新状态，这里不需要手动更新
      return task
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建任务失败'
      set({ error: message })
      throw error
    }
  },

  cancelTask: async (id: string) => {
    try {
      await taskApi.cancelTask(id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '取消任务失败'
      })
      throw error
    }
  },

  clearCompleted: async () => {
    try {
      await taskApi.clearCompletedTasks()
      // 刷新任务列表
      await get().fetchTasks()
      await get().fetchStats()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清除任务失败'
      })
      throw error
    }
  },

  togglePanel: () => {
    set(state => ({ showPanel: !state.showPanel }))
    // 打开面板时刷新数据
    if (!get().showPanel) return
    get().fetchTasks()
    get().fetchStats()
  },

  updateTask: (task: Task) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === task.id ? task : t),
      activeTasks: state.activeTasks.map(t => t.id === task.id ? task : t),
    }))
  },

  removeTask: (id: string) => {
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      activeTasks: state.activeTasks.filter(t => t.id !== id),
    }))
  },
}))

export default useTaskStore
