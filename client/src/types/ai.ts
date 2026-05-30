export interface GPUInfo {
  type: 'discrete' | 'integrated' | 'cpu'
  backend: 'webgpu' | 'webgl' | 'wasm'
  renderer?: string
  vendor?: string
  memory?: number
  features?: string[]
}

export interface ModelConfig {
  name: string
  file: string
  size: string
  inputSize: [number, number]
  labels: string
  backend: 'webgl' | 'webgpu' | 'wasm'
}

export interface ClassificationResult {
  label: string
  labelZh: string
  labelEn: string
  confidence: number
  category: string
}

export interface DetectionResult {
  bbox: [number, number, number, number]
  label: string
  labelZh: string
  labelEn: string
  confidence: number
}

export interface FeatureVector {
  data: Float32Array
  dimensions: number
}

export interface SimilarImage {
  imageId: string
  similarity: number
}

export interface AIProcessStatus {
  isProcessing: boolean
  progress: number
  total: number
  current: number
  processedCount: number
  totalCount: number
  message?: string
  error?: string
}

export interface Tag {
  id: string
  nameZh: string
  nameEn: string
  type: 'ai' | 'user' | 'system' | 'scene' | 'clothing' | 'action'
  category?: string
  color?: string
  icon?: string
  usageCount: number
  createdAt: string
}
