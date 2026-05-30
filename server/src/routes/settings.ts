import { Router, Request, Response } from 'express'
import configService from '../services/ConfigService'
import gamePathService from '../services/GamePathService'
import logger from '../utils/logger'

const router = Router()

/**
 * GET /api/settings
 * 获取完整配置
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const config = configService.getAll()
    res.json({
      success: true,
      data: config,
    })
  } catch (error) {
    logger.error('Failed to get config:', error)
    res.status(500).json({
      success: false,
      message: '获取配置失败',
    })
  }
})

/**
 * PUT /api/settings
 * 更新配置（部分更新）
 */
router.put('/', (req: Request, res: Response) => {
  try {
    const updates = req.body
    const config = configService.update(updates)
    res.json({
      success: true,
      data: config,
      message: '配置已保存',
    })
  } catch (error) {
    logger.error('Failed to update config:', error)
    res.status(500).json({
      success: false,
      message: '保存配置失败',
    })
  }
})

/**
 * POST /api/settings/reset
 * 重置为默认配置
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const config = configService.reset()
    res.json({
      success: true,
      data: config,
      message: '配置已重置',
    })
  } catch (error) {
    logger.error('Failed to reset config:', error)
    res.status(500).json({
      success: false,
      message: '重置配置失败',
    })
  }
})

/**
 * GET /api/settings/raw
 * 获取原始JSON内容（供用户手动编辑参考）
 */
router.get('/raw', (req: Request, res: Response) => {
  try {
    const json = configService.getRawJson()
    const configPath = configService.getConfigPath()
    res.json({
      success: true,
      data: {
        path: configPath,
        content: json,
      },
    })
  } catch (error) {
    logger.error('Failed to get raw config:', error)
    res.status(500).json({
      success: false,
      message: '获取配置失败',
    })
  }
})

/**
 * POST /api/settings/import
 * 从JSON字符串导入配置
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { json } = req.body
    if (!json) {
      return res.status(400).json({
        success: false,
        message: '请提供JSON配置内容',
      })
    }

    const config = configService.importFromJson(json)
    res.json({
      success: true,
      data: config,
      message: '配置已导入',
    })
  } catch (error) {
    logger.error('Failed to import config:', error)
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '导入配置失败',
    })
  }
})

/**
 * GET /api/settings/detect-game-path
 * 自动检测游戏路径
 */
router.get('/detect-game-path', async (req: Request, res: Response) => {
  try {
    const gamePathInfo = await gamePathService.getGamePathInfo()

    if (!gamePathInfo) {
      return res.json({
        success: false,
        message: '未检测到游戏安装路径',
        data: null,
      })
    }

    res.json({
      success: true,
      data: gamePathInfo,
    })
  } catch (error) {
    logger.error('Error detecting game path:', error)
    res.status(500).json({
      success: false,
      message: '检测游戏路径时出错',
    })
  }
})

/**
 * GET /api/settings/screenshot-folders
 * 获取指定路径的截图文件夹
 */
router.get('/screenshot-folders', async (req: Request, res: Response) => {
  try {
    const gamePath = req.query.path as string

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        message: '请提供游戏路径',
      })
    }

    const folders = await gamePathService.findScreenshotFolders(gamePath)

    res.json({
      success: true,
      data: folders,
    })
  } catch (error) {
    logger.error('Error finding screenshot folders:', error)
    res.status(500).json({
      success: false,
      message: '查找截图文件夹时出错',
    })
  }
})

/**
 * POST /api/settings/save-game-path
 * 保存游戏路径和截图文件夹选择
 */
router.post('/save-game-path', async (req: Request, res: Response) => {
  try {
    const { gamePath, screenshotFolders } = req.body

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        message: '请提供游戏路径',
      })
    }

    const config = configService.update({
      gamePath,
      screenshotFolders: screenshotFolders || [],
    })

    res.json({
      success: true,
      data: config,
      message: '游戏路径已保存',
    })
  } catch (error) {
    logger.error('Failed to save game path:', error)
    res.status(500).json({
      success: false,
      message: '保存游戏路径失败',
    })
  }
})

/**
 * GET /api/settings/launch-options
 * 获取当前游戏路径的所有可用启动选项
 */
router.get('/launch-options', async (req: Request, res: Response) => {
  try {
    const config = configService.getAll()
    const gamePath = config.gamePath

    if (!gamePath) {
      return res.json({
        success: false,
        message: '请先配置游戏路径',
        data: [],
      })
    }

    const launchOptions = await gamePathService.findLaunchOptions(gamePath)

    res.json({
      success: true,
      data: launchOptions,
    })
  } catch (error) {
    logger.error('Error getting launch options:', error)
    res.status(500).json({
      success: false,
      message: '获取启动选项时出错',
    })
  }
})

/**
 * POST /api/settings/launch-game
 * 启动游戏
 */
router.post('/launch-game', async (req: Request, res: Response) => {
  try {
    const { launchOption, args } = req.body

    if (!launchOption) {
      return res.status(400).json({
        success: false,
        message: '请提供启动选项',
      })
    }

    const success = await gamePathService.launchGame(launchOption)

    if (success) {
      res.json({
        success: true,
        message: '游戏已启动',
      })
    } else {
      res.status(400).json({
        success: false,
        message: '启动游戏失败',
      })
    }
  } catch (error) {
    logger.error('Error launching game:', error)
    res.status(500).json({
      success: false,
      message: '启动游戏时出错',
    })
  }
})

/**
 * POST /api/settings/validate-game-path
 * 验证游戏路径是否有效
 */
router.post('/validate-game-path', async (req: Request, res: Response) => {
  try {
    const { gamePath } = req.body

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        message: '请提供游戏路径',
      })
    }

    const validation = await gamePathService.validateGamePath(gamePath)

    res.json({
      success: true,
      data: validation,
    })
  } catch (error) {
    logger.error('Error validating game path:', error)
    res.status(500).json({
      success: false,
      message: '验证游戏路径时出错',
    })
  }
})

export default router
