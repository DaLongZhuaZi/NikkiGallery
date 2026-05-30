import { Router, Request, Response } from 'express'
import { pluginService } from '../services/PluginService'

const router = Router()

// 获取所有插件
router.get('/', (req: Request, res: Response) => {
  try {
    const plugins = pluginService.getAllPlugins()
    res.json(plugins)
  } catch (error) {
    console.error('获取插件列表失败:', error)
    res.status(500).json({ error: '获取插件列表失败' })
  }
})

// 获取已启用的插件
router.get('/enabled', (req: Request, res: Response) => {
  try {
    const plugins = pluginService.getEnabledPlugins()
    res.json(plugins)
  } catch (error) {
    console.error('获取已启用插件失败:', error)
    res.status(500).json({ error: '获取已启用插件失败' })
  }
})

// 获取单个插件
router.get('/:uuid', (req: Request, res: Response) => {
  try {
    const { uuid } = req.params
    const plugin = pluginService.getPlugin(uuid)

    if (!plugin) {
      return res.status(404).json({ error: '插件不存在' })
    }

    res.json(plugin)
  } catch (error) {
    console.error('获取插件信息失败:', error)
    res.status(500).json({ error: '获取插件信息失败' })
  }
})

// 安装插件
router.post('/install', async (req: Request, res: Response) => {
  try {
    const { manifestPath } = req.body
    if (!manifestPath) {
      return res.status(400).json({ error: '缺少插件清单路径' })
    }

    const result = await pluginService.installPlugin(manifestPath)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result.plugin)
  } catch (error) {
    console.error('安装插件失败:', error)
    res.status(500).json({ error: '安装插件失败' })
  }
})

// 卸载插件
router.delete('/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params
    const result = await pluginService.uninstallPlugin(uuid)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('卸载插件失败:', error)
    res.status(500).json({ error: '卸载插件失败' })
  }
})

// 启用/禁用插件
router.post('/:uuid/toggle', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 参数必须是布尔值' })
    }

    const result = await pluginService.togglePlugin(uuid, enabled)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('切换插件状态失败:', error)
    res.status(500).json({ error: '切换插件状态失败' })
  }
})

// 更新插件配置
router.put('/:uuid/config', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params
    const { config } = req.body

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: '缺少配置参数' })
    }

    const result = await pluginService.updatePluginConfig(uuid, config)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新插件配置失败:', error)
    res.status(500).json({ error: '更新插件配置失败' })
  }
})

export default router
