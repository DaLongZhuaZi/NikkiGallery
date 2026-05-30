import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { toCamelCase } from '../utils/caseConvert'

export interface Tag {
  id: string
  nameZh: string
  nameEn: string
  type: 'ai' | 'user' | 'system' | 'scene' | 'clothing' | 'action'
  category: string | null
  color: string | null
  icon: string | null
  usageCount: number
  createdAt: string
}

export interface CreateTagDTO {
  id?: string  // 可选，用于同步AI标签时指定固定ID
  nameZh: string
  nameEn: string
  type: Tag['type']
  category?: string
  color?: string
  icon?: string
}

export class TagModel {
  // 获取所有标签
  static findAll(type?: Tag['type']): Tag[] {
    const db = getDatabase()
    let sql = 'SELECT * FROM tags ORDER BY usage_count DESC'
    const params: any[] = []
    
    if (type) {
      sql = 'SELECT * FROM tags WHERE type = ? ORDER BY usage_count DESC'
      params.push(type)
    }
    
    const stmt = db.prepare(sql)
    if (params.length > 0) {
      stmt.bind(params)
    }
    
    const results: Tag[] = []
    while (stmt.step()) {
      results.push(toCamelCase<Tag>(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  // 根据ID获取标签
  static findById(id: string): Tag | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = toCamelCase<Tag>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 根据英文名获取标签
  static findByNameEn(nameEn: string): Tag | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tags WHERE name_en = ?')
    stmt.bind([nameEn])
    
    if (stmt.step()) {
      const row = toCamelCase<Tag>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 创建标签
  static create(data: CreateTagDTO): Tag {
    const db = getDatabase()
    const id = data.id || uuidv4()

    db.run(`
      INSERT INTO tags (id, name_zh, name_en, type, category, color, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, data.nameZh, data.nameEn, data.type, data.category || null, data.color || null, data.icon || null])

    logger.info(`Tag created: ${data.nameEn} (${id})`)
    return this.findById(id)!
  }

  // 更新标签
  static update(id: string, data: Partial<CreateTagDTO>): Tag | undefined {
    const tag = this.findById(id)
    if (!tag) return undefined

    const db = getDatabase()
    const updates: string[] = []
    const values: any[] = []

    if (data.nameZh !== undefined) {
      updates.push('name_zh = ?')
      values.push(data.nameZh)
    }
    if (data.nameEn !== undefined) {
      updates.push('name_en = ?')
      values.push(data.nameEn)
    }
    if (data.type !== undefined) {
      updates.push('type = ?')
      values.push(data.type)
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      values.push(data.category)
    }
    if (data.color !== undefined) {
      updates.push('color = ?')
      values.push(data.color)
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?')
      values.push(data.icon)
    }

    if (updates.length === 0) return tag

    values.push(id)
    db.run(`
      UPDATE tags
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)

    return this.findById(id)
  }

  // 删除标签
  static delete(id: string): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const changes = db.getRowsModified()
    stmt.free()
    logger.info(`Tag deleted: ${id}`)
    return changes > 0
  }

  // 增加使用次数
  static incrementUsage(id: string): void {
    const db = getDatabase()
    db.run('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?', [id])
  }

  // 批量增加使用次数
  static batchIncrementUsage(ids: string[]): void {
    const db = getDatabase()
    for (const id of ids) {
      db.run('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?', [id])
    }
  }

  // 添加图片标签关联
  static addImageTag(imageId: string, tagId: string, confidence?: number, source: 'ai' | 'user' = 'user'): void {
    const db = getDatabase()
    db.run(`
      INSERT OR REPLACE INTO image_tags (image_id, tag_id, confidence, source)
      VALUES (?, ?, ?, ?)
    `, [imageId, tagId, confidence || null, source])
    this.incrementUsage(tagId)
  }

  // 批量添加图片标签关联
  static batchAddImageTag(imageId: string, tagIds: string[], source: 'ai' | 'user' = 'user'): void {
    const db = getDatabase()
    for (const tagId of tagIds) {
      db.run(`
        INSERT OR REPLACE INTO image_tags (image_id, tag_id, confidence, source)
        VALUES (?, ?, NULL, ?)
      `, [imageId, tagId, source])
    }
    this.batchIncrementUsage(tagIds)
  }

  // 移除图片标签关联
  static removeImageTag(imageId: string, tagId: string): void {
    const db = getDatabase()
    db.run('DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?', [imageId, tagId])
  }

  // 清除图片的所有AI标签（保留用户手动添加的标签）
  static clearImageAITags(imageId: string): void {
    const db = getDatabase()
    db.run("DELETE FROM image_tags WHERE image_id = ? AND source = 'ai'", [imageId])
  }

  // 获取图片的所有标签
  static getImageTags(imageId: string): Tag[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
      ORDER BY t.usage_count DESC
    `)
    stmt.bind([imageId])
    
    const results: Tag[] = []
    while (stmt.step()) {
      results.push(toCamelCase<Tag>(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  // 获取标签统计
  static getStats(): { total: number; byType: Record<string, number> } {
    const db = getDatabase()
    
    // 获取总数
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM tags')
    let total = 0
    if (totalStmt.step()) {
      total = (totalStmt.getAsObject().count as number)
    }
    totalStmt.free()
    
    // 获取按类型统计
    const byTypeStmt = db.prepare('SELECT type, COUNT(*) as count FROM tags GROUP BY type')
    const byType: Record<string, number> = {}
    while (byTypeStmt.step()) {
      const row = byTypeStmt.getAsObject()
      byType[row.type as string] = row.count as number
    }
    byTypeStmt.free()

    return { total, byType }
  }

  // 获取热门标签
  static getPopular(limit: number = 20): Tag[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?')
    stmt.bind([limit])
    
    const results: Tag[] = []
    while (stmt.step()) {
      results.push(toCamelCase<Tag>(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }
}

export default TagModel
