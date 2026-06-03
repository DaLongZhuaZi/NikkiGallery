import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import logger from '../utils/logger'
import { Nuan5JsonCodec } from './Nuan5JsonCodec'
import configService from './ConfigService'

/**
 * 游戏图像解密服务
 *
 * 无限暖暖游戏截图加密方案：
 * - 算法: AES-256-ECB (无IV, 无填充)
 * - 密钥派生: SHA1(UTF-16LE(UID)) + "_PAPER_GAMES"
 * - 文件格式: JPEG数据 + 0xFFD9 + Base64编码的加密数据
 */

import koffi from 'koffi'

// ============================================================
// Koffi DLL 绑定
// ============================================================
const MediaKey = koffi.pointer('MediaKey', koffi.opaque())

const MediaDecryptionResult = koffi.struct('MediaDecryptionResult', {
  status: 'uint32_t',
  data: 'uint8_t*',
  len: 'size_t'
})

let dllLib: any = null
try {
  // DLL路径可能根据开发/生产环境有所不同
  const dllPath = path.join(process.cwd(), 'lib', 'nuan5_decryption.dll')
  if (fs.existsSync(dllPath)) {
    dllLib = koffi.load(dllPath)
  } else {
    // 尝试在上一级目录找
    const dllPath2 = path.join(__dirname, '..', '..', 'lib', 'nuan5_decryption.dll')
    if (fs.existsSync(dllPath2)) {
      dllLib = koffi.load(dllPath2)
    } else {
      logger.warn('nuan5_decryption.dll not found!')
    }
  }
} catch (e) {
  logger.error('Failed to load nuan5_decryption.dll:', e)
}

let media_key_from_str: any
let media_key_camera_param: any
let media_decrypt: any
let free_media_key: any
let free_media_decryption_result: any
let media_decode_file_unchecked: any

if (dllLib) {
  media_key_from_str = dllLib.func('media_key_from_str', MediaKey, ['str'])
  media_key_camera_param = dllLib.func('media_key_camera_param', MediaKey, [])
  media_decrypt = dllLib.func('media_decrypt', MediaDecryptionResult, ['const uint8_t*', 'size_t', MediaKey])
  free_media_key = dllLib.func('free_media_key', 'void', [MediaKey])
  free_media_decryption_result = dllLib.func('free_media_decryption_result', 'void', [MediaDecryptionResult])
  media_decode_file_unchecked = dllLib.func('media_decode_file_unchecked', MediaDecryptionResult, ['const uint8_t*', 'size_t', 'str', MediaKey])
}

export interface DecryptedData {
  /** 原始JPEG图片数据（不含加密元数据） */
  imageData: Buffer
  /** 解密后的元数据JSON */
  metadata: any | null
  /** 是否包含加密数据 */
  hasEncryptedData: boolean
}

export class ImageDecryptService {
  /** JPEG EOI标记 */
  private static readonly JPEG_EOI = Buffer.from([0xFF, 0xD9])

  /**
   * 检测JPEG文件是否包含加密数据
   * @param filePath 文件路径
   * @returns 是否包含加密数据
   */
  static hasEncryptedData(filePath: string): boolean {
    try {
      const buffer = fs.readFileSync(filePath)
      const eoiIndex = buffer.indexOf(this.JPEG_EOI)
      if (eoiIndex === -1) return false
      return buffer.length > eoiIndex + 2
    } catch (error) {
      return false
    }
  }

  /**
   * 智能匹配文件路径中的 UID 或尝试系统配置的所有 UID
   */
  static findPossibleUids(filePath: string, gamePath?: string): string[] {
    const uids = new Set<string>()

    // 1. 尝试从文件路径中提取全数字的 UID（例如 .../100045859/...）
    const pathParts = filePath.replace(/\\/g, '/').split('/')
    for (const part of pathParts) {
      if (/^\d{6,15}$/.test(part)) {
        uids.add(part)
      }
    }

    // 2. 尝试系统配置的 UIDs
    const configuredUids = configService.get('uids') as string[] | undefined
    if (configuredUids && configuredUids.length > 0) {
      for (const uid of configuredUids) {
        if (uid && uid.trim()) {
           uids.add(uid.trim())
        }
      }
    }

    return Array.from(uids)
  }

