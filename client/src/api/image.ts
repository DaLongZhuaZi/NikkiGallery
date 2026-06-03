import axios from 'axios'
import { Image, ImageListResponse, ImageFilter, BatchOperationDTO } from '@/types/image'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const getImages = async (filter: ImageFilter): Promise<ImageListResponse> => {
  const params = { ...filter }
  if (params.tags && Array.isArray(params.tags)) {
    params.tags = params.tags.join(',') as any
  }
  const response = await api.get('/images', { params })
  const data = response.data.data || response.data
  return {
    images: data.images || [],
    total: data.total || 0,
    page: filter.page || 1,
    pageSize: filter.pageSize || 50,
  }
}

export const getWardrobe = async (): Promise<number[]> => {
  const response = await api.get('/images/wardrobe')
  return response.data.data || response.data
}

// 衣柜详情（带封面和图片数量）
export interface WardrobeItem {
  clothesId: number
  coverImageId: string
  customCoverImageId: string | null
  imageCount: number
}

export const getWardrobeDetail = async (): Promise<WardrobeItem[]> => {
  const response = await api.get('/images/wardrobe/detail')
  return response.data.data || []
}

export const setWardrobeCover = async (clothesId: number, imageId: string): Promise<void> => {
  await api.put('/images/wardrobe/covers', { clothesId, imageId })
}

export const removeWardrobeCover = async (clothesId: number): Promise<void> => {
  await api.delete(`/images/wardrobe/covers/${clothesId}`)
}

// 获取图片统计总数（不依赖分页）
export const getImageStats = async (): Promise<{ total: number; aiProcessed: number; favorites: number; trash: number }> => {
  const response = await api.get('/images/stats')
  const data = response.data.data || response.data
  return {
    total: data.total || 0,
    aiProcessed: data.processed || 0,
    favorites: data.favorites || 0,
    trash: data.trash || 0,
  }
}

export const getImage = async (id: string): Promise<Image> => {
  const response = await api.get(`/images/${id}`)
  return response.data.data || response.data
}

export const uploadImage = async (albumId: string, file: File): Promise<Image> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('albumId', albumId)
  
  const response = await api.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.data || response.data
}

export const deleteImage = async (id: string): Promise<void> => {
  await api.delete(`/images/${id}`)
}

export const batchOperation = async (data: BatchOperationDTO): Promise<void> => {
  await api.post('/images/batch', data)
}

export const getThumbnail = async (id: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<string> => {
  const response = await api.get(`/images/${id}/thumbnail`, { 
    params: { size },
    responseType: 'blob'
  })
  return URL.createObjectURL(response.data)
}

// 批量获取缩略图 URL 映射（返回 URL 路径而非 blob，利用浏览器 HTTP 缓存）
export const batchGetThumbnailUrls = async (imageIds: string[]): Promise<Record<string, string>> => {
  const response = await api.post('/images/thumbnails/batch', { imageIds })
  return response.data.data || {}
}

export const downloadImage = async (id: string): Promise<void> => {
  const response = await api.get(`/images/${id}/download`, {
    responseType: 'blob'
  })
  
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = response.headers['content-disposition']?.split('filename=')[1] || 'image.jpg'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const toggleFavorite = async (id: string): Promise<void> => {
  await api.put(`/images/${id}/favorite`)
}

// ============ 回收站相关 API ============

// 获取回收站图片列表
export const getTrashImages = async (params?: {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): Promise<ImageListResponse> => {
  const response = await api.get('/images/trash/list', { params })
  const data = response.data.data || response.data
  return {
    images: data.images || [],
    total: data.total || 0,
    page: params?.page || 1,
    pageSize: params?.pageSize || 50,
  }
}

// 获取回收站统计
export const getTrashStats = async (): Promise<{ data: { count: number; totalSize: number } }> => {
  const response = await api.get('/images/trash/stats')
  return response.data
}

// 恢复单张图片
export const restoreImage = async (id: string): Promise<void> => {
  await api.post(`/images/trash/${id}/restore`)
}

// 批量恢复图片
export const batchRestoreImages = async (imageIds: string[]): Promise<void> => {
  await api.post('/images/trash/batch-restore', { imageIds })
}

// 永久删除单张图片
export const permanentDeleteImage = async (id: string, deleteFile: boolean = true): Promise<void> => {
  await api.delete(`/images/trash/${id}`, { params: { deleteFile } })
}

// 批量永久删除图片
export const batchPermanentDeleteImages = async (imageIds: string[], deleteFile: boolean = true): Promise<void> => {
  await api.delete('/images/trash/batch', { data: { imageIds, deleteFiles: deleteFile } })
}

// 清空回收站
export const emptyTrash = async (deleteFiles: boolean = true): Promise<void> => {
  await api.delete('/images/trash/empty', { params: { deleteFiles } })
}

// ============ 元数据相关 API ============

// 获取图片元数据
export const getImageMetadata = async (id: string): Promise<{
  exif: any | null
  cameraParams: any | null
  gameMetadata: any | null
}> => {
  const response = await api.get(`/images/${id}/metadata`)
  return response.data.data || response.data
}

// 提取单张图片元数据
export const extractMetadata = async (id: string): Promise<void> => {
  await api.post(`/images/${id}/extract-metadata`)
}

// 批量提取元数据
export const batchExtractMetadata = async (imageIds: string[]): Promise<{ success: number; failed: number }> => {
  const response = await api.post('/images/batch-extract-metadata', { imageIds })
  return response.data.data || response.data
}
