import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { toCamelCase } from '../utils/caseConvert'

export interface Album {
  id: string
  name: string
  path: string
  accountId?: string
  type: 'game' | 'custom'
  description?: string
  coverImageId?: string
  imageCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateAlbumDTO {
  name: string
  path: string
  accountId?: string
  type?: 'game' | 'custom'
  description?: string
}

export interface UpdateAlbumDTO {
  name?: string
  description?: string
  coverImageId?: string
}

export class AlbumModel {
  // 获取所有相册
  static findAll(): Album[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM albums
      ORDER BY updated_at DESC
    `)
    
    const results: Album[] = []
    while (stmt.step()) {
      results.push(toCamelCase<Album>(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  // 根据ID获取相册
  static findById(id: string): Album | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM albums WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = toCamelCase<Album>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 根据路径获取相册
  static findByPath(albumPath: string): Album | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM albums WHERE path = ?')
    stmt.bind([albumPath])
    
    if (stmt.step()) {
      const row = toCamelCase<Album>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 创建相册
  static create(data: CreateAlbumDTO): Album {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.run(`
      INSERT INTO albums (id, name, path, account_id, type, description, image_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [id, data.name, data.path, data.accountId || null, data.type || 'custom', data.description || null, now, now])

    logger.info(`Album created: ${data.name} (${id})`)
    return this.findById(id)!
  }

  // 更新相册
  static update(id: string, data: UpdateAlbumDTO): Album | undefined {
    const album = this.findById(id)
    if (!album) return undefined

    const db = getDatabase()
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.coverImageId !== undefined) {
      updates.push('cover_image_id = ?')
      values.push(data.coverImageId)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.run(`
      UPDATE albums
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)

    logger.info(`Album updated: ${id}`)
    return this.findById(id)
  }

  // 删除相册
  static delete(id: string): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM albums WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const changes = db.getRowsModified()
    stmt.free()
    logger.info(`Album deleted: ${id}`)
    return changes > 0
  }

  // 更新图片数量
  static updateImageCount(id: string): void {
    const db = getDatabase()
    db.run(`
      UPDATE albums
      SET image_count = (SELECT COUNT(*) FROM images WHERE album_id = ?),
          updated_at = datetime('now')
      WHERE id = ?
    `, [id, id])
  }

  // 获取相册统计
  static getStats(): { total: number; game: number; custom: number } {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'game' THEN 1 ELSE 0 END) as game,
        SUM(CASE WHEN type = 'custom' THEN 1 ELSE 0 END) as custom
      FROM albums
    `)
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row as unknown as { total: number; game: number; custom: number }
    }
    stmt.free()
    return { total: 0, game: 0, custom: 0 }
  }
}

export default AlbumModel
