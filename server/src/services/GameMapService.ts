import logger from '../utils/logger'

// 游戏地图定义
export interface GameMapInfo {
  id: number
  name: string
  assetName: string
  mapSize: { width: number; height: number }
  referencePoints: {
    p1: { x: number; y: number }
    c1: { x: number; y: number }
    p2: { x: number; y: number }
    c2: { x: number; y: number }
  }
}

// 游戏区域定义
export interface GameRegion {
  id: number
  name: string
  nameZh: string
  mapId: number
  minHeight: number
  maxHeight: number
  polygon: Array<{ x: number; y: number }>
}

// 坐标点
export interface Coordinate {
  x: number
  y: number
  z: number
}

// 像素点
export interface PixelPoint {
  x: number
  y: number
}

// 地图标记
export interface MapMarker {
  id: string
  pixel: PixelPoint
  regionId: number
  regionName: string
  coordinate: Coordinate
}

// 地图数据
export const GAME_MAPS: Record<number, GameMapInfo> = {
  1: {
    id: 1,
    name: 'miraland',
    assetName: '/maps/miraland.webp',
    mapSize: { width: 14203, height: 6594 },
    referencePoints: {
      p1: { x: 10919, y: 3578 },
      c1: { x: -13579, y: -54188 },
      p2: { x: 2882, y: 1076 },
      c2: { x: -532885, y: -215756 },
    },
  },
  2: {
    id: 2,
    name: 'firework_isles',
    assetName: '/maps/firework_isles.webp',
    mapSize: { width: 4643, height: 3560 },
    referencePoints: {
      p1: { x: 2471, y: 2506 },
      c1: { x: -226337, y: 590110 },
      p2: { x: 2217, y: 836 },
      c2: { x: -231603, y: 555634 },
    },
  },
  3: {
    id: 3,
    name: 'serenity_island',
    assetName: '/maps/serenity_island.webp',
    mapSize: { width: 4440, height: 4565 },
    referencePoints: {
      p1: { x: 2777, y: 2090 },
      c1: { x: -9343, y: 29357 },
      p2: { x: 1144, y: 3021 },
      c2: { x: -41953, y: 48031 },
    },
  },
  4: {
    id: 4,
    name: 'danqing_island',
    assetName: '/maps/danqing_island.webp',
    mapSize: { width: 3954, height: 5074 },
    referencePoints: {
      p1: { x: 2514, y: 3620 },
      c1: { x: -258712, y: 289927 },
      p2: { x: 966, y: 667 },
      c2: { x: -305950, y: 199720 },
    },
  },
  5: {
    id: 5,
    name: 'danqing_realm',
    assetName: '/maps/danqing_realm.webp',
    mapSize: { width: 4896, height: 5194 },
    referencePoints: {
      p1: { x: 3484, y: 4011 },
      c1: { x: -264691, y: 271984 },
      p2: { x: 784, y: 333 },
      c2: { x: -346999, y: 159860 },
    },
  },
  6: {
    id: 6,
    name: 'wanxiang_realm',
    assetName: '/maps/wanxiang_realm.webp',
    mapSize: { width: 4526, height: 3819 },
    referencePoints: {
      p1: { x: 1234, y: 1722 },
      c1: { x: 38156, y: 55446 },
      p2: { x: 3347, y: 2711 },
      c2: { x: 122843, y: 95361 },
    },
  },
}

