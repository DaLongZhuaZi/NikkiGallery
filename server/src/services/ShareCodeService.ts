import logger from '../utils/logger'
import ShareCodeModel, { ShareCode, CreateShareCodeDTO, UpdateShareCodeDTO, ShareCodeFilter } from '../models/ShareCode'

export class ShareCodeService {
  // 获取分享码列表
  static async getShareCodes(filter: ShareCodeFilter) {
    return ShareCodeModel.findAll(filter)
  }

  // 根据ID获取分享码
  static async getShareCodeById(id: string): Promise<ShareCode | undefined> {
    return ShareCodeModel.findById(id)
  }

  // 根据code获取分享码
  static async getShareCodeByCode(code: string): Promise<ShareCode | undefined> {
    return ShareCodeModel.findByCode(code)
  }

  // 创建分享码
  static async createShareCode(data: CreateShareCodeDTO): Promise<ShareCode> {
    // 检查code是否已存在
    const existing = ShareCodeModel.findByCode(data.code)
    if (existing) {
      throw new Error('Share code already exists')
    }

    return ShareCodeModel.create(data)
  }

  // 更新分享码
  static async updateShareCode(id: string, data: UpdateShareCodeDTO): Promise<ShareCode | undefined> {
    return ShareCodeModel.update(id, data)
  }

  // 删除分享码
  static async deleteShareCode(id: string): Promise<boolean> {
    return ShareCodeModel.delete(id)
  }

  // 批量删除分享码
  static async batchDeleteShareCodes(ids: string[]): Promise<number> {
    return ShareCodeModel.batchDelete(ids)
  }

  // 导入分享码
  static async importShareCodes(shareCodes: CreateShareCodeDTO[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const data of shareCodes) {
      try {
        await this.createShareCode(data)
        success++
      } catch (error: any) {
        failed++
        errors.push(`${data.code}: ${error.message}`)
      }
    }

    return { success, failed, errors }
  }

  // 导出分享码
  static async exportShareCodes(filter?: ShareCodeFilter): Promise<ShareCode[]> {
    const result = await ShareCodeModel.findAll(filter || {})
    return result.shareCodes
  }

  // 解析分享码metadata
  static parseMetadata(shareCode: ShareCode): Record<string, unknown> | null {
    return ShareCodeModel.parseMetadata(shareCode)
  }

  // 获取统计信息
  static async getStats() {
    return ShareCodeModel.getStats()
  }
}

export default ShareCodeService