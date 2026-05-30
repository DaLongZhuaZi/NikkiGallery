import { create } from 'zustand'
import { Tag, AIProcessStatus, GPUInfo, SimilarImage, ClassificationResult } from '@/types/ai'
import * as aiApi from '@/api/ai'

interface ProcessResult {
  imageId: string
  classifications: {
    tagId: string
    tagNameZh: string
    tagNameEn: string
    confidence: number
    category: string
  }[]
  detections: any[]
  timestamp: number
}

interface AIStore {
  tags: Tag[]
  processStatus: AIProcessStatus
  gpuInfo: GPUInfo | null
  similarImages: SimilarImage[]
  loading: boolean
  error: string | null
  lastProcessResult: ProcessResult | null
  
  // Actions
  fetchTags: () => Promise<void>
  processImage: (imageId: string) => Promise<void>
  batchProcess: (options: aiApi.BatchProcessOptions) => Promise<any>
  searchSimilar: (imageId: string) => Promise<void>
  detectGPU: () => Promise<void>
  classifyImage: (imageId: string) => Promise<void>
  detectObjects: (imageId: string) => Promise<void>
  extractFeatures: (imageId: string) => Promise<void>
  clearSimilarImages: () => void
}

export const useAIStore = create<AIStore>((set, get) => ({
  tags: [],
  processStatus: {
    isProcessing: false,
    progress: 0,
    total: 0,
    current: 0,
    processedCount: 0,
    totalCount: 0,
  },
  gpuInfo: null,
  similarImages: [],
  loading: false,
  error: null,
  lastProcessResult: null,

  fetchTags: async () => {
    set({ loading: true, error: null })
    try {
      const tags = await aiApi.getTags()
      set({ tags, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取标签失败',
        loading: false 
      })
    }
  },

  processImage: async (imageId: string) => {
    set(state => ({
      processStatus: {
        ...state.processStatus,
        isProcessing: true,
        currentImageId: imageId,
        progress: 0,
      }
    }))
    try {
      await aiApi.processImage(imageId)
      set(state => ({
        processStatus: {
          ...state.processStatus,
          isProcessing: false,
          progress: 100,
          processedCount: state.processStatus.processedCount + 1,
        }
      }))
    } catch (error) {
      set(state => ({
        processStatus: {
          ...state.processStatus,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'AI处理失败',
        }
      }))
    }
  },

  batchProcess: async (options: aiApi.BatchProcessOptions) => {
    set({
      processStatus: {
        isProcessing: true,
        progress: 0,
        total: options.imageIds?.length || 0,
        current: 0,
        processedCount: 0,
        totalCount: options.imageIds?.length || 0,
      }
    })
    try {
      const result = await aiApi.batchProcess(options)
      
      set(state => ({
        processStatus: {
          ...state.processStatus,
          isProcessing: false,
        }
      }))
      
      return result
    } catch (error) {
      set(state => ({
        processStatus: {
          ...state.processStatus,
          isProcessing: false,
          error: error instanceof Error ? error.message : '批量处理失败',
        }
      }))
      throw error
    }
  },

  searchSimilar: async (imageId: string) => {
    set({ loading: true, error: null })
    try {
      const similarImages = await aiApi.searchSimilar(imageId)
      set({ similarImages, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '相似搜索失败',
        loading: false 
      })
    }
  },

  detectGPU: async () => {
    try {
      const gpuInfo = await aiApi.detectGPU()
      if (gpuInfo && gpuInfo.type) {
        set({ gpuInfo })
      } else {
        // API 返回了空数据，设置默认 CPU 信息
        console.warn('GPU detection returned empty data:', gpuInfo)
        set({
          gpuInfo: {
            type: 'cpu',
            backend: 'wasm',
            renderer: 'CPU Only',
            features: ['wasm'],
          }
        })
      }
    } catch (error) {
      console.error('GPU detection failed:', error)
      set({
        gpuInfo: {
          type: 'cpu',
          backend: 'wasm',
          renderer: 'CPU Only',
          features: ['wasm'],
        },
        error: error instanceof Error ? error.message : 'GPU检测失败'
      })
    }
  },

  classifyImage: async (imageId: string) => {
    set({ loading: true, error: null })
    try {
      await aiApi.classifyImage(imageId)
      set({ loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '图像分类失败',
        loading: false 
      })
    }
  },

  detectObjects: async (imageId: string) => {
    set({ loading: true, error: null })
    try {
      await aiApi.detectObjects(imageId)
      set({ loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '目标检测失败',
        loading: false 
      })
    }
  },

  extractFeatures: async (imageId: string) => {
    set({ loading: true, error: null })
    try {
      await aiApi.extractFeatures(imageId)
      set({ loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '特征提取失败',
        loading: false 
      })
    }
  },

  clearSimilarImages: () => {
    set({ similarImages: [] })
  },
}))