// 游戏区域定义
export const GAME_REGIONS: GameRegion[] = [
  {
    id: 1,
    name: 'home',
    nameZh: '家园',
    mapId: 1,
    minHeight: -300,
    maxHeight: 7000,
    polygon: [
      { x: -10174.93, y: -8472.43 },
      { x: 11535.34, y: -14879.2 },
      { x: 16067.64, y: -13760.11 },
      { x: 22306.55, y: -8108.73 },
      { x: 23733.38, y: 1487.44 },
      { x: 17970.09, y: 16790.94 },
      { x: 7590.57, y: 25072.18 },
      { x: 8.76, y: 25072.18 },
      { x: -10482.68, y: 17210.6 },
      { x: -15658.45, y: 4536.95 },
      { x: -14007.8, y: -4052.04 },
    ],
  },
  {
    id: 2,
    name: 'sea_of_stars',
    nameZh: '星海',
    mapId: 1,
    minHeight: -21000,
    maxHeight: -16000,
    polygon: [
      { x: 37807.43, y: 72039.43 },
      { x: -10490.97, y: 65704.18 },
      { x: -37023.73, y: 52092.82 },
      { x: -38591.86, y: 43123.11 },
      { x: -35392.88, y: 33212.53 },
      { x: -25105.94, y: 24242.83 },
      { x: -23914.16, y: 16715.81 },
      { x: -18143.45, y: 11697.79 },
      { x: -11118.22, y: 12387.77 },
      { x: -5222.06, y: 16715.81 },
      { x: 6695.73, y: 15524.03 },
      { x: 13030.98, y: 9188.78 },
      { x: 20118.92, y: 8436.08 },
      { x: 22627.93, y: 10506.01 },
      { x: 18299.89, y: 22674.7 },
      { x: 18299.89, y: 27316.36 },
      { x: 25136.94, y: 30828.98 },
      { x: 38873.76, y: 32020.75 },
      { x: 45773.53, y: 38544.17 },
      { x: 46651.68, y: 43813.09 },
      { x: 43389.97, y: 69781.32 },
    ],
  },
  {
    id: 3,
    name: 'memorial_mountains',
    nameZh: '纪念山地',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -56614.89, y: -43412.28 },
      { x: -26101.43, y: -48777.99 },
      { x: -37026.8, y: -53303.29 },
      { x: -40323.81, y: -59186.18 },
      { x: -48469.35, y: -56600.3 },
      { x: -52283.53, y: -62483.19 },
      { x: -45948.11, y: -83040.99 },
      { x: -95144.6, y: -80261.16 },
    ],
  },
  {
    id: 4,
    name: 'florawish',
    nameZh: '花愿镇',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: 49277.16, y: -42636.51 },
      { x: 53349.93, y: -46192.1 },
      { x: 58651.0, y: -45674.93 },
      { x: 61948.0, y: -42636.51 },
      { x: 89616.98, y: -44705.22 },
      { x: 131766.93, y: -29707.08 },
      { x: 127694.16, y: -11670.52 },
      { x: 25163.77, y: -29448.49 },
      { x: -25842.84, y: -47226.46 },
      { x: -35992.45, y: -52592.17 },
      { x: -40065.22, y: -59186.18 },
      { x: -49245.12, y: -56858.89 },
      { x: -52283.53, y: -63194.31 },
      { x: -37285.39, y: -103081.61 },
      { x: 23095.06, y: -96487.6 },
    ],
  },
  {
    id: 5,
    name: 'breezy_meadow',
    nameZh: '微风绿野',
    mapId: 1,
    minHeight: -25000,
    maxHeight: -6000,
    polygon: [
      { x: -57843.19, y: -42636.51 },
      { x: -26360.02, y: -48519.4 },
      { x: 533.2, y: -15743.29 },
      { x: 16759.64, y: 18261.11 },
      { x: 68089.48, y: 54334.23 },
      { x: 68089.48, y: 95191.23 },
      { x: 29947.66, y: 133785.59 },
      { x: -113439.75, y: 102819.6 },
      { x: -107621.5, y: 42374.5 },
      { x: -77172.69, y: 6818.57 },
      { x: -70578.68, y: -16001.88 },
      { x: -79176.75, y: -36042.5 },
    ],
  },
  {
    id: 6,
    name: 'stoneville',
    nameZh: '小石树田村',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -71289.8, y: -15484.7 },
      { x: -83249.52, y: 32483.49 },
      { x: -121326.7, y: 26923.83 },
      { x: -146474.44, y: -13480.64 },
      { x: -146474.44, y: -29965.67 },
      { x: -134773.31, y: -46450.69 },
      { x: -116478.16, y: -54337.65 },
    ],
  },
  {
    id: 7,
    name: 'abandoned_district',
    nameZh: '石树田无人区',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -146733.03, y: -30482.84 },
      { x: -140850.14, y: -41666.8 },
      { x: -52283.53, y: -153829.63 },
      { x: -173367.66, y: -244982.12 },
      { x: -306152.93, y: -151049.8 },
      { x: -300270.04, y: -89376.41 },
      { x: -308674.17, y: -80713.69 },
      { x: -307381.23, y: 8628.69 },
      { x: -188365.8, y: 20265.18 },
    ],
  },
  {
    id: 8,
    name: 'wishing_woods',
    nameZh: '祈愿树林',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: 53091.34, y: -46192.1 },
      { x: 58651.0, y: -45480.99 },
      { x: 89616.98, y: -48002.23 },
      { x: 135322.53, y: -30741.43 },
      { x: 179476.54, y: -43153.69 },
      { x: 186587.73, y: -167793.41 },
      { x: 74942.08, y: -186605.74 },
      { x: 45204.39, y: -109417.03 },
    ],
  },
  {
    id: 9,
    name: 'firework_isles',
    nameZh: '花焰群岛',
    mapId: 2,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -231645.07, y: 610721.77 },
      { x: -190342.89, y: 596028.51 },
      { x: -186636.02, y: 566951.78 },
      { x: -211840.68, y: 540972.71 },
      { x: -240308.21, y: 539888.52 },
      { x: -267216.58, y: 557204.46 },
      { x: -271852.75, y: 585362.23 },
      { x: -259172.98, y: 608099.08 },
    ],
  },
  {
    id: 10,
    name: 'serenity_island',
    nameZh: '无忧岛',
    mapId: 3,
    minHeight: 0,
    maxHeight: 35000,
    polygon: [
      { x: -57012.82, y: 69452.59 },
      { x: -16636.17, y: 74358.82 },
      { x: 14406.68, y: 21377.56 },
      { x: -21303.07, y: -2196.26 },
      { x: -54679.37, y: 10169.02 },
      { x: -61450.36, y: 39815.79 },
    ],
  },
  {
    id: 11,
    name: 'danqing_island',
    nameZh: '丹青屿',
    mapId: 4,
    minHeight: -20000,
    maxHeight: 0,
    polygon: [
      { x: -259255.97, y: 328276.73 },
      { x: -224232.18, y: 311115.98 },
      { x: -215651.81, y: 252870.23 },
      { x: -276401.44, y: 186410.52 },
      { x: -320723.18, y: 182837.91 },
      { x: -333944.89, y: 221067.89 },
      { x: -317150.57, y: 306474.64 },
    ],
  },
  {
    id: 12,
    name: 'danqing_realm',
    nameZh: '丹青之境',
    mapId: 5,
    minHeight: -20000,
    maxHeight: -10000,
    polygon: [
      { x: -279384.94, y: 307394.6 },
      { x: -243497.55, y: 303128.79 },
      { x: -217917.92, y: 271507.21 },
      { x: -265175.72, y: 189789.01 },
      { x: -347258.25, y: 148208.83 },
      { x: -367145.09, y: 162782.38 },
      { x: -349383.56, y: 249479.88 },
    ],
  },
  {
    id: 13,
    name: 'elderwood_forest',
    nameZh: '巨木之森',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -545929.25, y: -254937.79 },
      { x: -536296.82, y: -250865.01 },
      { x: -523108.8, y: -250089.25 },
      { x: -449475.69, y: -284352.24 },
      { x: -388578.06, y: -261790.38 },
      { x: -305053.93, y: -130815.24 },
      { x: -299946.8, y: -89893.59 },
      { x: -308092.35, y: -81036.92 },
      { x: -557436.44, y: -1003.74 },
      { x: -742327.32, y: -184472.38 },
      { x: -623376.55, y: -310405.05 },
    ],
  },
  {
    id: 14,
    name: 'spira',
    nameZh: '蜗牛城',
    mapId: 1,
    minHeight: -Infinity,
    maxHeight: Infinity,
    polygon: [
      { x: -546187.84, y: -255907.49 },
      { x: -535779.64, y: -250089.25 },
      { x: -522074.45, y: -249830.66 },
      { x: -504555.07, y: -259721.68 },
      { x: -505072.24, y: -285128.01 },
      { x: -558923.33, y: -296764.5 },
    ],
  },
  {
    id: 15,
    name: 'wanxiang_realm',
    nameZh: '万相境',
    mapId: 6,
    minHeight: 0,
    maxHeight: 60000,
    polygon: [
      { x: 33713.85, y: 104184.05 },
      { x: 118859.9, y: 118094.84 },
      { x: 146941.68, y: 109948.52 },
      { x: 142618.32, y: 61490.93 },
      { x: 84573.3, y: 4887.03 },
      { x: 46183.53, y: 2244.98 },
      { x: 5892.28, y: 64853.54 },
      { x: 12617.49, y: 90033.07 },
    ],
  },
]

