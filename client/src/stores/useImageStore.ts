import { create } from 'zustand'
import { Image, ImageFilter, BatchOperationDTO } from '@/types/image'
import * as imageApi from '@/api/image'

interface ImageStore {
  images: Image[]
  selectedImages: string[]
  loading: boolean
  error: string | null
  filter: ImageFilter
  total: number
  page: number
  pageSize: number
  imageStats: { total: number; aiProcessed: number }
  
  // Actions
  fetchImages: (albumId?: string) => Promise<void>
  loadMoreImages: () => Promise<void>
  fetchImageStats: () => Promise<void>
  selectImage: (id: string) => void
  selectAllImages: () => void
  clearSelection: () => void
  setFilter: (filter: Partial<ImageFilter>) => void
  batchDelete: (ids: string[]) => Promise<void>
  batchMove: (ids: string[], albumId: string) => Promise<void>
  batchFavorite: (ids: string[]) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  deleteImage: (id: string) => Promise<void>
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  selectedImages: [],
  loading: false,
  error: null,
  filter: {
    page: 1,
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  total: 0,
  page: 1,
  pageSize: 50,
  imageStats: { total: 0, aiProcessed: 0 },

  fetchImages: async (albumId?: string) => {
    set({ loading: true, error: null })
    try {
      const filter = { ...get().filter }
      if (albumId !== undefined) {
        filter.albumId = albumId
      }
      const response = await imageApi.getImages(filter)
      set({ 
        images: response.images,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        loading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取图片失败',
        loading: false 
      })
    }
  },

  loadMoreImages: async () => {
    const state = get()
    if (state.loading || state.images.length >= state.total) return

    set({ loading: true, error: null })
    try {
      const nextPage = state.page + 1
      const filter = { ...state.filter, page: nextPage }
      const response = await imageApi.getImages(filter)
      
      set(state => ({
        images: [...state.images, ...response.images],
        page: response.page,
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载更多图片失败',
        loading: false 
      })
    }
  },

  fetchImageStats: async () => {
    try {
      const stats = await imageApi.getImageStats()
      set({ imageStats: stats })
    } catch (error) {
      // 静默失败，不影响主流程
      console.warn('Failed to fetch image stats:', error)
    }
  },

  selectImage: (id: string) => {
    set(state => {
      const isSelected = state.selectedImages.includes(id)
      return {
        selectedImages: isSelected
          ? state.selectedImages.filter(i => i !== id)
          : [...state.selectedImages, id]
      }
    })
  },

  selectAllImages: () => {
    set(state => ({
      selectedImages: state.images.map(i => i.id)
    }))
  },

  clearSelection: () => {
    set({ selectedImages: [] })
  },

  setFilter: (filter: Partial<ImageFilter>) => {
    set(state => ({
      filter: { ...state.filter, ...filter }
    }))
    get().fetchImages()
  },

  batchDelete: async (ids: string[]) => {
    set({ loading: true, error: null })
    try {
      await imageApi.batchOperation({ imageIds: ids, action: 'delete' })
      set(state => ({
        images: state.images.filter(i => !ids.includes(i.id)),
        selectedImages: state.selectedImages.filter(i => !ids.includes(i)),
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '批量删除失败',
        loading: false 
      })
      throw error
    }
  },

  batchMove: async (ids: string[], albumId: string) => {
    set({ loading: true, error: null })
    try {
      await imageApi.batchOperation({ imageIds: ids, action: 'move', targetAlbumId: albumId })
      set(state => ({
        images: state.images.filter(i => !ids.includes(i.id)),
        selectedImages: [],
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量移动失败',
        loading: false
      })
      throw error
    }
  },

  batchFavorite: async (ids: string[]) => {
    set({ loading: true, error: null })
    try {
      await imageApi.batchOperation({ imageIds: ids, action: 'favorite' })
      set(state => ({
        images: state.images.map(i =>
          ids.includes(i.id) ? { ...i, favorite: true } : i
        ),
        selectedImages: [],
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量收藏失败',
        loading: false
      })
      throw error
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      await imageApi.toggleFavorite(id)
      set(state => ({
        images: state.images.map(i => 
          i.id === id ? { ...i, favorite: !i.favorite } : i
        )
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新收藏状态失败'
      })
    }
  },

  deleteImage: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await imageApi.deleteImage(id)
      set(state => ({
        images: state.images.filter(i => i.id !== id),
        selectedImages: state.selectedImages.filter(i => i !== id),
        loading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除图片失败',
        loading: false 
      })
      throw error
    }
  },
}))
