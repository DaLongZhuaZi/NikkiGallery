export interface Album {
  id: string
  name: string
  path: string
  accountId?: string
  type: 'game' | 'custom'
  description?: string
  coverImageId?: string
  imageCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateAlbumDTO {
  name: string
  path: string
  accountId?: string
  type?: 'game' | 'custom'
  description?: string
}

export interface UpdateAlbumDTO {
  name?: string
  description?: string
  coverImageId?: string
}
