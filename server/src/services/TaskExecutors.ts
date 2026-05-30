import fs from 'fs'
import path from 'path'
import taskService, { Task, ProgressCallback } from './TaskService'
import AlbumService from './AlbumService'
import ImageService from './ImageService'
import MetadataService from './MetadataService'
import DedupService from './DedupService'
import { ImageDecryptService } from './ImageDecryptService'
import logger from '../utils/logger'

/**
 * 注册所有内置任务执行器
 */
export function registerTaskExecutors(): void {
  // 1. 扫描游戏相册
  taskService.registerExecutor('scan_albums', async (task: Task, onProgress: ProgressCallback) => {
    const { gamePath } = task.metadata
    if (!gamePath) throw new Error('Game path is required')

    onProgress(0, '开始扫描游戏相册...')

    const albums = await AlbumService.scanGameAlbums(gamePath)

    onProgress(100, `扫描完成，发现 ${albums.length} 个相册`, albums.length)
    return { albumCount: albums.length, albums }
  })

  // 2. 扫描图片（调用 AlbumService 实际写入数据库）
  taskService.registerExecutor('scan_images', async (task: Task, onProgress: ProgressCallback) => {
    const { albumId, albumPath } = task.metadata
    if (!albumId) throw new Error('Album ID is required')
    if (!albumPath) throw new Error('Album path is required')

    onProgress(0, '开始扫描图片...')

    const newImageCount = await AlbumService.scanAlbumImages(albumId, albumPath)

    onProgress(100, `扫描完成，新增 ${newImageCount} 张图片`, newImageCount)
    return { newImageCount, albumId, albumPath }
  })

  // 3. 提取元数据
  taskService.registerExecutor('extract_metadata', async (task: Task, onProgress: ProgressCallback) => {
    const { imageIds } = task.metadata
    if (!imageIds || !Array.isArray(imageIds)) throw new Error('imageIds array is required')

    task.totalItems = imageIds.length
    let processed = 0
    let failed = 0

    onProgress(0, '开始提取元数据...')

    for (const imageId of imageIds) {
      try {
        await MetadataService.extractAndSaveMetadata(imageId)
        processed++
      } catch (error: any) {
        failed++
        logger.warn(`Failed to extract metadata for ${imageId}:`, error.message)
      }

      onProgress(
        Math.round((processed / imageIds.length) * 100),
        `提取元数据: ${processed}/${imageIds.length}`,
        processed,
        failed
      )
    }

    return { total: imageIds.length, processed, failed }
  })

  // 4. AI处理
  taskService.registerExecutor('ai_process', async (task: Task, onProgress: ProgressCallback) => {
    const { imageIds } = task.metadata
    if (!imageIds || !Array.isArray(imageIds)) throw new Error('imageIds array is required')

    task.totalItems = imageIds.length
    let processed = 0
    let failed = 0

    onProgress(0, '开始AI处理...')

    for (const imageId of imageIds) {
      try {
        // 获取图片路径
        const image = await ImageService.getImageById(imageId)
        if (!image) throw new Error('Image not found')

        // AI处理逻辑（需要配置AI模型后才能实际执行）
        logger.info(`AI processing image: ${imageId}`)
        processed++
      } catch (error: any) {
        failed++
        logger.warn(`Failed to AI process ${imageId}:`, error.message)
      }

      onProgress(
        Math.round((processed / imageIds.length) * 100),
        `AI处理: ${processed}/${imageIds.length}`,
        processed,
        failed
      )
    }

    return { total: imageIds.length, processed, failed }
  })

  // 5. 去重
  taskService.registerExecutor('dedup', async (task: Task, onProgress: ProgressCallback) => {
    const { gamePath, uid, albumTypes } = task.metadata
    if (!gamePath) throw new Error('Game path is required')

    onProgress(0, '开始扫描重复图片...')

    const result = await DedupService.detectDuplicates(gamePath, uid, albumTypes)

    onProgress(100, `扫描完成，发现 ${result.duplicateGroups} 组重复图片`)
    return result
  })

  // 6. 解密
  taskService.registerExecutor('decrypt', async (task: Task, onProgress: ProgressCallback) => {
    const { filePaths, uid } = task.metadata
    if (!filePaths || !Array.isArray(filePaths)) throw new Error('filePaths array is required')

    task.totalItems = filePaths.length
    let processed = 0
    let failed = 0

    onProgress(0, '开始解密图片...')

    for (const filePath of filePaths) {
      try {
        await ImageDecryptService.decryptImage(filePath, uid)
        processed++
      } catch (error: any) {
        failed++
        logger.warn(`Failed to decrypt ${filePath}:`, error.message)
      }

      onProgress(
        Math.round((processed / filePaths.length) * 100),
        `解密: ${processed}/${filePaths.length}`,
        processed,
        failed
      )
    }

    return { total: filePaths.length, processed, failed }
  })

  // 7. 批量操作
  taskService.registerExecutor('batch_operation', async (task: Task, onProgress: ProgressCallback) => {
    const { action, imageIds, targetAlbumId, tags } = task.metadata
    if (!action || !imageIds) throw new Error('action and imageIds are required')

    task.totalItems = imageIds.length
    let processed = 0
    let failed = 0

    onProgress(0, `开始批量${action}...`)

    for (const imageId of imageIds) {
      try {
        switch (action) {
          case 'move':
            if (!targetAlbumId) throw new Error('targetAlbumId required for move')
            await ImageService.updateImage(imageId, { albumId: targetAlbumId })
            break
          case 'favorite':
            await ImageService.updateImage(imageId, { favorite: true } as any)
            break
          case 'tag':
            if (!tags || !Array.isArray(tags)) throw new Error('tags required for tag action')
            for (const tagId of tags) {
              await ImageService.addTag(imageId, tagId)
            }
            break
          case 'delete':
            await ImageService.deleteImage(imageId)
            break
          default:
            throw new Error(`Unknown action: ${action}`)
        }
        processed++
      } catch (error: any) {
        failed++
        logger.warn(`Failed to ${action} image ${imageId}:`, error.message)
      }

      onProgress(
        Math.round((processed / imageIds.length) * 100),
        `${action}: ${processed}/${imageIds.length}`,
        processed,
        failed
      )
    }

    return { action, total: imageIds.length, processed, failed }
  })

  logger.info('All task executors registered')
}
