import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { toCamelCase, toCamelCaseArray } from '../utils/caseConvert'

export interface Image {
  id: string
  albumId: string
  filename: string
  path: string
  hash: string
  width: number | null
  height: number | null
  fileSize: number
  mimeType: string | null
  thumbnailPath: string | null
  aiProcessed: number
  aiTags: string | null
  aiFeatures: string | null
  userTags: string | null
  description: string | null
  favorite: number
  deletedAt: string | null
  exifData: string | null
  cameraParams: string | null
  gameMetadata: string | null
  createdAt: string
  updatedAt: string
}

// 相机参数接口
export interface CameraParams {
  // 基础参数
  focalLength?: number      // 焦距
  aperture?: number         // 光圈
  fov?: number              // 视场角
  
  // 位置参数
  positionX?: number
  positionY?: number
  positionZ?: number
  
  // 角度参数
  pitch?: number            // 俯仰角
  yaw?: number              // 偏航角
  roll?: number             // 滚转角
  
  // 后期效果
  brightness?: number       // 亮度
  contrast?: number         // 对比度
  saturation?: number       // 饱和度
  exposure?: number         // 曝光
  highlights?: number       // 高光
  shadows?: number          // 阴影
  bloomIntensity?: number   // 泛光强度
  vignetteIntensity?: number // 暗角强度
  
  // 滤镜
  filterId?: string
  filterStrength?: number
  
  // 其他
  portraitMode?: boolean
  weatherType?: number
  gameTime?: string
}

export interface CreateImageDTO {
  albumId: string
  filename: string
  path: string
  hash: string
  width?: number
  height?: number
  fileSize: number
  mimeType?: string
  createdAt?: string
}

export interface ImageFilter {
  album_id?: string
  tags?: string[]
  favorite?: boolean
  ai_processed?: boolean
  search?: string
  sort_by?: 'created_at' | 'filename' | 'file_size'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
  deleted?: boolean // true=只返回已删除, false=只返回未删除, undefined=返回未删除
}