export class GameMapService {
  /**
   * 将游戏坐标转换为地图像素坐标
   */
  coordToPixel(mapId: number, coord: { x: number; y: number }): PixelPoint {
    const map = GAME_MAPS[mapId]
    if (!map) {
      logger.warn(`Map ${mapId} not found, using default map 1`)
      return this.coordToPixel(1, coord)
    }

    const rp = map.referencePoints
    const x =
      rp.p1.x +
      ((rp.p2.x - rp.p1.x) * (coord.x - rp.c1.x)) / (rp.c2.x - rp.c1.x)
    const y =
      rp.p1.y +
      ((rp.p2.y - rp.p1.y) * (coord.y - rp.c1.y)) / (rp.c2.y - rp.c1.y)

    return { x: Math.round(x), y: Math.round(y) }
  }

  /**
   * 将地图像素坐标转换为游戏坐标
   */
  pixelToCoord(mapId: number, pixel: PixelPoint): { x: number; y: number } {
    const map = GAME_MAPS[mapId]
    if (!map) {
      logger.warn(`Map ${mapId} not found, using default map 1`)
      return this.pixelToCoord(1, pixel)
    }

    const rp = map.referencePoints
    const x =
      rp.c1.x +
      ((rp.c2.x - rp.c1.x) * (pixel.x - rp.p1.x)) / (rp.p2.x - rp.p1.x)
    const y =
      rp.c1.y +
      ((rp.c2.y - rp.c1.y) * (pixel.y - rp.p1.y)) / (rp.p2.y - rp.p1.y)

    return { x: Math.round(x), y: Math.round(y) }
  }

