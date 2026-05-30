export interface ShareCode {
  id: string
  type: 'dye' | 'home' | 'camera' | 'combo' | 'diy'
  code: string
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  imageId?: string
  roleId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateShareCodeDTO {
  type: ShareCode['type']
  code: string
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  imageId?: string
  roleId?: string
}

export interface UpdateShareCodeDTO {
  type?: ShareCode['type']
  code?: string
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  imageId?: string
  roleId?: string
}

export interface ShareCodeListResponse {
  shareCodes: ShareCode[]
  total: number
  page: number
  pageSize: number
}

export interface ShareCodeFilter {
  type?: ShareCode['type']
  roleId?: string
  search?: string
  page?: number
  pageSize?: number
}