export class ImageModel {
  // 获取图片列表（带筛选和分页）
  static findAll(filter: ImageFilter = {}): { images: Image[]; total: number } {
    const db = getDatabase()
    const {
      album_id,
      tags,
      favorite,
      ai_processed,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      page_size = 50,
      deleted = false
    } = filter

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    // 软删除过滤：默认只返回未删除的图片
    if (deleted === true) {
      whereClause += ' AND i.deleted_at IS NOT NULL'
    } else {
      whereClause += ' AND i.deleted_at IS NULL'
    }

    if (album_id) {
      whereClause += ' AND i.album_id = ?'
      params.push(album_id)
    }

    if (favorite !== undefined) {
      whereClause += ' AND i.favorite = ?'
      params.push(favorite ? 1 : 0)
    }

    if (ai_processed !== undefined) {
      whereClause += ' AND i.ai_processed = ?'
      params.push(ai_processed ? 1 : 0)
    }

    if (search) {
      whereClause += ' AND (i.filename LIKE ? OR i.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    // 标签筛选需要JOIN
    let joinClause = ''
    if (tags && tags.length > 0) {
      joinClause = `
        INNER JOIN image_tags it ON i.id = it.image_id
        INNER JOIN tags t ON it.tag_id = t.id
      `
      whereClause += ` AND t.id IN (${tags.map(() => '?').join(',')})`
      params.push(...tags)
    }

    // 获取总数
    const countStmt = db.prepare(`
      SELECT COUNT(DISTINCT i.id) as total
      FROM images i
      ${joinClause}
      ${whereClause}
    `)
    countStmt.bind(params)
    let total = 0
    if (countStmt.step()) {
      const row = countStmt.getAsObject()
      total = row.total as number
    }
    countStmt.free()

    // 获取分页数据
    const offset = (page - 1) * page_size
    const dataStmt = db.prepare(`
      SELECT DISTINCT i.*
      FROM images i
      ${joinClause}
      ${whereClause}
      ORDER BY i.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `)
    dataStmt.bind([...params, page_size, offset])
    
    const images: Image[] = []
    while (dataStmt.step()) {
      images.push(toCamelCase<Image>(dataStmt.getAsObject()))
    }
    dataStmt.free()

    return { images, total }
  }

  // 根据ID获取图片（默认只返回未删除的）
  static findById(id: string, includeDeleted: boolean = false): Image | undefined {
    const db = getDatabase()
    const sql = includeDeleted 
      ? 'SELECT * FROM images WHERE id = ?'
      : 'SELECT * FROM images WHERE id = ? AND deleted_at IS NULL'
    const stmt = db.prepare(sql)
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = toCamelCase<Image>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 根据hash获取图片（去重）
  static findByHash(hash: string): Image | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM images WHERE hash = ?')
    stmt.bind([hash])
    
    if (stmt.step()) {
      const row = toCamelCase<Image>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 根据文件路径获取图片（路径去重）
  static findByPath(filePath: string): Image | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM images WHERE path = ?')
    stmt.bind([filePath])
    
    if (stmt.step()) {
      const row = toCamelCase<Image>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 创建图片
  static create(data: CreateImageDTO): Image {
    const db = getDatabase()
    const id = uuidv4()
    const now = data.createdAt || new Date().toISOString()

    db.run(`
      INSERT INTO images (id, album_id, filename, path, hash, width, height, file_size, mime_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, data.albumId, data.filename, data.path, data.hash, data.width || null, data.height || null, data.fileSize, data.mimeType || null, now, now])

    // 更新相册图片数量
    db.run('UPDATE albums SET image_count = image_count + 1 WHERE id = ?', [data.albumId])

    logger.info(`Image created: ${data.filename} (${id})`)
    return this.findById(id)!
  }

  // 更新图片
  static update(id: string, data: Partial<Image>): Image | undefined {
    const image = this.findById(id)
    if (!image) return undefined

    const db = getDatabase()
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    // camelCase -> snake_case 映射
    const fieldMap: Record<string, string> = {
      aiProcessed: 'ai_processed',
      aiTags: 'ai_tags',
      aiFeatures: 'ai_features',
      userTags: 'user_tags',
      thumbnailPath: 'thumbnail_path',
      description: 'description',
      favorite: 'favorite',
      width: 'width',
      height: 'height',
      exifData: 'exif_data',
      cameraParams: 'camera_params',
      gameMetadata: 'game_metadata',
    }

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (data[camelKey as keyof Image] !== undefined) {
        updates.push(`${snakeKey} = ?`)
        values.push(data[camelKey as keyof Image])
      }
    }

    if (updates.length === 0) return image

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.run(`
      UPDATE images
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)

    return this.findById(id)
  }

  // 误删除图片（移入回收站）
  static delete(id: string): boolean {
    const image = this.findById(id)
    if (!image) return false

    const db = getDatabase()
    const now = new Date().toISOString()
    db.run('UPDATE images SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    // 更新相册图片数量
    db.run('UPDATE albums SET image_count = image_count - 1 WHERE id = ?', [image.albumId])

    logger.info(`Image soft deleted: ${id}`)
    return true
  }

  // 批量软删除图片
  static batchDelete(ids: string[]): number {
    const db = getDatabase()
    const now = new Date().toISOString()
    let totalChanges = 0
    
    for (const id of ids) {
      const image = this.findById(id)
      if (image) {
        db.run('UPDATE images SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])
        totalChanges += db.getRowsModified()
        
        // 更新相册图片数量
        db.run('UPDATE albums SET image_count = image_count - 1 WHERE id = ?', [image.albumId])
      }
    }
    
    return totalChanges
  }

  // 恢复图片（从回收站）
  static restore(id: string): boolean {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.run('UPDATE images SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL', [now, id])
    
    const changes = db.getRowsModified()
    if (changes > 0) {
      const image = this.findById(id)
      if (image) {
        db.run('UPDATE albums SET image_count = image_count + 1 WHERE id = ?', [image.albumId])
      }
      logger.info(`Image restored: ${id}`)
    }
    return changes > 0
  }

  // 批量恢复图片
  static batchRestore(ids: string[]): number {
    const db = getDatabase()
    const now = new Date().toISOString()
    let totalChanges = 0
    
    for (const id of ids) {
      db.run('UPDATE images SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL', [now, id])
      const changes = db.getRowsModified()
      if (changes > 0) {
        totalChanges += changes
        const image = this.findById(id)
        if (image) {
          db.run('UPDATE albums SET image_count = image_count + 1 WHERE id = ?', [image.albumId])
        }
      }
    }
    
    return totalChanges
  }

  // 永久删除图片
  static permanentDelete(id: string): boolean {
    const image = this.findById(id)
    if (!image || !image.deletedAt) return false

    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM images WHERE id = ? AND deleted_at IS NOT NULL')
    stmt.bind([id])
    stmt.step()
    const changes = db.getRowsModified()
    stmt.free()

    logger.info(`Image permanently deleted: ${id}`)
    return changes > 0
  }

  // 批量永久删除图片
  static batchPermanentDelete(ids: string[]): number {
    const db = getDatabase()
    let totalChanges = 0
    
    for (const id of ids) {
      const stmt = db.prepare('DELETE FROM images WHERE id = ? AND deleted_at IS NOT NULL')
      stmt.bind([id])
      stmt.step()
      totalChanges += db.getRowsModified()
      stmt.free()
    }
    
    return totalChanges
  }

  // 清空回收站
  static emptyTrash(): number {
    const db = getDatabase()
    db.run('DELETE FROM images WHERE deleted_at IS NOT NULL')
    const changes = db.getRowsModified()
    logger.info(`Trash emptied: ${changes} images permanently deleted`)
    return changes
  }

  // 获取回收站统计
  static getTrashStats(): { count: number; totalSize: number } {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
      FROM images
      WHERE deleted_at IS NOT NULL
    `)
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return { count: row.count as number, totalSize: row.total_size as number }
    }
    stmt.free()
    return { count: 0, totalSize: 0 }
  }

  // 批量更新收藏状态
  static batchUpdateFavorite(ids: string[], favorite: boolean): number {
    const db = getDatabase()
    let totalChanges = 0
    
    for (const id of ids) {
      db.run(`
        UPDATE images
        SET favorite = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [favorite ? 1 : 0, id])
      totalChanges += db.getRowsModified()
    }
    
    return totalChanges
  }

  // 获取未处理AI的图片
  static findUnprocessed(limit: number = 100): Image[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM images
      WHERE ai_processed = 0
      ORDER BY created_at ASC
      LIMIT ?
    `)
    stmt.bind([limit])
    
    const results: Image[] = []
    while (stmt.step()) {
      results.push(toCamelCase<Image>(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  // 获取统计信息
  static getStats(): {
    total: number
    processed: number
    unprocessed: number
    favorites: number
    trash: number
  } {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ai_processed = 1 THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN ai_processed = 0 THEN 1 ELSE 0 END) as unprocessed,
        SUM(CASE WHEN favorite = 1 THEN 1 ELSE 0 END) as favorites,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as trash
      FROM images
    `)
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row as unknown as { total: number; processed: number; unprocessed: number; favorites: number; trash: number }
    }
    stmt.free()
    return { total: 0, processed: 0, unprocessed: 0, favorites: 0, trash: 0 }
  }
}

export default ImageModel
