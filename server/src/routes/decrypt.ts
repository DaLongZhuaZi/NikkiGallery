import { Router, Request, Response } from 'express'
import { ImageDecryptService } from '../services/ImageDecryptService'
import configService from '../services/ConfigService'
import ImageModel from '../models/Image'
import logger from '../utils/logger'

const router = Router()

/**
 * GET /api/decrypt/check/:id
 * 检查图片是否包含加密数据
 */
router.get('/check/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const image = ImageModel.findById(id)

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      })
    }

    const hasEncrypted = ImageDecryptService.hasEncryptedData(image.path)

    res.json({
      success: true,
      data: {
        imageId: id,
        hasEncryptedData: hasEncrypted,
        filename: image.filename,
      },
    })
  } catch (error) {
    logger.error('Failed to check encrypted data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check encrypted data',
    })
  }
})

/**
 * POST /api/decrypt/image/:id
 * 解密单张图片
 */
router.post('/image/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { uid } = req.body

    const image = ImageModel.findById(id)
    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      })
    }

    // 如果没有提供UID，尝试自动查找
    let userUid = uid
    if (!userUid) {
      const config = configService.getAll()
      if (config.gamePath) {
        userUid = ImageDecryptService.findUserUid(config.gamePath)
      }
    }

    if (!userUid) {
      return res.status(400).json({
        success: false,
        error: 'UID is required for decryption. Please provide UID or configure game path.',
      })
    }

    const result = await ImageDecryptService.decryptImage(image.path, userUid)

    // 如果解密成功，更新数据库中的元数据
    if (result.metadata) {
      ImageModel.update(id, {
        gameMetadata: JSON.stringify(result.metadata),
      })
    }

    res.json({
      success: true,
      data: {
        imageId: id,
        hasEncryptedData: result.hasEncryptedData,
        metadata: result.metadata,
      },
    })
  } catch (error) {
    logger.error('Failed to decrypt image:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to decrypt image',
    })
  }
})

/**
 * POST /api/decrypt/batch
 * 批量解密图片
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { imageIds, uid } = req.body

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'imageIds array is required',
      })
    }

    // 如果没有提供UID，尝试自动查找
    let userUid = uid
    if (!userUid) {
      const config = configService.getAll()
      if (config.gamePath) {
        userUid = ImageDecryptService.findUserUid(config.gamePath)
      }
    }

    if (!userUid) {
      return res.status(400).json({
        success: false,
        error: 'UID is required for decryption',
      })
    }

    const results = []
    let successCount = 0
    let failCount = 0

    for (const imageId of imageIds) {
      try {
        const image = ImageModel.findById(imageId)
        if (!image) {
          results.push({ imageId, success: false, error: 'Image not found' })
          failCount++
          continue
        }

        const result = await ImageDecryptService.decryptImage(image.path, userUid)

        if (result.metadata) {
          ImageModel.update(imageId, {
            gameMetadata: JSON.stringify(result.metadata),
          })
        }

        results.push({
          imageId,
          success: true,
          hasEncryptedData: result.hasEncryptedData,
          hasMetadata: !!result.metadata,
        })
        successCount++
      } catch (error) {
        results.push({
          imageId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
        failCount++
      }
    }

    res.json({
      success: true,
      data: {
        total: imageIds.length,
        success: successCount,
        failed: failCount,
        results,
      },
    })
  } catch (error) {
    logger.error('Failed to batch decrypt images:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to batch decrypt images',
    })
  }
})

/**
 * GET /api/decrypt/uid
 * 尝试从游戏目录查找用户UID
 */
router.get('/uid', async (req: Request, res: Response) => {
  try {
    const config = configService.getAll()

    if (!config.gamePath) {
      return res.status(400).json({
        success: false,
        error: 'Game path not configured',
      })
    }

    const uid = ImageDecryptService.findUserUid(config.gamePath)

    res.json({
      success: true,
      data: {
        uid,
        gamePath: config.gamePath,
      },
    })
  } catch (error) {
    logger.error('Failed to find UID:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to find UID',
    })
  }
})

export default router