  /**
   * 解密游戏图像文件
   * @param filePath 图像文件路径
   * @param preferredUid 用户UID（可选，如果传入则优先尝试，否则使用智能推断）
   * @returns 解密后的数据
   */
  static async decryptImage(filePath: string, preferredUid?: string): Promise<DecryptedData> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const buffer = fs.readFileSync(filePath)
      const eoiIndex = buffer.indexOf(this.JPEG_EOI)
      if (eoiIndex === -1) {
        return { imageData: buffer, metadata: null, hasEncryptedData: false }
      }

      const imageData = buffer.subarray(0, eoiIndex + 2)
      let metadata: any = null
      let hasEncryptedData = buffer.length > eoiIndex + 2

      if (hasEncryptedData && dllLib) {
        const candidateUids = preferredUid ? [preferredUid, ...this.findPossibleUids(filePath)] : this.findPossibleUids(filePath)
        // 去重
        const uniqueUids = Array.from(new Set(candidateUids))

        for (const uidToTry of uniqueUids) {
          if (!uidToTry) continue

          try {
            const key = media_key_from_str(uidToTry)
            if (key) {
              const flag = Buffer.from([0xFF, 0xD9])
              const result = media_decode_file_unchecked(flag, 2, filePath, key)
              
              if (result.status === 0 && result.data && result.len > 0) {
                const decryptedBuffer = koffi.decode(result.data, 'uint8_t', result.len) as Buffer
                const jsonText = Buffer.from(decryptedBuffer).toString('utf-8').trim()
                // 尝试解析，如果成功则跳出循环
                try {
                  metadata = this.parseNuan5Json(jsonText)
                  if (metadata) {
                    free_media_decryption_result(result)
                    free_media_key(key)
                    break
                  }
                } catch (e) {
                   // 解析失败说明密钥可能不对，继续尝试
                }
              }
              
              free_media_decryption_result(result)
              free_media_key(key)
            }
          } catch (decryptError) {
            // 继续下一个UID
          }
        }
      }

