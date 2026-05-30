import axios from 'axios'
import { ShareCode, CreateShareCodeDTO, UpdateShareCodeDTO, ShareCodeFilter, ShareCodeListResponse } from '@/types/share'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const getShareCodes = async (filter: ShareCodeFilter): Promise<ShareCodeListResponse> => {
  const response = await api.get('/share-codes', { params: filter })
  const data = response.data.data || response.data
  return {
    shareCodes: data.shareCodes || data.data || [],
    total: data.total || 0,
    page: filter.page || 1,
    pageSize: filter.pageSize || 20,
  }
}

export const getShareCode = async (id: string): Promise<ShareCode> => {
  const response = await api.get(`/share-codes/${id}`)
  return response.data.data || response.data
}

export const createShareCode = async (data: CreateShareCodeDTO): Promise<ShareCode> => {
  const response = await api.post('/share-codes', data)
  return response.data.data || response.data
}

export const updateShareCode = async (id: string, data: UpdateShareCodeDTO): Promise<ShareCode> => {
  const response = await api.put(`/share-codes/${id}`, data)
  return response.data.data || response.data
}

export const deleteShareCode = async (id: string): Promise<void> => {
  await api.delete(`/share-codes/${id}`)
}

export const importShareCodes = async (codes: string[]): Promise<void> => {
  await api.post('/share-codes/import', { codes })
}

export const exportShareCodes = async (): Promise<void> => {
  const response = await api.get('/share-codes/export', {
    responseType: 'blob'
  })
  
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'share-codes.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
