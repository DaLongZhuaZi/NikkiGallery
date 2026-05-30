import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import aiService from '../services/AIService'
import { ImageService } from '../services/ImageService'
import { AppError } from '../middleware/errorHandler'
import taskService from '../services/TaskService'
import config from '../config'
import logger from '../utils/logger'

const router = Router()

// AI 微服务地址
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:15000'

/**
 * 调用 AI 微服务的通用方法
 */
async function callAIService(endpoint: string, body?: any, method: string = 'POST'): Promise<any> {
  const url = `${AI_SERVICE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI service error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * 检查 AI 微服务是否可用
 */
async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const result = await callAIService('/health', undefined, 'GET')
    return result.status === 'ok'
  } catch {
    return false
  }
}

/**
 * 根据 imageId 获取图片文件路径
 */
async function getImagePath(imageId: string): Promise<string> {
  const image = await ImageService.getImageById(imageId)
  if (!image) {
    throw AppError.notFound(`Image not found: ${imageId}`)
  }
  if (!fs.existsSync(image.path)) {
    throw AppError.notFound(`Image file not found on disk: ${image.path}`)
  }
  return image.path
}

// ============ GPU 和状态相关 ============

// 获取GPU信息 - 始终使用本地检测（AI服务的GPU检测不可靠）
router.get('/gpu-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gpuInfo = await aiService.detectGPU()
    res.json({ success: true, data: gpuInfo })
  } catch (error) {
    next(error)
  }
})

// 获取AI状态
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gpuInfo = await aiService.detectGPU()
    const downloadedModels = await aiService.getDownloadedModels()

    // 检查 AI 微服务状态
    const isHealthy = await checkAIServiceHealth()
    let engineReady = false
    let modelInfo = null

    if (isHealthy) {
      try {
        const health = await callAIService('/health', undefined, 'GET')
        engineReady = health.engineReady || false
        modelInfo = await callAIService('/models', undefined, 'GET')
      } catch (e) {
        logger.warn('Failed to get AI service details:', e)
      }
    }

    res.json({
      success: true,
      data: {
        status: isHealthy ? (engineReady ? 'ready' : 'initializing') : 'offline',
        aiServiceConnected: isHealthy,
        engineReady,
        gpu: gpuInfo,
        models: downloadedModels,
        modelInfo,
        recommendedModels: aiService.getRecommendedModels(),
      },
    })
  } catch (error) {
    next(error)
  }
})

// 获取设备信息 (CPU/GPU)
router.get('/device-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isHealthy = await checkAIServiceHealth()
    if (!isHealthy) {
      return res.json({
        success: true,
        data: {
          device: 'cpu',
          providers: ['cpu'],
          currentProvider: 'cpu',
          aiServiceOffline: true,
        },
      })
    }

    const deviceInfo = await callAIService('/device-info', undefined, 'GET')
    res.json({ success: true, data: deviceInfo })
  } catch (error) {
    next(error)
  }
})

// 切换设备 (CPU/GPU)
router.post('/set-device', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { device } = req.body
    if (!device || !['cpu', 'cuda', 'dml', 'auto'].includes(device)) {
      throw AppError.badRequest('Invalid device. Must be: cpu, cuda, dml, or auto')
    }

    const result = await callAIService('/set-device', { device })
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

// 获取推荐模型列表
router.get('/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = aiService.getRecommendedModels()
    const downloadedModels = await aiService.getDownloadedModels()

    // 检查 AI 微服务的模型状态
    let aiServiceModels = null
    const isHealthy = await checkAIServiceHealth()
    if (isHealthy) {
      try {
        aiServiceModels = await callAIService('/models', undefined, 'GET')
      } catch (e) {
        // ignore
      }
    }

    const modelsWithStatus = models.map(model => ({
      ...model,
      downloaded: downloadedModels.includes(model.id) || downloadedModels.some(d => model.downloadUrl?.includes(d)),
      loadedInEngine: aiServiceModels ? Object.values(aiServiceModels).some((m: any) => m.loaded) : false,
    }))

    res.json({ success: true, data: modelsWithStatus })
  } catch (error) {
    next(error)
  }
})

// 同步AI标签到数据库
router.post('/sync-tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const syncedCount = await aiService.syncAITags()
    res.json({
      success: true,
      data: {
        syncedCount,
        message: syncedCount > 0 ? `成功同步 ${syncedCount} 个标签` : '标签已是最新状态',
      },
    })
  } catch (error) {
    next(error)
  }
})

// ============ AI 推理功能（调用 ai-service）============

// 图像分类
router.post('/classify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.body

    if (!imageId) {
      throw AppError.badRequest('imageId is required')
    }

    const imagePath = await getImagePath(imageId)

    // 调用 AI 微服务
    const result = await callAIService('/classify', { imagePath })

    // 转换为前端期望的格式
    const classifications = (result.data || result).map((item: any) => ({
      label: item.tagId || item.label,
      labelZh: item.tagNameZh || item.labelZh || item.label,
      labelEn: item.tagNameEn || item.labelEn || item.label,
      confidence: item.confidence,
      category: item.category || 'unknown',
    }))

    res.json({ success: true, data: classifications })
  } catch (error: any) {
    if (error.message?.includes('AI service error')) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Please ensure the AI service is running.',
        details: error.message,
      })
    }
    next(error)
  }
})

// 目标检测
router.post('/detect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.body

    if (!imageId) {
      throw AppError.badRequest('imageId is required')
    }

    const imagePath = await getImagePath(imageId)

    // 调用 AI 微服务
    const result = await callAIService('/detect', { imagePath })

    // 转换为前端期望的格式
    const detections = (result.data || result).map((item: any) => ({
      bbox: item.bbox,
      label: item.class || item.label,
      labelZh: item.classZh || item.labelZh || item.label,
      labelEn: item.classEn || item.labelEn || item.label,
      confidence: item.confidence,
    }))

    res.json({ success: true, data: detections })
  } catch (error: any) {
    if (error.message?.includes('AI service error')) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Please ensure the AI service is running.',
        details: error.message,
      })
    }
    next(error)
  }
})

// 提取特征向量
router.post('/extract-features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.body

    if (!imageId) {
      throw AppError.badRequest('imageId is required')
    }

    const imagePath = await getImagePath(imageId)

    // 调用 AI 微服务
    const result = await callAIService('/extract-features', { imagePath })

    const features = result.data?.features || result.features || result.data || result

    res.json({ success: true, data: { features } })
  } catch (error: any) {
    if (error.message?.includes('AI service error')) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Please ensure the AI service is running.',
        details: error.message,
      })
    }
    next(error)
  }
})

// 相似图片搜索
router.post('/search-similar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.body

    if (!imageId) {
      throw AppError.badRequest('imageId is required')
    }

    const imagePath = await getImagePath(imageId)

    // 第一步：提取当前图片的特征
    const featureResult = await callAIService('/extract-features', { imagePath })
    const queryFeatures = featureResult.data?.features || featureResult.features || featureResult.data || featureResult

    // 第二步：获取所有图片，逐个计算相似度
    const allImages = await ImageService.getImages({ page_size: 10000 })
    const similarities: Array<{ imageId: string; similarity: number }> = []

    for (const img of allImages.images) {
      if (img.id === imageId) continue
      if (!img.path || !fs.existsSync(img.path)) continue

      try {
        const imgFeatureResult = await callAIService('/extract-features', { imagePath: img.path })
        const imgFeatures = imgFeatureResult.data?.features || imgFeatureResult.features || imgFeatureResult.data || imgFeatureResult

        const simResult = await callAIService('/similarity', {
          features1: queryFeatures,
          features2: imgFeatures,
        })
        const similarity = simResult.data?.similarity ?? simResult.similarity ?? 0

        if (similarity > 0.7) {
          similarities.push({ imageId: img.id, similarity })
        }
      } catch (e) {
        // 跳过无法处理的图片
        continue
      }
    }

    // 按相似度排序，返回前10个
    similarities.sort((a, b) => b.similarity - a.similarity)
    const topResults = similarities.slice(0, 10)

    res.json({ success: true, data: topResults })
  } catch (error: any) {
    if (error.message?.includes('AI service error')) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Please ensure the AI service is running.',
        details: error.message,
      })
    }
    next(error)
  }
})

// ============ 批量处理 ============

import ImageModel from '../models/Image'
import { MetadataService } from '../services/MetadataService'

// 批量处理图片
router.post('/batch-process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageIds, targetScope, albumId, tasks } = req.body

    let idsToProcess: string[] = []

    if (targetScope === 'unprocessed') {
      const images = ImageModel.findUnprocessed(10000)
      idsToProcess = images.map(img => img.id)
    } else if (targetScope === 'reprocess') {
      // 重新处理所有已AI处理过的图片
      const { images } = ImageModel.findAll({ ai_processed: true, page_size: 10000 })
      idsToProcess = images.map(img => img.id)
    } else if (targetScope === 'album' && albumId) {
      const { images } = ImageModel.findAll({ album_id: albumId, ai_processed: false, page_size: 10000 })
      idsToProcess = images.map(img => img.id)
    } else if (imageIds && Array.isArray(imageIds)) {
      idsToProcess = imageIds
    }

    if (idsToProcess.length === 0) {
      return res.json({
        success: true,
        data: { message: '没有找到需要处理的图片' }
      })
    }

    const aiTasks = tasks || ['classify', 'detect']

    // 检查 AI 微服务状态
    const isHealthy = await checkAIServiceHealth()
    if (!isHealthy && (aiTasks.includes('classify') || aiTasks.includes('detect') || aiTasks.includes('feature'))) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not running. Please start the AI service first.',
      })
    }

    // 创建后台任务
    const task = taskService.createTaskWithExecutor(
      {
        name: `批量AI处理 (${idsToProcess.length}张)`,
        type: 'ai_process',
        totalItems: idsToProcess.length,
        metadata: { aiTasks },
      },
      async (task, onProgress) => {
        // 先同步标签
        await aiService.syncAITags()

        let processed = 0
        let failed = 0

        for (let i = 0; i < idsToProcess.length; i++) {
          const imageId = idsToProcess[i]
          
          if (task.status === 'cancelled') {
            throw new Error('任务已取消')
          }

          onProgress(
            Math.round((i / idsToProcess.length) * 100),
            `正在处理第 ${i + 1}/${idsToProcess.length} 张图片...`,
            processed,
            failed
          )

          try {
            const imagePath = await getImagePath(imageId)
            let classifications: any[] = []

            if (aiTasks.includes('classify')) {
              const classifyResult = await callAIService('/classify', { imagePath })
              classifications = (classifyResult.data || classifyResult).map((item: any) => ({
                tagId: item.tagId || item.label,
                confidence: item.confidence,
              }))
            }

            if (aiTasks.includes('detect')) {
              try {
                await callAIService('/detect', { imagePath })
              } catch (e) {
                logger.warn('Detection failed in batch, skipping:', e)
              }
            }
            
            if (aiTasks.includes('feature')) {
              try {
                await callAIService('/extract-features', { imagePath })
              } catch (e) {
                logger.warn('Feature extraction failed in batch, skipping:', e)
              }
            }

            if (aiTasks.includes('metadata')) {
              await MetadataService.extractAndSaveMetadata(imageId)
            }

            // 保存 AI 处理结果
            if (classifications.length > 0 || aiTasks.includes('classify') || aiTasks.includes('detect')) {
              await ImageService.updateAIResult(imageId, classifications)
            }

            processed++
          } catch (error) {
            failed++
            logger.error(`Failed to AI process image ${imageId}:`, error)
          }
        }

        onProgress(100, `处理完成: 成功 ${processed}, 失败 ${failed}`, processed, failed)
        return { processed, failed }
      }
    )

    res.json({
      success: true,
      data: {
        taskId: task.id,
        processed: 0,
        total: idsToProcess.length,
        message: `批量处理已启动，共 ${idsToProcess.length} 张图片，可通过任务面板查看进度`,
      },
    })
  } catch (error) {
    next(error)
  }
})

// 处理单张图片
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageId } = req.body

    if (!imageId) {
      throw AppError.badRequest('imageId is required')
    }

    const imagePath = await getImagePath(imageId)

    // 检查 AI 微服务状态
    const isHealthy = await checkAIServiceHealth()
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not running. Please start the AI service first.',
      })
    }

    // 确保标签已同步（只在第一次调用时同步）
    await aiService.syncAITags()

    // 调用分类
    const classifyResult = await callAIService('/classify', { imagePath })
    const classifications = (classifyResult.data || classifyResult).map((item: any) => ({
      tagId: item.tagId || item.label,
      tagNameZh: item.tagNameZh || item.tagName || '',
      tagNameEn: item.tagNameEn || '',
      confidence: item.confidence,
      category: item.category || '',
    }))

    // 调用检测
    let detections: any[] = []
    try {
      const detectResult = await callAIService('/detect', { imagePath })
      detections = (detectResult.data || detectResult).map((item: any) => ({
        label: item.class || item.label,
        labelZh: item.labelZh || item.label || '',
        confidence: item.confidence,
        bbox: item.bbox,
      }))
    } catch (e) {
      logger.warn('Detection failed, skipping:', e)
    }

    // 保存 AI 处理结果
    await ImageService.updateAIResult(imageId, classifications)

    res.json({
      success: true,
      data: {
        imageId,
        classifications,
        detections,
        message: '图片AI处理完成',
      },
    })
  } catch (error: any) {
    if (error.message?.includes('AI service error')) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Please ensure the AI service is running.',
        details: error.message,
      })
    }
    next(error)
  }
})

// ============ 模型管理 ============

// 活跃下载的 AbortController 映射（用于取消下载）
const activeDownloads = new Map<string, AbortController>()

// 下载模型（流式下载 + 镜像回退 + 后台任务进度追踪）
router.post('/download-model', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelId, downloadUrl } = req.body

    if (!modelId || !downloadUrl) {
      throw AppError.badRequest('modelId and downloadUrl are required')
    }

    const modelsDir = config.ai.modelsPath
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true })
    }

    const filename = `${modelId}.onnx`
    const filePath = path.join(modelsDir, filename)

    // 获取所有可用的下载URL（主URL + 镜像）
    const allUrls = aiService.getModelDownloadUrls(modelId)
    // 如果 getModelDownloadUrls 没有返回结果（自定义URL），使用原始URL
    const urlsToTry = allUrls.length > 0 ? allUrls : [downloadUrl]

    // 创建后台任务用于进度追踪
    const task = taskService.createTaskWithExecutor(
      {
        name: `下载模型: ${modelId}`,
        type: 'custom',
        metadata: { modelId, downloadUrl, filename, urlsToTry },
      },
      async (task, onProgress) => {
        const { modelId: mId, filename: fname, urlsToTry: urls } = task.metadata
        const fPath = path.join(modelsDir, fname)

        // 创建 AbortController 用于取消下载
        const abortController = new AbortController()
        activeDownloads.set(task.id, abortController)

        // 检查是否已被取消
        const checkCancelled = () => {
          if (abortController.signal.aborted || task.status === 'cancelled') {
            throw new Error('下载已取消')
          }
        }

        try {
          // 依次尝试每个URL（镜像优先）
          let fetchResponse: any = null
          let usedUrl = ''

          for (let i = 0; i < urls.length; i++) {
            const url = urls[i]
            const source = url.includes('hf-mirror') ? 'HuggingFace镜像' :
                          url.includes('ghfast') ? 'GitHub加速' :
                          url.includes('huggingface.co') ? 'HuggingFace' :
                          url.includes('github.com') ? 'GitHub' : '直连'

            checkCancelled()
            onProgress(0, `正在连接 ${source}... (${i + 1}/${urls.length})`)

            try {
              fetchResponse = await fetch(url, {
                signal: abortController.signal,
                headers: {
                  'User-Agent': 'NikkiGallery/1.0',
                  'Accept': 'application/octet-stream',
                },
              })

              if (fetchResponse.ok && fetchResponse.body) {
                usedUrl = url
                logger.info(`Model download using: ${source} (${url.substring(0, 80)}...)`)
                break
              }

              logger.warn(`Download source ${source} returned ${fetchResponse.status}, trying next...`)
              fetchResponse = null
            } catch (fetchErr: any) {
              if (fetchErr.name === 'AbortError') {
                throw new Error('下载已取消')
              }
              logger.warn(`Download source ${source} failed: ${fetchErr.message}, trying next...`)
              fetchResponse = null
            }
          }

          if (!fetchResponse || !fetchResponse.body) {
            throw new Error('所有下载源均不可用，请检查网络连接后重试')
          }

          checkCancelled()

          const contentLength = parseInt(fetchResponse.headers.get('content-length') || '0', 10)
          let downloadedBytes = 0
          let lastReportTime = 0
          const startTime = Date.now()

          onProgress(2, `文件大小: ${contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(1) + ' MB' : '未知'}`, 0)

          const fileStream = fs.createWriteStream(fPath)
          const { Transform } = require('stream')

          const progressStream = new Transform({
            transform(chunk: Buffer, encoding: string, callback: Function) {
              try {
                checkCancelled()
              } catch (e) {
                callback(e)
                return
              }

              downloadedBytes += chunk.length
              this.push(chunk)

              const now = Date.now()
              if (now - lastReportTime > 500) {
                lastReportTime = now
                const elapsed = (now - startTime) / 1000
                const percent = contentLength > 0 ? Math.min(95, Math.round((downloadedBytes / contentLength) * 100)) : 0
                const speedMBps = elapsed > 0 ? downloadedBytes / elapsed / 1024 / 1024 : 0
                const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1)
                const totalMB = contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(1) : '?'
                onProgress(
                  percent,
                  `下载中: ${downloadedMB}/${totalMB} MB (${speedMBps.toFixed(1)} MB/s)`,
                  downloadedBytes
                )
              }
              callback()
            }
          })

          const nodeStream = Readable.fromWeb(fetchResponse.body as any)
          await require('stream').promises.pipeline(nodeStream, progressStream, fileStream)

          checkCancelled()

          onProgress(98, '下载完成，正在验证文件...')
          const stat = fs.statSync(fPath)
          logger.info(`Model ${mId} downloaded to ${fPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)

          return {
            modelId: mId,
            filename: fname,
            path: fPath,
            size: stat.size,
          }
        } finally {
          activeDownloads.delete(task.id)
        }
      }
    )

    // 立即返回任务ID，前端通过SSE监听进度
    res.json({
      success: true,
      data: {
        taskId: task.id,
        modelId,
        filename,
        message: '模型下载已开始，请通过任务面板查看进度',
      },
    })
  } catch (error: any) {
    logger.error('Model download failed:', error)
    res.status(500).json({
      success: false,
      error: `模型下载失败: ${error.message}`,
    })
  }
})

// 取消模型下载
router.post('/cancel-download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.body

    if (!taskId) {
      throw AppError.badRequest('taskId is required')
    }

    // 中止 HTTP 请求
    const abortController = activeDownloads.get(taskId)
    if (abortController) {
      abortController.abort()
      activeDownloads.delete(taskId)
    }

    // 取消任务
    const cancelled = taskService.cancelTask(taskId)

    res.json({
      success: true,
      data: { cancelled, message: cancelled ? '下载已取消' : '任务不存在或已完成' },
    })
  } catch (error) {
    next(error)
  }
})

export default router
