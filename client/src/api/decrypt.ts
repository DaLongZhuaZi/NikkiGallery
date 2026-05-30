import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 解密可能需要更长时间
})

export interface DecryptCheckResult {
  imageId: string
  hasEncryptedData: boolean
  filename: string
}

export interface DecryptImageResult {
  imageId: string
  hasEncryptedData: boolean
  metadata: any | null
}

export interface BatchDecryptResult {
  total: number
  success: number
  failed: number
  results: Array<{
    imageId: string
    success: boolean
    hasEncryptedData?: boolean
    hasMetadata?: boolean
    error?: string
  }>
}

export interface UidResult {
  uid: string | null
  gamePath: string
}

export const decryptApi = {
  /** 检查图片是否包含加密数据 */
  checkEncrypted: async (imageId: string): Promise<DecryptCheckResult> => {
    const response = await api.get(`/decrypt/check/${imageId}`)
    return response.data.data
  },

  /** 解密单张图片 */
  decryptImage: async (imageId: string, uid?: string): Promise<DecryptImageResult> => {
    const response = await api.post(`/decrypt/image/${imageId}`, { uid })
    return response.data.data
  },

  /** 批量解密图片 */
  batchDecrypt: async (imageIds: string[], uid?: string): Promise<BatchDecryptResult> => {
    const response = await api.post('/decrypt/batch', { imageIds, uid })
    return response.data.data
  },

  /** 尝试从游戏目录查找用户UID */
  findUid: async (): Promise<UidResult> => {
    const response = await api.get('/decrypt/uid')
    return response.data.data
  },
}
