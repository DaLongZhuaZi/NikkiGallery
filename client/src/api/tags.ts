import axios from 'axios'

export interface Tag {
  id: string
  nameZh: string
  nameEn: string
  type: 'ai' | 'user' | 'system' | 'scene' | 'clothing' | 'action'
  category: string | null
  color: string | null
  icon: string | null
  usageCount: number
  createdAt: string
}

export interface CreateTagDTO {
  nameZh: string
  nameEn: string
  type: Tag['type']
  category?: string
  color?: string
  icon?: string
}

export interface TagStats {
  total: number
  byType: Record<string, number>
}

const API_BASE = '/api/tags'

export async function getTags(type?: Tag['type']): Promise<Tag[]> {
  const params = type ? { type } : {}
  const res = await axios.get(API_BASE, { params })
  return res.data.data
}

export async function getTagStats(): Promise<TagStats> {
  const res = await axios.get(`${API_BASE}/stats`)
  return res.data.data
}

export async function getPopularTags(limit = 20): Promise<Tag[]> {
  const res = await axios.get(`${API_BASE}/popular`, { params: { limit } })
  return res.data.data
}

export async function getTagById(id: string): Promise<Tag> {
  const res = await axios.get(`${API_BASE}/${id}`)
  return res.data.data
}

export async function createTag(data: CreateTagDTO): Promise<Tag> {
  const res = await axios.post(API_BASE, data)
  return res.data.data
}

export async function updateTag(id: string, data: Partial<CreateTagDTO>): Promise<Tag> {
  const res = await axios.put(`${API_BASE}/${id}`, data)
  return res.data.data
}

export async function deleteTag(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/${id}`)
}
