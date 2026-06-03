import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface GameMap {
  id: string
  name: string
  width?: number
  height?: number
  assetName: string
  mapSize: { width: number, height: number }
  refPoints: {
    pixelX: number
    pixelY: number
    coordX: number
    coordY: number
  }[]
}

export interface GameRegion {
  id: string
  name: string
  mapId: string
  polygon: { x: number, y: number }[]
  heightRange: {
    min: number
    max: number
  }
}

export interface CoordToPixelRequest {
  coordX: number
  coordY: number
  mapId: string
}

export interface CoordToPixelResponse {
  pixelX: number
  pixelY: number
}

export interface PixelToCoordRequest {
  pixelX: number
  pixelY: number
  mapId: string
}

export interface PixelToCoordResponse {
  coordX: number
  coordY: number
}

export interface RegionDetectRequest {
  x: number
  y: number
  z: number
}

export interface RegionDetectResponse {
  region: GameRegion | null
  mapId: string | null
}

export interface BatchCoordToPixelRequest {
  coords: { coordX: number; coordY: number; coordZ?: number; id?: string }[]
  mapId?: string
}

export type BatchCoordToPixelResponse = ({ pixelX: number; pixelY: number; mapId: string } | null)[]

export const mapApi = {
  /** 获取所有地图 */
  getMaps: async (): Promise<GameMap[]> => {
    const response = await api.get('/map/maps')
    return response.data.data
  },

  /** 获取地图区域 */
  getRegions: async (mapId?: string): Promise<GameRegion[]> => {
    const params = mapId ? { mapId } : {}
    const response = await api.get('/map/regions', { params })
    return response.data.data
  },

  /** 批量转换游戏坐标 */
  batchCoordToPixel: async (req: BatchCoordToPixelRequest): Promise<BatchCoordToPixelResponse> => {
    const response = await api.post('/map/batch-coord-to-pixel', req)
    return response.data.data
  },

  /** 游戏坐标转像素坐标 */
  coordToPixel: async (req: CoordToPixelRequest): Promise<CoordToPixelResponse> => {
    const response = await api.post('/map/coord-to-pixel', req)
    return response.data.data
  },

  /** 像素坐标转游戏坐标 */
  pixelToCoord: async (req: PixelToCoordRequest): Promise<PixelToCoordResponse> => {
    const response = await api.post('/map/pixel-to-coord', req)
    return response.data.data
  },

  /** 根据3D坐标检测区域 */
  detectRegion: async (req: RegionDetectRequest): Promise<RegionDetectResponse> => {
    const response = await api.post('/map/region', req)
    return response.data.data
  },
}
