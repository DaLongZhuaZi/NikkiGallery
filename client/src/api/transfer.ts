import axios from 'axios'

const api = axios.create({
  baseURL: '/api/transfer',
  timeout: 30000,
})

/** 传输任务状态 */
export type TransferStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled'

/** 传输方向 */
export type TransferDirection = 'upload' | 'download'

/** 传输文件 */
export interface TransferFile {
  id: string
  name: string
  size: number
  transferredBytes: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
  downloadUrl?: string
}

/** 传输任务 */
export interface TransferTask {
  id: string
  direction: TransferDirection
  status: TransferStatus
  files: TransferFile[]
  totalBytes: number
  transferredBytes: number
  createdAt: number
  expiresAt: number
  completedAt?: number
}

/** 服务器状态 */
export interface TransferStatusResponse {
  port: number
  addresses: string[]
  isRunning: boolean
}

/** 下载任务响应 */
export interface DownloadTaskResponse {
  taskId: string
  token: string
  direction: 'download'
  files: Array<{
    id: string
    name: string
    size: string
    downloadUrl: string
  }>
  infoUrl: string
  expiresAt: number
}

/** 上传任务响应 */
export interface UploadTaskResponse {
  taskId: string
  token: string
  direction: 'upload'
  uploadUrl: string
  infoUrl: string
  expiresAt: number
}

/**
 * 获取传输服务器状态
 */
export async function getTransferStatus(): Promise<TransferStatusResponse> {
  const response = await api.get('/status')
  return response.data.data
}

/**
 * 创建下载任务
 */
export async function createDownloadTask(filePaths: string[]): Promise<DownloadTaskResponse> {
  const response = await api.post('/download', { filePaths })
  return response.data.data
}

/**
 * 创建上传任务
 */
export async function createUploadTask(fileCount?: number): Promise<UploadTaskResponse> {
  const response = await api.post('/upload', { fileCount })
  return response.data.data
}

/**
 * 获取任务信息
 */
export async function getTaskInfo(taskId: string): Promise<TransferTask> {
  const response = await api.get(`/task/${taskId}`)
  return response.data.data
}

/**
 * 取消任务
 */
export async function cancelTask(taskId: string): Promise<void> {
  await api.post(`/task/${taskId}/cancel`)
}

/**
 * 获取传输历史
 */
export async function getTransferHistory(): Promise<TransferTask[]> {
  const response = await api.get('/history')
  return response.data.data
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/task/${taskId}`)
}

/**
 * 清理过期任务
 */
export async function cleanupExpiredTasks(): Promise<number> {
  const response = await api.post('/cleanup')
  return response.data.data.cleaned
}