  /**
   * 判断点是否在多边形内（射线法）
   */
  private isPointInPolygon(
    x: number,
    y: number,
    polygon: Array<{ x: number; y: number }>
  ): boolean {
    let windingNumber = 0
    const n = polygon.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y

      if (yi <= y) {
        if (yj > y && this.isLeft(xi, yi, xj, yj, x, y) > 0) {
          windingNumber++
        }
      } else {
        if (yj <= y && this.isLeft(xi, yi, xj, yj, x, y) < 0) {
          windingNumber--
        }
      }
    }
    return windingNumber !== 0
  }

  private isLeft(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number
  ): number {
    return (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1)
  }

  /**
   * 根据游戏坐标判断所属区域
   */
  getRegionByCoordinate(coord: Coordinate): GameRegion[] {
    const matches: GameRegion[] = []

    for (const region of GAME_REGIONS) {
      // 检查高度范围
      if (coord.z < region.minHeight || coord.z > region.maxHeight) {
        continue
      }
      // 检查多边形
      if (this.isPointInPolygon(coord.x, coord.y, region.polygon)) {
        matches.push(region)
      }
    }

    if (matches.length === 0) {
      return [
        {
          id: -1,
          name: 'unknown',
          nameZh: '未知区域',
          mapId: 1,
          minHeight: -Infinity,
          maxHeight: Infinity,
          polygon: [],
        },
      ]
    }

    return matches
  }

  /**
   * 获取区域对应的默认地图ID
   */
  getMapForRegion(regionId: number): number {
    const region = GAME_REGIONS.find((r) => r.id === regionId)
    return region?.mapId || 1
  }

  /**
   * 获取所有地图信息
   */
  getAllMaps(): GameMapInfo[] {
    return Object.values(GAME_MAPS)
  }

  /**
   * 获取所有区域
   */
  getAllRegions(): GameRegion[] {
    return GAME_REGIONS
  }

  /**
   * 获取指定地图的所有区域
   */
  getRegionsByMap(mapId: number): GameRegion[] {
    return GAME_REGIONS.filter((r) => r.mapId === mapId)
  }
}

export default new GameMapService()
