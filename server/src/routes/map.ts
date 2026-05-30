import { Router, Request, Response } from 'express'
import gameMapService from '../services/GameMapService'
import logger from '../utils/logger'

const router = Router()

/**
 * GET /api/map/maps
 * 获取所有地图信息
 */
router.get('/maps', (req: Request, res: Response) => {
  try {
    const maps = gameMapService.getAllMaps()
    // 转换为前端期望的格式
    const formatted = maps.map(m => ({
      id: String(m.id),
      name: m.name,
      assetName: m.assetName,
      mapSize: m.mapSize,
    }))
    res.json({
      success: true,
      data: formatted,
    })
  } catch (error) {
    logger.error('Failed to get maps:', error)
    res.status(500).json({
      success: false,
      message: '获取地图列表失败',
    })
  }
})

/**
 * GET /api/map/regions
 * 获取所有区域信息
 */
router.get('/regions', (req: Request, res: Response) => {
  try {
    const mapId = req.query.mapId ? parseInt(req.query.mapId as string) : undefined
    const regions = mapId
      ? gameMapService.getRegionsByMap(mapId)
      : gameMapService.getAllRegions()
    // 转换为前端期望的格式
    const formatted = regions.map(r => ({
      id: String(r.id),
      name: r.nameZh || r.name,
      mapId: String(r.mapId),
      polygon: r.polygon.map(p => [p.x, p.y]),
      heightRange: { min: r.minHeight, max: r.maxHeight },
    }))
    res.json({
      success: true,
      data: formatted,
    })
  } catch (error) {
    logger.error('Failed to get regions:', error)
    res.status(500).json({
      success: false,
      message: '获取区域列表失败',
    })
  }
})

/**
 * POST /api/map/coord-to-pixel
 * 将游戏坐标转换为地图像素坐标
 */
router.post('/coord-to-pixel', (req: Request, res: Response) => {
  try {
    const { mapId, coordX, coordY } = req.body

    if (coordX === undefined || coordY === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供坐标 coordX 和 coordY',
      })
    }

    const pixel = gameMapService.coordToPixel(mapId || 1, { x: coordX, y: coordY })

    res.json({
      success: true,
      data: { pixelX: pixel.x, pixelY: pixel.y },
    })
  } catch (error) {
    logger.error('Failed to convert coordinates:', error)
    res.status(500).json({
      success: false,
      message: '坐标转换失败',
    })
  }
})

/**
 * POST /api/map/pixel-to-coord
 * 将地图像素坐标转换为游戏坐标
 */
router.post('/pixel-to-coord', (req: Request, res: Response) => {
  try {
    const { mapId, pixelX, pixelY } = req.body

    if (pixelX === undefined || pixelY === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供像素坐标 pixelX 和 pixelY',
      })
    }

    const coord = gameMapService.pixelToCoord(mapId || 1, { x: pixelX, y: pixelY })

    res.json({
      success: true,
      data: { coordX: coord.x, coordY: coord.y },
    })
  } catch (error) {
    logger.error('Failed to convert pixel:', error)
    res.status(500).json({
      success: false,
      message: '坐标转换失败',
    })
  }
})

/**
 * POST /api/map/region
 * 根据游戏坐标判断所属区域
 */
router.post('/region', (req: Request, res: Response) => {
  try {
    const { x, y, z } = req.body

    if (x === undefined || y === undefined || z === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供坐标 x, y, z',
      })
    }

    const regions = gameMapService.getRegionByCoordinate({ x, y, z })
    const mainRegion = regions.length > 0 ? regions[0] : null

    // 转换区域数据为前端格式
    const formatRegion = (r: any) => ({
      id: String(r.id),
      name: r.nameZh || r.name,
      mapId: String(r.mapId),
      polygon: r.polygon.map((p: any) => [p.x, p.y]),
      heightRange: { min: r.minHeight, max: r.maxHeight },
    })

    res.json({
      success: true,
      data: {
        region: mainRegion ? formatRegion(mainRegion) : null,
        mapId: mainRegion ? String(mainRegion.mapId) : null,
        allRegions: regions.map(formatRegion),
      },
    })
  } catch (error) {
    logger.error('Failed to get region:', error)
    res.status(500).json({
      success: false,
      message: '区域判断失败',
    })
  }
})

export default router
