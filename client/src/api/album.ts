import axios from 'axios'
import { Album, CreateAlbumDTO, UpdateAlbumDTO } from '@/types/album'

// 独立的 axios 实例用于获取配置（避免循环依赖）
const configApi = axios.create({ baseURL: '/api', timeout: 10000 })

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const getAlbums = async (): Promise<Album[]> => {
  const response = await api.get('/albums')
  return response.data.data || response.data || []
}

export const getAlbum = async (id: string): Promise<Album> => {
  const response = await api.get(`/albums/${id}`)
  return response.data.data || response.data
}

export const createAlbum = async (data: CreateAlbumDTO): Promise<Album> => {
  const response = await api.post('/albums', data)
  return response.data.data || response.data
}

export const updateAlbum = async (id: string, data: UpdateAlbumDTO): Promise<Album> => {
  const response = await api.put(`/albums/${id}`, data)
  return response.data.data || response.data
}

export const deleteAlbum = async (id: string): Promise<void> => {
  await api.delete(`/albums/${id}`)
}

export const scanGameAlbums = async (gamePath?: string): Promise<Album[]> => {
  // 如果没有传入gamePath，先从配置中获取
  if (!gamePath) {
    const configResponse = await configApi.get('/settings')
    gamePath = configResponse.data?.gamePath || configResponse.data?.data?.gamePath
    if (!gamePath) {
      throw new Error('未配置游戏路径，请先在设置中配置游戏路径')
    }
  }
  const response = await api.post('/albums/scan', { gamePath })
  return response.data.data || response.data || []
}

// 扫描所有已配置的相册（使用 settings.json 中的 screenshotFolders + gamePath 自动发现）
export const scanAll = async (): Promise<Album[]> => {
  const response = await api.post('/albums/scan-all')
  return response.data.data || response.data || []
}
