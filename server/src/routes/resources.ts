import { Router, Request, Response } from 'express'
import { resourceService, ResourceType } from '../services/ResourceService'
import { configService } from '../services/ConfigService'

const router = Router()

// 获取所有资源类型信息
router.get('/types', (req: Request, res: Response) => {
  try {
    const types = resourceService.getAllResourceInfo()
    res.json(types)
  } catch (error) {
    console.error('获取资源类型信息失败:', error)
    res.status(500).json({ error: '获取资源类型信息失败' })
  }
})

// 获取指定类型资源信息
router.get('/types/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    if (!Object.values(ResourceType).includes(type as ResourceType)) {
      return res.status(400).json({ error: '无效的资源类型' })
    }
    const info = resourceService.getResourceInfo(type as ResourceType)
    res.json(info)
  } catch (error) {
    console.error('获取资源信息失败:', error)
    res.status(500).json({ error: '获取资源信息失败' })
  }
})

// 检查资源路径是否存在
router.get('/check/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    if (!Object.values(ResourceType).includes(type as ResourceType)) {
      return res.status(400).json({ error: '无效的资源类型' })
    }

    const config = configService.getAll()
    const exists = resourceService.checkResourcePath(
      type as ResourceType,
      config.gamePath
    )

    res.json({
      type,
      exists,
      path: resourceService.getResourcePath(type as ResourceType, config.gamePath)
    })
  } catch (error) {
    console.error('检查资源路径失败:', error)
    res.status(500).json({ error: '检查资源路径失败' })
  }
})

// 扫描资源文件
router.get('/scan/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    if (!Object.values(ResourceType).includes(type as ResourceType)) {
      return res.status(400).json({ error: '无效的资源类型' })
    }

    const config = configService.getAll()
    const result = await resourceService.scanResources(
      type as ResourceType,
      config.gamePath
    )

    res.json(result)
  } catch (error) {
    console.error('扫描资源文件失败:', error)
    res.status(500).json({ error: '扫描资源文件失败' })
  }
})

// 获取资源文件内容（用于预览）
router.get('/file', (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.query
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: '缺少文件路径参数' })
    }

    // 安全检查：确保路径在允许的目录内
    const config = configService.getAll()
    const allowedPaths = [
      resourceService.getResourcePath(ResourceType.LauncherCacheImages),
      resourceService.getResourcePath(ResourceType.MallPic, config.gamePath),
      resourceService.getResourcePath(ResourceType.Movies, config.gamePath)
    ].filter(Boolean) as string[]

    const isAllowed = allowedPaths.some(allowedPath =>
      filePath.startsWith(allowedPath)
    )

    if (!isAllowed) {
      return res.status(403).json({ error: '不允许访问该路径' })
    }

    const fs = require('fs')
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }

    res.sendFile(filePath)
  } catch (error) {
    console.error('获取资源文件失败:', error)
    res.status(500).json({ error: '获取资源文件失败' })
  }
})

export default router
