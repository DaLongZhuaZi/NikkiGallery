export interface Image {
  id: string
  albumId: string
  filename: string
  path: string
  hash: string
  width: number
  height: number
  fileSize: number
  mimeType: string
  thumbnailPath?: string
  aiProcessed: boolean
  aiTags?: AITag[]
  userTags?: string[]
  description?: string
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export interface AITag {
  id: string
  nameZh: string
  nameEn: string
  confidence: number
  category: string
}

export interface ImageFilter {
  albumId?: string
  tags?: string[]
  favorite?: boolean
  aiProcessed?: boolean
  search?: string
  sortBy?: 'createdAt' | 'filename' | 'fileSize'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface BatchOperation {
  action: 'delete' | 'move' | 'copy' | 'tag' | 'favorite'
  imageIds: string[]
  targetAlbumId?: string
  tags?: string[]
  favorite?: boolean
}

export interface BatchOperationDTO {
  action: 'delete' | 'move' | 'copy' | 'tag' | 'favorite'
  imageIds: string[]
  targetAlbumId?: string
  tags?: string[]
  favorite?: boolean
}

export interface ImageListResponse {
  images: Image[]
  total: number
  page: number
  pageSize: number
}
