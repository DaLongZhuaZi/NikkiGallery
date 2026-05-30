import { create } from 'zustand'
import {
  ResourceType,
  ResourceInfo,
  ResourceFile,
  ResourceResult,
  getResourceTypes,
  scanResources
} from '../api/resources'

interface ResourceState {
  // 资源类型信息
  resourceTypes: ResourceInfo[]

  // 当前选中的资源类型
  selectedType: ResourceType

  // 扫描结果
  scanResult: ResourceResult | null

  // 加载状态
  isLoading: boolean
  isScanning: boolean
  error: string | null

  // 操作
  loadResourceTypes: () => Promise<void>
  setSelectedType: (type: ResourceType) => void
  scanCurrentType: () => Promise<void>
  clearError: () => void
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  resourceTypes: [],
  selectedType: ResourceType.LauncherCacheImages,
  scanResult: null,
  isLoading: false,
  isScanning: false,
  error: null,

  loadResourceTypes: async () => {
    set({ isLoading: true, error: null })
    try {
      const types = await getResourceTypes()
      set({ resourceTypes: types, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载资源类型失败',
        isLoading: false
      })
    }
  },

  setSelectedType: (type: ResourceType) => {
    set({ selectedType: type, scanResult: null })
  },

  scanCurrentType: async () => {
    const { selectedType } = get()
    set({ isScanning: true, error: null })
    try {
      const result = await scanResources(selectedType)
      set({ scanResult: result, isScanning: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '扫描资源失败',
        isScanning: false
      })
    }
  },

  clearError: () => set({ error: null })
}))

export type { ResourceInfo, ResourceFile, ResourceResult }
export { ResourceType }
