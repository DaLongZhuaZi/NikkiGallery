import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { AIEngine } from './engine/AIEngine'
import logger from './utils/logger'

dotenv.config()

const app = express()
const port = process.env.AI_SERVICE_PORT || 15000

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// AI引擎实例
let aiEngine: AIEngine | null = null

// 初始化AI引擎
async function initAIEngine() {
  try {
    aiEngine = new AIEngine()
    await aiEngine.initialize()
    logger.info('AI Engine initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize AI Engine:', error)
  }
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engineReady: aiEngine?.isReady || false,
    timestamp: new Date().toISOString(),
  })
})

// GPU信息
app.get('/gpu-info', (req, res) => {
  if (!aiEngine) {
    return res.status(503).json({ error: 'AI Engine not ready' })
  }
  res.json(aiEngine.getGPUInfo())
})

// 图像分类
app.post('/classify', async (req, res) => {
  try {
    if (!aiEngine) {
      return res.status(503).json({ error: 'AI Engine not initialized' })
    }
    if (!aiEngine.isReady) {
      return res.status(503).json({ error: 'AI Engine not ready', device: aiEngine.getDeviceInfo() })
    }

    const { imagePath } = req.body
    if (!imagePath) {
      return res.status(400).json({ error: 'imagePath is required' })
    }

    const results = await aiEngine.classify(imagePath)
    res.json({ success: true, data: results })
  } catch (error: any) {
    logger.error('Classification error:', error)
    res.status(500).json({ error: error.message, device: aiEngine?.getDeviceInfo() })
  }
})

// 目标检测
app.post('/detect', async (req, res) => {
  try {
    if (!aiEngine || !aiEngine.isReady) {
      return res.status(503).json({ error: 'AI Engine not ready' })
    }

    const { imagePath } = req.body
    if (!imagePath) {
      return res.status(400).json({ error: 'imagePath is required' })
    }

    const results = await aiEngine.detect(imagePath)
    res.json({ success: true, data: results })
  } catch (error: any) {
    logger.error('Detection error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 特征提取
app.post('/extract-features', async (req, res) => {
  try {
    if (!aiEngine || !aiEngine.isReady) {
      return res.status(503).json({ error: 'AI Engine not ready' })
    }

    const { imagePath } = req.body
    if (!imagePath) {
      return res.status(400).json({ error: 'imagePath is required' })
    }

    const features = await aiEngine.extractFeatures(imagePath)
    res.json({ success: true, data: features })
  } catch (error: any) {
    logger.error('Feature extraction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 相似度计算
app.post('/similarity', async (req, res) => {
  try {
    if (!aiEngine || !aiEngine.isReady) {
      return res.status(503).json({ error: 'AI Engine not ready' })
    }

    const { features1, features2 } = req.body
    if (!features1 || !features2) {
      return res.status(400).json({ error: 'features1 and features2 are required' })
    }

    const similarity = aiEngine.calculateSimilarity(features1, features2)
    res.json({ success: true, data: { similarity } })
  } catch (error: any) {
    logger.error('Similarity calculation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 获取模型信息
app.get('/models', (req, res) => {
  if (!aiEngine) {
    return res.status(503).json({ error: 'AI Engine not ready' })
  }
  res.json(aiEngine.getModelInfo())
})

// 获取设备信息
app.get('/device-info', (req, res) => {
  if (!aiEngine) {
    return res.status(503).json({ error: 'AI Engine not ready' })
  }
  res.json(aiEngine.getDeviceInfo())
})

// 切换设备 (cpu / cuda / dml / auto)
app.post('/set-device', async (req, res) => {
  try {
    if (!aiEngine) {
      return res.status(503).json({ error: 'AI Engine not ready' })
    }

    const { device } = req.body
    if (!device || !['cpu', 'cuda', 'dml', 'auto'].includes(device)) {
      return res.status(400).json({ error: 'Invalid device. Must be: cpu, cuda, dml, or auto' })
    }

    const result = await aiEngine.setDevice(device)
    res.json({
      success: result.success,
      actualDevice: result.actualDevice,
      message: result.message,
      device: aiEngine.getDeviceInfo(),
    })
  } catch (error: any) {
    logger.error('Set device error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 启动服务
app.listen(port, async () => {
  logger.info(`AI Service running on port ${port}`)
  await initAIEngine()
})

export default app