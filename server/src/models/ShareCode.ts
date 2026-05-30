import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { toCamelCase } from '../utils/caseConvert'

export interface ShareCode {
  id: string
  type: 'dye' | 'home' | 'camera' | 'combo' | 'diy'
  code: string
  name: string | null
  description: string | null
  metadata: string | null
  imageId: string | null
  roleId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateShareCodeDTO {
  type: ShareCode['type']
  code: string
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  imageId?: string
  roleId?: string
}

export interface UpdateShareCodeDTO {
  name?: string
  description?: string
  metadata?: Record<string, unknown>
  imageId?: string
}

export interface ShareCodeFilter {
  type?: ShareCode['type']
  role_id?: string
  search?: string
  page?: number
  page_size?: number
}

export class ShareCodeModel {
  // 获取分享码列表
  static findAll(filter: ShareCodeFilter = {}): { shareCodes: ShareCode[]; total: number } {
    const db = getDatabase()
    const {
      type,
      role_id,
      search,
      page = 1,
      page_size = 50
    } = filter

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (type) {
      whereClause += ' AND type = ?'
      params.push(type)
    }

    if (role_id) {
      whereClause += ' AND role_id = ?'
      params.push(role_id)
    }

    if (search) {
      whereClause += ' AND (code LIKE ? OR name LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 获取总数
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM share_codes ${whereClause}`)
    countStmt.bind(params)
    let total = 0
    if (countStmt.step()) {
      total = countStmt.getAsObject().total as number
    }
    countStmt.free()

    // 获取分页数据
    const offset = (page - 1) * page_size
    const dataStmt = db.prepare(`
      SELECT * FROM share_codes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    dataStmt.bind([...params, page_size, offset])
    
    const shareCodes: ShareCode[] = []
    while (dataStmt.step()) {
      shareCodes.push(toCamelCase<ShareCode>(dataStmt.getAsObject()))
    }
    dataStmt.free()

    return { shareCodes, total }
  }

  // 根据ID获取分享码
  static findById(id: string): ShareCode | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM share_codes WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = toCamelCase<ShareCode>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 根据code获取分享码
  static findByCode(code: string): ShareCode | undefined {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM share_codes WHERE code = ?')
    stmt.bind([code])
    
    if (stmt.step()) {
      const row = toCamelCase<ShareCode>(stmt.getAsObject())
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  // 创建分享码
  static create(data: CreateShareCodeDTO): ShareCode {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.run(`
      INSERT INTO share_codes (id, type, code, name, description, metadata, image_id, role_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.type,
      data.code,
      data.name || null,
      data.description || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.imageId || null,
      data.roleId || null,
      now,
      now
    ])

    logger.info(`Share code created: ${data.code} (${id})`)
    return this.findById(id)!
  }

  // 更新分享码
  static update(id: string, data: UpdateShareCodeDTO): ShareCode | undefined {
    const shareCode = this.findById(id)
    if (!shareCode) return undefined

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
    if (data.metadata !== undefined) {
      updates.push('metadata = ?')
      values.push(JSON.stringify(data.metadata))
    }
    if (data.imageId !== undefined) {
      updates.push('image_id = ?')
      values.push(data.imageId)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.run(`
      UPDATE share_codes
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)

    logger.info(`Share code updated: ${id}`)
    return this.findById(id)
  }

  // 删除分享码
  static delete(id: string): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM share_codes WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const changes = db.getRowsModified()
    stmt.free()
    logger.info(`Share code deleted: ${id}`)
    return changes > 0
  }

  // 批量删除分享码
  static batchDelete(ids: string[]): number {
    const db = getDatabase()
    let totalChanges = 0
    
    for (const id of ids) {
      const stmt = db.prepare('DELETE FROM share_codes WHERE id = ?')
      stmt.bind([id])
      stmt.step()
      totalChanges += db.getRowsModified()
      stmt.free()
    }
    
    return totalChanges
  }

  // 获取统计信息
  static getStats(): { total: number; byType: Record<string, number> } {
    const db = getDatabase()
    
    // 获取总数
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM share_codes')
    let total = 0
    if (totalStmt.step()) {
      total = totalStmt.getAsObject().count as number
    }
    totalStmt.free()
    
    // 获取按类型统计
    const byTypeStmt = db.prepare('SELECT type, COUNT(*) as count FROM share_codes GROUP BY type')
    const byType: Record<string, number> = {}
    while (byTypeStmt.step()) {
      const row = byTypeStmt.getAsObject()
      byType[row.type as string] = row.count as number
    }
    byTypeStmt.free()

    return { total, byType }
  }

  // 解析metadata
  static parseMetadata(shareCode: ShareCode): Record<string, unknown> | null {
    if (!shareCode.metadata) return null
    try {
      return JSON.parse(shareCode.metadata)
    } catch {
      return null
    }
  }
}

export default ShareCodeModel
