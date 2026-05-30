import { Router, Request, Response } from 'express'
import { nikkiasService, NikkiasType, LauncherChannel } from '../services/NikkiasService'

const router = Router()

// POST /api/nikkias/create - 创建归档
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { type, launcherChannel, uid, albumType, sourceDir, outputPath, extractContentOnly } = req.body

    if (!sourceDir || !outputPath) {
      return res.status(400).json({ success: false, error: '缺少必要参数: sourceDir, outputPath' })
    }

    if (!type || !Object.values(NikkiasType).includes(type)) {
      return res.status(400).json({ success: false, error: `无效的归档类型，支持: ${Object.values(NikkiasType).join(', ')}` })
    }

    const result = await nikkiasService.createArchive({
      type: type as NikkiasType,
      launcherChannel: launcherChannel as LauncherChannel,
      uid,
      albumType,
      sourceDir,
      outputPath
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建归档失败' })
  }
})

// POST /api/nikkias/extract - 解压归档
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { nikkiasFilePath, outputDir, extractContentOnly } = req.body

    if (!nikkiasFilePath || !outputDir) {
      return res.status(400).json({ success: false, error: '缺少必要参数: nikkiasFilePath, outputDir' })
    }

    const result = await nikkiasService.extractArchive({
      nikkiasFilePath,
      outputDir,
      extractContentOnly: extractContentOnly !== false // 默认为 true
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '解压归档失败' })
  }
})

// POST /api/nikkias/manifest - 读取归档的 manifest
router.post('/manifest', async (req: Request, res: Response) => {
  try {
    const { nikkiasFilePath } = req.body

    if (!nikkiasFilePath) {
      return res.status(400).json({ success: false, error: '缺少必要参数: nikkiasFilePath' })
    }

    const result = await nikkiasService.readManifest(nikkiasFilePath)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '读取manifest失败' })
  }
})

// POST /api/nikkias/validate - 验证归档文件
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { nikkiasFilePath } = req.body

    if (!nikkiasFilePath) {
      return res.status(400).json({ success: false, error: '缺少必要参数: nikkiasFilePath' })
    }

    const result = await nikkiasService.validateArchive(nikkiasFilePath)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '验证归档失败' })
  }
})

// POST /api/nikkias/info - 获取归档信息
router.post('/info', async (req: Request, res: Response) => {
  try {
    const { nikkiasFilePath } = req.body

    if (!nikkiasFilePath) {
      return res.status(400).json({ success: false, error: '缺少必要参数: nikkiasFilePath' })
    }

    const result = await nikkiasService.getArchiveInfo(nikkiasFilePath)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取归档信息失败' })
  }
})

export default router
