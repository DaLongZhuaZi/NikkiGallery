import { create } from 'zustand'
import { ShareCode, CreateShareCodeDTO, UpdateShareCodeDTO, ShareCodeFilter } from '@/types/share'
import * as shareApi from '@/api/share'

interface ShareStore {
  shareCodes: ShareCode[]
  currentShareCode: ShareCode | null
  loading: boolean
  error: string | null
  filter: ShareCodeFilter
  total: number
  page: number
  pageSize: number
  lastFetchedAt: number
  
  // Actions
  fetchShareCodes: (force?: boolean) => Promise<void>
  selectShareCode: (id: string) => void
  createShareCode: (data: CreateShareCodeDTO) => Promise<void>
  updateShareCode: (id: string, data: UpdateShareCodeDTO) => Promise<void>
  deleteShareCode: (id: string) => Promise<void>
  importShareCodes: (codes: string[]) => Promise<void>
  exportShareCodes: () => Promise<void>
  copyShareCode: (code: string) => Promise<void>
  setFilter: (filter: Partial<ShareCodeFilter>) => void
}

export const useShareStore = create<ShareStore>((set, get) => ({
  shareCodes: [],
  currentShareCode: null,
  loading: false,
  error: null,
  filter: {
    page: 1,
    pageSize: 20,
  },
  total: 0,
  page: 1,
  pageSize: 20,
  lastFetchedAt: 0,

  fetchShareCodes: async (force = false) => {
    if (!force && Date.now() - get().lastFetchedAt < 30_000) return
    set({ loading: true, error: null })
    try {
      const response = await shareApi.getShareCodes(get().filter)
      set({ 
        shareCodes: response.shareCodes,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        loading: false,
        lastFetchedAt: Date.now(),
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取分享码失败',
        loading: false 
      })
    }
  },

  selectShareCode: (id: string) => {
    const shareCode = get().shareCodes.find(s => s.id === id) || null
    set({ currentShareCode: shareCode })
  },

  createShareCode: async (data: CreateShareCodeDTO) => {
    set({ loading: true, error: null })
    try {
      const newShareCode = await shareApi.createShareCode(data)
      set(state => ({ 
        shareCodes: [newShareCode, ...state.shareCodes],
        loading: false 
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '创建分享码失败',
        loading: false 
      })
      throw error
    }
  },

  updateShareCode: async (id: string, data: UpdateShareCodeDTO) => {
    set({ loading: true, error: null })
    try {
      const updatedShareCode = await shareApi.updateShareCode(id, data)
      set(state => ({
        shareCodes: state.shareCodes.map(s => s.id === id ? updatedShareCode : s),
        currentShareCode: state.currentShareCode?.id === id ? updatedShareCode : state.currentShareCode,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新分享码失败',
        loading: false 
      })
      throw error
    }
  },

  deleteShareCode: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await shareApi.deleteShareCode(id)
      set(state => ({
        shareCodes: state.shareCodes.filter(s => s.id !== id),
        currentShareCode: state.currentShareCode?.id === id ? null : state.currentShareCode,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除分享码失败',
        loading: false 
      })
      throw error
    }
  },

  importShareCodes: async (codes: string[]) => {
    set({ loading: true, error: null })
    try {
      await shareApi.importShareCodes(codes)
      await get().fetchShareCodes()
      set({ loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '导入分享码失败',
        loading: false 
      })
      throw error
    }
  },

  exportShareCodes: async () => {
    set({ loading: true, error: null })
    try {
      await shareApi.exportShareCodes()
      set({ loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '导出分享码失败',
        loading: false 
      })
      throw error
    }
  },

  copyShareCode: async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '复制失败'
      })
      throw error
    }
  },

  setFilter: (filter: Partial<ShareCodeFilter>) => {
    set(state => ({
      filter: { ...state.filter, ...filter }
    }))
    get().fetchShareCodes()
  },
}))