      return {
        imageData,
        metadata,
        hasEncryptedData,
      }
    } catch (error) {
      logger.error(`Failed to decrypt image ${filePath}:`, error)
      throw error
    }
  }

  /**
   * 解密嵌套的 CameraParams 字符串
   * @param encryptedData 加密的 Base64 字符串
   * @returns 解密后的 JSON 对象或数组
   */
  static decryptCameraParams(encryptedData: string): any | null {
    if (!dllLib || !media_key_camera_param || !media_decrypt) return null

    try {
      const key = media_key_camera_param()
      if (key) {
        const buffer = Buffer.from(encryptedData)
        const result = media_decrypt(buffer, buffer.length, key)

        let metadata = null
        if (result.status === 0 && result.data && result.len > 0) {
          const decryptedBuffer = koffi.decode(result.data, 'uint8_t', result.len) as Buffer
          const jsonText = Buffer.from(decryptedBuffer).toString('utf-8').trim()
          
          // 提取 JSON 对象或数组
          const startIdx = jsonText.indexOf('[') !== -1 
            ? (jsonText.indexOf('{') !== -1 ? Math.min(jsonText.indexOf('['), jsonText.indexOf('{')) : jsonText.indexOf('['))
            : jsonText.indexOf('{')
            
          if (startIdx !== -1) {
            let braceCount = 0
            let endIdx = 0
            const openChar = jsonText[startIdx]
            const closeChar = openChar === '[' ? ']' : '}'
            
            for (let i = startIdx; i < jsonText.length; i++) {
              if (jsonText[i] === openChar) braceCount++
              else if (jsonText[i] === closeChar) {
                braceCount--
                if (braceCount === 0) {
                  endIdx = i
                  break
                }
              }
            }
            
            if (endIdx !== 0) {
              const jsonStr = jsonText.substring(startIdx, endIdx + 1)
              metadata = this.parseNuan5Json(jsonStr)
            }
          }
        }
        
        free_media_decryption_result(result)
        free_media_key(key)
        return metadata
      }
    } catch (error) {
      logger.warn('Failed to decrypt camera params via DLL:', error)
    }
    return null
  }

  /**
   * 解析nuan5json格式（叠纸游戏自定义JSON变体）
   *
   * 完整实现，支持：
   * - 标准JSON对象和数组
   * - 非字符串Map键的 [:key:value] 格式
   * - 正确处理嵌套结构和转义字符
   *
   * 移植自 nikki_albums 的 GameJsonCodec
   */
  private static parseNuan5Json(text: string): any {
    try {
      const trimmed = text.trim()

      // 提取JSON对象（与 nikki_albums 的 toJson 方法逻辑一致）
      const startIdx = trimmed.indexOf('{')
      if (startIdx === -1) {
        // 可能是数组格式
        const arrStartIdx = trimmed.indexOf('[')
        if (arrStartIdx === -1) {
          logger.warn('No JSON object or array found in decrypted text')
          return { rawText: text.substring(0, 1000) }
        }

        // 匹配方括号找到结束位置
        let braceCount = 0
        let endIdx = 0
        for (let i = arrStartIdx; i < trimmed.length; i++) {
          if (trimmed[i] === '[') {
            braceCount++
          } else if (trimmed[i] === ']') {
            braceCount--
            if (braceCount === 0) {
              endIdx = i
              break
            }
          }
        }
        if (endIdx === 0) {
          logger.warn('Unmatched brackets in decrypted text')
          return { rawText: text.substring(0, 1000) }
        }

        const jsonStr = trimmed.substring(arrStartIdx, endIdx + 1)
        const decoded = Nuan5JsonCodec.decode(jsonStr)
        // 将可能的Map对象递归转换为普通对象
        return Nuan5JsonCodec.normalizeResult(decoded)
      }

      // 匹配大括号找到JSON结束位置
      let braceCount = 0
      let endIdx = 0
      for (let i = startIdx; i < trimmed.length; i++) {
        if (trimmed[i] === '{') {
          braceCount++
        } else if (trimmed[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            endIdx = i
            break
          }
        }
      }
      if (endIdx === 0) {
        logger.warn('Unmatched braces in decrypted text')
        return { rawText: text.substring(0, 1000) }
      }

      const jsonStr = trimmed.substring(startIdx, endIdx + 1)
      const decoded = Nuan5JsonCodec.decode(jsonStr)
      // 将可能的Map对象递归转换为普通对象
      return Nuan5JsonCodec.normalizeResult(decoded)
    } catch (error) {
      logger.warn('Failed to parse nuan5json, returning raw text:', error)
      return { rawText: text.substring(0, 1000) }
    }
  }

  /**
   * 批量解密图像目录
   * @param dirPath 目录路径
   * @param uid 用户UID
   * @returns 解密结果列表
   */
  static async decryptDirectory(dirPath: string, uid: string): Promise<{
    success: number
    failed: number
    results: Array<{ file: string; success: boolean; error?: string }>
  }> {
    const results: Array<{ file: string; success: boolean; error?: string }> = []
    let success = 0
    let failed = 0

    try {
      const files = fs.readdirSync(dirPath)
      const imageFiles = files.filter(f =>
        f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg')
      )

      for (const file of imageFiles) {
        const filePath = path.join(dirPath, file)
        try {
          const result = await this.decryptImage(filePath, uid)
          if (result.hasEncryptedData && result.metadata) {
            // 保存解密后的元数据
            const metaPath = filePath.replace(/\.(jpg|jpeg)$/i, '.meta.json')
            fs.writeFileSync(metaPath, JSON.stringify(result.metadata, null, 2))
            success++
            results.push({ file, success: true })
          } else {
            results.push({ file, success: true }) // 没有加密数据也算成功
          }
        } catch (error) {
          failed++
          results.push({
            file,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      logger.error(`Failed to decrypt directory ${dirPath}:`, error)
    }

    return { success, failed, results }
  }
}
