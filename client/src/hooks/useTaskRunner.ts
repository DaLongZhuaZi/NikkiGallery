import { useTaskStore } from '@/stores/useTaskStore'
import type { TaskType } from '@/api/task'

/**
 * 任务执行器 Hook
 * 提供便捷的方法来创建和管理后台任务
 */
export function useTaskRunner() {
  const { createTask, cancelTask, togglePanel } = useTaskStore()

  /**
   * 扫描游戏相册
   */
  const scanAlbums = async (gamePath: string) => {
    return createTask({
      name: '扫描游戏相册',
      type: 'scan_albums',
      metadata: { gamePath },
    })
  }

  /**
   * 扫描图片
   */
  const scanImages = async (albumId: string, albumPath: string) => {
    return createTask({
      name: `扫描图片: ${albumPath}`,
      type: 'scan_images',
      metadata: { albumId, albumPath },
    })
  }

  /**
   * 提取元数据
   */
  const extractMetadata = async (imageIds: string[]) => {
    return createTask({
      name: `提取元数据 (${imageIds.length} 张图片)`,
      type: 'extract_metadata',
      totalItems: imageIds.length,
      metadata: { imageIds },
    })
  }

  /**
   * AI处理
   */
  const aiProcess = async (imageIds: string[], modelType?: string) => {
    return createTask({
      name: `AI处理 (${imageIds.length} 张图片)`,
      type: 'ai_process',
      totalItems: imageIds.length,
      metadata: { imageIds, modelType },
    })
  }

  /**
   * 智能去重
   */
  const dedup = async (gamePath: string, uid?: string) => {
    return createTask({
      name: '智能去重扫描',
      type: 'dedup',
      metadata: { gamePath, uid },
    })
  }

  /**
   * 批量操作
   */
  const batchOperation = async (
    action: 'move' | 'favorite' | 'tag' | 'delete',
    imageIds: string[],
    options?: { targetAlbumId?: string; tags?: string[] }
  ) => {
    const actionNames: Record<string, string> = {
      move: '移动',
      favorite: '收藏',
      tag: '添加标签',
      delete: '删除',
    }

    return createTask({
      name: `批量${actionNames[action]} (${imageIds.length} 张图片)`,
      type: 'batch_operation',
      totalItems: imageIds.length,
      metadata: { action, imageIds, ...options },
    })
  }

  /**
   * 解密图片
   */
  const decryptImages = async (filePaths: string[], uid?: string) => {
    return createTask({
      name: `解密图片 (${filePaths.length} 个文件)`,
      type: 'decrypt',
      totalItems: filePaths.length,
      metadata: { filePaths, uid },
    })
  }

  /**
   * 创建自定义任务
   */
  const customTask = async (name: string, metadata?: Record<string, any>) => {
    return createTask({
      name,
      type: 'custom',
      metadata,
    })
  }

  return {
    scanAlbums,
    scanImages,
    extractMetadata,
    aiProcess,
    dedup,
    batchOperation,
    decryptImages,
    customTask,
    cancelTask,
    openTaskPanel: togglePanel,
  }
}

export default useTaskRunner
