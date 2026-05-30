import axios from 'axios'

const api = axios.create({
  baseURL: '/api/dedup',
  timeout: 60000 // 去重检测可能需要较长时间
})

export interface DuplicateFile {
  path: string
  filename: string
  size: number
  lastModified: string
  album: string
}

export interface DuplicateGroup {
  hash: string
  files: DuplicateFile[]
}

export interface DedupResult {
  totalFiles: number
  duplicateGroups: number
  duplicateFiles: number
  wastedSpace: number
  groups: DuplicateGroup[]
}

export interface RemoveResult {
  deletedCount: number
  freedSpace: number
  errors: string[]
}

export interface RecycleResult {
  movedCount: number
  freedSpace: number
  errors: string[]
  recycleBinPath: string
}

export interface SimilarFilenameGroup {
  pattern: string
  files: DuplicateFile[]
}

// 检测重复图片
export const detectDuplicates = async (params: {
  uid?: string
  albumTypes?: string[]
}): Promise<DedupResult> => {
  const response = await api.post('/detect', params)
  return response.data.data
}

// 删除重复文件
export const removeDuplicates = async (params: {
  groups: DuplicateGroup[]
  keepStrategy: 'newest' | 'oldest' | 'first' | 'last'
}): Promise<RemoveResult> => {
  const response = await api.post('/remove', params)
  return response.data.data
}

// 移动重复文件到回收站
export const recycleDuplicates = async (params: {
  groups: DuplicateGroup[]
  keepStrategy: 'newest' | 'oldest' | 'first' | 'last'
}): Promise<RecycleResult> => {
  const response = await api.post('/recycle', params)
  return response.data.data
}

// 查找相似文件名
export const findSimilarFilenames = async (params: {
  uid?: string
}): Promise<SimilarFilenameGroup[]> => {
  const response = await api.post('/similar-filenames', params)
  return response.data.data
}
