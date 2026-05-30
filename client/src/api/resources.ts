import axios from 'axios'

const api = axios.create({
  baseURL: '/api/resources',
  timeout: 30000
})

export enum ResourceType {
  LauncherCacheImages = 'LauncherCacheImages',
  MallPic = 'MallPic',
  Movies = 'Movies'
}

export interface ResourceInfo {
  type: ResourceType
  name: string
  description: string
  isImage: boolean
  onlyWindows: boolean
  isRequireInstall: boolean
  locate: string
}

export interface ResourceFile {
  path: string
  filename: string
  size: number
  lastModified: string
  extension: string
}

export interface ResourceResult {
  type: ResourceType
  path: string | null
  files: ResourceFile[]
  totalSize: number
}

export interface ResourceCheckResult {
  type: ResourceType
  exists: boolean
  path: string | null
}

// 获取所有资源类型信息
export const getResourceTypes = async (): Promise<ResourceInfo[]> => {
  const response = await api.get('/types')
  return response.data
}

// 获取指定类型资源信息
export const getResourceInfo = async (type: ResourceType): Promise<ResourceInfo> => {
  const response = await api.get(`/types/${type}`)
  return response.data
}

// 检查资源路径是否存在
export const checkResourcePath = async (type: ResourceType): Promise<ResourceCheckResult> => {
  const response = await api.get(`/check/${type}`)
  return response.data
}

// 扫描资源文件
export const scanResources = async (type: ResourceType): Promise<ResourceResult> => {
  const response = await api.get(`/scan/${type}`)
  return response.data
}

// 获取资源文件预览URL
export const getResourceFileUrl = (filePath: string): string => {
  return `/api/resources/file?path=${encodeURIComponent(filePath)}`
}
