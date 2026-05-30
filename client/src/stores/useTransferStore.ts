import { create } from 'zustand'
import {
  TransferTask,
  TransferStatusResponse,
  getTransferStatus,
  createDownloadTask,
  createUploadTask,
  getTaskInfo,
  cancelTask,
  getTransferHistory,
  deleteTask,
  cleanupExpiredTasks,
} from '@/api/transfer'
import toast from 'react-hot-toast'

interface TransferState {
  // 服务器状态
  serverStatus: TransferStatusResponse | null
  isServerLoading: boolean

  // 当前任务
  currentTask: TransferTask | null
  isTaskLoading: boolean

  // 传输历史
  history: TransferTask[]
  isHistoryLoading: boolean

  // 操作
  fetchServerStatus: () => Promise<void>
  createDownload: (filePaths: string[]) => Promise<TransferTask | null>
  createUpload: (fileCount?: number) => Promise<TransferTask | null>
  fetchTaskInfo: (taskId: string) => Promise<void>
  cancelTransfer: (taskId: string) => Promise<void>
  fetchHistory: () => Promise<void>
  deleteTransfer: (taskId: string) => Promise<void>
  cleanupExpired: () => Promise<number>
  setCurrentTask: (task: TransferTask | null) => void
}

export const useTransferStore = create<TransferState>((set, get) => ({
  serverStatus: null,
  isServerLoading: false,
  currentTask: null,
  isTaskLoading: false,
  history: [],
  isHistoryLoading: false,

  fetchServerStatus: async () => {
    set({ isServerLoading: true })
    try {
      const status = await getTransferStatus()
      set({ serverStatus: status, isServerLoading: false })
    } catch (error) {
      console.error('Failed to fetch server status:', error)
      set({ isServerLoading: false })
    }
  },

  createDownload: async (filePaths: string[]) => {
    set({ isTaskLoading: true })
    try {
      const response = await createDownloadTask(filePaths)
      const taskInfo = await getTaskInfo(response.taskId)
      set({ currentTask: taskInfo, isTaskLoading: false })
      toast.success('下载任务已创建')
      return taskInfo
    } catch (error) {
      console.error('Failed to create download task:', error)
      toast.error('创建下载任务失败')
      set({ isTaskLoading: false })
      return null
    }
  },

  createUpload: async (fileCount?: number) => {
    set({ isTaskLoading: true })
    try {
      const response = await createUploadTask(fileCount)
      const taskInfo = await getTaskInfo(response.taskId)
      set({ currentTask: taskInfo, isTaskLoading: false })
      toast.success('上传任务已创建')
      return taskInfo
    } catch (error) {
      console.error('Failed to create upload task:', error)
      toast.error('创建上传任务失败')
      set({ isTaskLoading: false })
      return null
    }
  },

  fetchTaskInfo: async (taskId: string) => {
    set({ isTaskLoading: true })
    try {
      const task = await getTaskInfo(taskId)
      set({ currentTask: task, isTaskLoading: false })
    } catch (error) {
      console.error('Failed to fetch task info:', error)
      set({ isTaskLoading: false })
    }
  },

  cancelTransfer: async (taskId: string) => {
    try {
      await cancelTask(taskId)
      const { currentTask } = get()
      if (currentTask && currentTask.id === taskId) {
        set({ currentTask: { ...currentTask, status: 'cancelled' } })
      }
      toast.success('传输已取消')
    } catch (error) {
      console.error('Failed to cancel transfer:', error)
      toast.error('取消传输失败')
    }
  },

  fetchHistory: async () => {
    set({ isHistoryLoading: true })
    try {
      const history = await getTransferHistory()
      set({ history, isHistoryLoading: false })
    } catch (error) {
      console.error('Failed to fetch history:', error)
      set({ isHistoryLoading: false })
    }
  },

  deleteTransfer: async (taskId: string) => {
    try {
      await deleteTask(taskId)
      const { history, currentTask } = get()
      set({
        history: history.filter((t) => t.id !== taskId),
        currentTask: currentTask?.id === taskId ? null : currentTask,
      })
      toast.success('传输记录已删除')
    } catch (error) {
      console.error('Failed to delete transfer:', error)
      toast.error('删除传输记录失败')
    }
  },

  cleanupExpired: async () => {
    try {
      const count = await cleanupExpiredTasks()
      if (count > 0) {
        toast.success(`已清理 ${count} 个过期任务`)
        await get().fetchHistory()
      }
      return count
    } catch (error) {
      console.error('Failed to cleanup expired tasks:', error)
      toast.error('清理过期任务失败')
      return 0
    }
  },

  setCurrentTask: (task: TransferTask | null) => {
    set({ currentTask: task })
  },
}))
