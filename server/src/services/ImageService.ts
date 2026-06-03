import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import config from '../config'
import logger from '../utils/logger'
import ImageModel, { Image, ImageFilter } from '../models/Image'
import TagModel from '../models/Tag'

export class ImageService {
  // 获取图片列表
  static async getImages(filter: ImageFilter) {
    return ImageModel.findAll(filter)
  }

  // 根据ID获取图片
  static async getImageById(id: string): Promise<Image | undefined> {
    return ImageModel.findById(id)
  }

  // 更新图片
  static async updateImage(id: string, data: Partial<Image>): Promise<Image | undefined> {
    return ImageModel.update(id, data)
  }

  // 删除图片
  static async deleteImage(id: string, deleteFile: boolean = false): Promise<boolean> {
    const image = ImageModel.findById(id)
    if (!image) {
      throw new Error('Image not found')
    }

    if (deleteFile) {
      try {
        if (fs.existsSync(image.path)) {
          fs.unlinkSync(image.path)
        }
        if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
          fs.unlinkSync(image.thumbnailPath)
        }
      } catch (error) {
        logger.error(`Failed to delete image files: ${image.path}`, error)
      }
    }

    return ImageModel.delete(id)
  }

  // 批量删除图片
  static async batchDeleteImages(ids: string[], deleteFiles: boolean = false): Promise<number> {
    if (deleteFiles) {
      for (const id of ids) {
        const image = ImageModel.findById(id)
        if (image) {
          try {
            if (fs.existsSync(image.path)) {
              fs.unlinkSync(image.path)
            }
            if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
              fs.unlinkSync(image.thumbnailPath)
            }
          } catch (error) {
            logger.error(`Failed to delete image file: ${image.path}`, error)
          }
        }
      }
    }

    return ImageModel.batchDelete(ids)
  }

  // 批量更新收藏状态
  static async batchUpdateFavorite(ids: string[], favorite: boolean): Promise<number> {
    return ImageModel.batchUpdateFavorite(ids, favorite)
  }

  // 缩略图尺寸配置
  private static readonly THUMB_SIZES: Record<string, { width: number; height: number; quality: number; suffix: string }> = {
    small:  { width: 150, height: 150, quality: 70, suffix: '_small' },
    medium: { width: 300, height: 300, quality: 80, suffix: '' },       // 默认尺寸，向后兼容
    large:  { width: 600, height: 600, quality: 85, suffix: '_large' },
  }

  // 获取指定尺寸的缩略图路径
  static getThumbnailPath(imageId: string, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
    const sizeConfig = ImageService.THUMB_SIZES[size] || ImageService.THUMB_SIZES.medium
    const suffix = sizeConfig.suffix
    const filename = `${imageId}_thumb${suffix}.jpg`
    const filePath = path.join(config.storage.thumbnailsPath, filename)
    if (fs.existsSync(filePath)) return filePath

    // 请求的尺寸不存在，fallback 到 medium
    if (size !== 'medium') {
      const fallback = path.join(config.storage.thumbnailsPath, `${imageId}_thumb.jpg`)
      if (fs.existsSync(fallback)) return fallback
    }
    return null
  }

  // 生成缩略图（支持多尺寸）
  static async generateThumbnail(imageId: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<string | null> {
    const image = ImageModel.findById(imageId)
    if (!image) {
      throw new Error('Image not found')
    }

    const sizeConfig = ImageService.THUMB_SIZES[size] || ImageService.THUMB_SIZES.medium

    // 检查是否已存在
    const existingPath = ImageService.getThumbnailPath(imageId, size)
    if (existingPath) return existingPath

    // 确保缩略图目录存在
    if (!fs.existsSync(config.storage.thumbnailsPath)) {
      fs.mkdirSync(config.storage.thumbnailsPath, { recursive: true })
    }

    const suffix = sizeConfig.suffix
    const thumbnailFilename = `${imageId}_thumb${suffix}.jpg`
    const thumbnailPath = path.join(config.storage.thumbnailsPath, thumbnailFilename)

    try {
      await sharp(image.path)
        .resize(sizeConfig.width, sizeConfig.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: sizeConfig.quality })
        .toFile(thumbnailPath)

      // 更新数据库（仅 medium 尺寸更新主字段，向后兼容）
      if (size === 'medium') {
        ImageModel.update(imageId, { thumbnailPath: thumbnailPath })
      }

      logger.info(`Thumbnail (${size}) generated for image ${imageId}`)
      return thumbnailPath
    } catch (error) {
      logger.error(`Failed to generate thumbnail for image ${imageId}:`, error)
      return null
    }
  }

  // 批量生成缩略图
  static async batchGenerateThumbnails(imageIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const imageId of imageIds) {
      try {
        const result = await this.generateThumbnail(imageId)
        if (result) {
          success++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }

    return { success, failed }
  }

  // 获取图片信息
  static async getImageInfo(imageId: string) {
    const image = ImageModel.findById(imageId)
    if (!image) {
      throw new Error('Image not found')
    }

    const tags = TagModel.getImageTags(imageId)
    const metadata = await this.getImageMetadata(image.path)

    return {
      ...image,
      tags,
      metadata,
    }
  }

  // 获取图片元数据
  private static async getImageMetadata(filePath: string) {
    try {
      const metadata = await sharp(filePath).metadata()
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
      }
    } catch (error) {
      logger.error(`Failed to get image metadata: ${filePath}`, error)
      return null
    }
  }

  // 添加图片标签
  static async addTag(imageId: string, tagId: string, source: 'ai' | 'user' = 'user', confidence?: number) {
    TagModel.addImageTag(imageId, tagId, confidence, source)
  }

  // 批量添加图片标签
  static async batchAddTag(imageIds: string[], tagIds: string[], source: 'ai' | 'user' = 'user') {
    for (const imageId of imageIds) {
      TagModel.batchAddImageTag(imageId, tagIds, source)
    }
  }

  // 移除图片标签
  static async removeTag(imageId: string, tagId: string) {
    TagModel.removeImageTag(imageId, tagId)
  }

  // 获取图片标签
  static async getImageTags(imageId: string) {
    return TagModel.getImageTags(imageId)
  }

  // 获取统计信息
  static async getStats() {
    return ImageModel.getStats()
  }

  // 获取未处理的图片
  static async getUnprocessedImages(limit: number = 100) {
    return ImageModel.findUnprocessed(limit)
  }

  // 更新AI处理结果
  static async updateAIResult(imageId: string, tags: { tagId: string; confidence: number }[]) {
    // 更新图片AI处理状态
    ImageModel.update(imageId, { aiProcessed: 1 })

    // 先清除该图片的旧AI标签（保留用户手动添加的标签）
    TagModel.clearImageAITags(imageId)

    // 添加新的AI标签
    for (const tag of tags) {
      TagModel.addImageTag(imageId, tag.tagId, tag.confidence, 'ai')
    }
  }

  // ============ 回收站相关方法 ============

  // 获取回收站统计
  static async getTrashStats() {
    return ImageModel.getTrashStats()
  }

  // 恢复单张图片
  static async restoreImage(id: string): Promise<boolean> {
    return ImageModel.restore(id)
  }

  // 批量恢复图片
  static async batchRestoreImages(ids: string[]): Promise<number> {
    return ImageModel.batchRestore(ids)
  }

  // 永久删除单张图片
  static async permanentDeleteImage(id: string, deleteFile: boolean = false): Promise<boolean> {
    if (deleteFile) {
      const image = ImageModel.findById(id, true) // 包含已删除的图片
      if (image) {
        try {
          if (fs.existsSync(image.path)) {
            fs.unlinkSync(image.path)
          }
          if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
            fs.unlinkSync(image.thumbnailPath)
          }
        } catch (error) {
          logger.error(`Failed to delete image files: ${image.path}`, error)
        }
      }
    }
    return ImageModel.permanentDelete(id)
  }

  // 批量永久删除图片
  static async batchPermanentDeleteImages(ids: string[], deleteFiles: boolean = false): Promise<number> {
    if (deleteFiles) {
      for (const id of ids) {
        const image = ImageModel.findById(id, true) // 包含已删除的图片
        if (image) {
          try {
            if (fs.existsSync(image.path)) {
              fs.unlinkSync(image.path)
            }
            if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
              fs.unlinkSync(image.thumbnailPath)
            }
          } catch (error) {
            logger.error(`Failed to delete image file: ${image.path}`, error)
          }
        }
      }
    }
    return ImageModel.batchPermanentDelete(ids)
  }

  // 清空回收站
  static async emptyTrash(deleteFiles: boolean = false): Promise<number> {
    if (deleteFiles) {
      const trashImages = ImageModel.findAll({ deleted: true, page_size: 10000 })
      for (const image of trashImages.images) {
        try {
          if (fs.existsSync(image.path)) {
            fs.unlinkSync(image.path)
          }
          if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
            fs.unlinkSync(image.thumbnailPath)
          }
        } catch (error) {
          logger.error(`Failed to delete image file: ${image.path}`, error)
        }
      }
    }
    return ImageModel.emptyTrash()
  }
}

export default ImageService