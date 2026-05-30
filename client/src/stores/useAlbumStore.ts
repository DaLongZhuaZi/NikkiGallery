import { create } from 'zustand'
import { Album, CreateAlbumDTO, UpdateAlbumDTO } from '@/types/album'
import * as albumApi from '@/api/album'

interface AlbumStore {
  albums: Album[]
  currentAlbum: Album | null
  loading: boolean
  error: string | null
  
  // Actions
  fetchAlbums: () => Promise<void>
  selectAlbum: (id: string) => void
  createAlbum: (data: CreateAlbumDTO) => Promise<void>
  updateAlbum: (id: string, data: UpdateAlbumDTO) => Promise<void>
  deleteAlbum: (id: string) => Promise<void>
  scanGameAlbums: () => Promise<void>
}

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  albums: [],
  currentAlbum: null,
  loading: false,
  error: null,

  fetchAlbums: async () => {
    set({ loading: true, error: null })
    try {
      const albums = await albumApi.getAlbums()
      set({ albums, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取相册失败',
        loading: false 
      })
    }
  },

  selectAlbum: (id: string) => {
    const album = get().albums.find(a => a.id === id) || null
    set({ currentAlbum: album })
  },

  createAlbum: async (data: CreateAlbumDTO) => {
    set({ loading: true, error: null })
    try {
      const newAlbum = await albumApi.createAlbum(data)
      set(state => ({ 
        albums: [...state.albums, newAlbum],
        loading: false 
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '创建相册失败',
        loading: false 
      })
      throw error
    }
  },

  updateAlbum: async (id: string, data: UpdateAlbumDTO) => {
    set({ loading: true, error: null })
    try {
      const updatedAlbum = await albumApi.updateAlbum(id, data)
      set(state => ({
        albums: state.albums.map(a => a.id === id ? updatedAlbum : a),
        currentAlbum: state.currentAlbum?.id === id ? updatedAlbum : state.currentAlbum,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新相册失败',
        loading: false 
      })
      throw error
    }
  },

  deleteAlbum: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await albumApi.deleteAlbum(id)
      set(state => ({
        albums: state.albums.filter(a => a.id !== id),
        currentAlbum: state.currentAlbum?.id === id ? null : state.currentAlbum,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除相册失败',
        loading: false 
      })
      throw error
    }
  },

  scanGameAlbums: async () => {
    set({ loading: true, error: null })
    try {
      // 使用 scanAll 接口，扫描所有已配置的截图文件夹
      const scannedAlbums = await albumApi.scanAll()
      // 合并：保留自定义相册 + 更新游戏相册
      set(state => {
        const customAlbums = state.albums.filter(a => a.type !== 'game')
        // 去重：以 path 为 key，避免重复
        const mergedMap = new Map<string, Album>()
        for (const a of customAlbums) mergedMap.set(a.path, a)
        for (const a of scannedAlbums) {
          if (!mergedMap.has(a.path)) mergedMap.set(a.path, a)
        }
        return { albums: Array.from(mergedMap.values()), loading: false }
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '扫描游戏相册失败',
        loading: false 
      })
      throw error
    }
  },
}))
