import axios from 'axios'
import { Tag, ClassificationResult, DetectionResult, GPUInfo, SimilarImage } from '@/types/ai'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

export const getTags = async (): Promise<Tag[]> => {
  const response = await api.get('/tags')
  return response.data.data || response.data || []
}

export const createTag = async (tag: Partial<Tag>): Promise<Tag> => {
  const response = await api.post('/tags', tag)
  return response.data.data || response.data
}

export const updateTag = async (id: string, tag: Partial<Tag>): Promise<Tag> => {
  const response = await api.put(`/tags/${id}`, tag)
  return response.data.data || response.data
}

export const deleteTag = async (id: string): Promise<void> => {
  await api.delete(`/tags/${id}`)
}

export const classifyImage = async (imageId: string): Promise<ClassificationResult[]> => {
  const response = await api.post('/ai/classify', { imageId })
  return response.data.data || response.data || []
}

export const detectObjects = async (imageId: string): Promise<DetectionResult[]> => {
  const response = await api.post('/ai/detect', { imageId })
  return response.data.data || response.data || []
}

export const extractFeatures = async (imageId: string): Promise<Float32Array> => {
  const response = await api.post('/ai/extract-features', { imageId })
  const data = response.data.data || response.data
  return new Float32Array(data.features || [])
}

export const searchSimilar = async (imageId: string): Promise<SimilarImage[]> => {
  const response = await api.post('/ai/search-similar', { imageId })
  return response.data.data || response.data || []
}

export const processImage = async (imageId: string): Promise<any> => {
  const response = await api.post('/ai/process', { imageId })
  return response.data.data || response.data
}

export interface BatchProcessOptions {
  imageIds?: string[];
  targetScope?: string;
  albumId?: string;
  tasks?: string[];
}

export const batchProcess = async (options: BatchProcessOptions): Promise<any> => {
  const response = await api.post('/ai/batch-process', options)
  return response.data.data || response.data
}

export const detectGPU = async (): Promise<GPUInfo> => {
  // GPU检测可能因服务未启动而失败，添加重试
  let lastError: any
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await api.get('/ai/gpu-info', { timeout: 15000 })
      const data = response.data.data || response.data
      if (data && data.type) return data
    } catch (err: any) {
      lastError = err
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  // 所有重试都失败，返回默认 CPU 信息
  console.warn('GPU detection failed after retries:', lastError?.message)
  return {
    type: 'cpu',
    backend: 'wasm',
    renderer: 'CPU Only',
    features: ['wasm'],
  }
}

export const getAIStatus = async (): Promise<{ status: string; model: string }> => {
  const response = await api.get('/ai/status')
  return response.data.data || response.data
}

export const getModels = async (): Promise<any[]> => {
  const response = await api.get('/ai/models')
  return response.data.data || response.data || []
}
