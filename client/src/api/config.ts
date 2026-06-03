import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

/**
 * 应用配置接口 - 与后端 AppConfig 保持一致
 */
export interface AppConfig {
  // 游戏路径设置
  gamePath: string
  uids: string[]
  screenshotFolders: string[]
  customAlbumsPath: string

  // 界面设置
  language: 'zh' | 'en'
  theme: 'light' | 'dark' | 'system'
  thumbnailSize: 'small' | 'medium' | 'large'

  // AI设置
  aiEnabled: boolean
  maxConcurrentAI: number
  aiBackend: 'webgl' | 'webgpu' | 'wasm'
  aiDevice: 'cpu' | 'cuda' | 'dml' | 'auto'
  autoProcessNewImages: boolean

  // 扫描设置
  autoScan: boolean
  scanInterval: number

  // 高级设置
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  thumbnailQuality: number
  maxUploadSize: number

  // 元数据
  _version: number
  _lastModified: string
}

/**
 * 获取完整配置
 */
export const getConfig = async (): Promise<AppConfig> => {
  const response = await api.get('/settings')
  return response.data.data || response.data
}

/**
 * 更新配置（部分更新）
 */
export const updateConfig = async (config: Partial<AppConfig>): Promise<AppConfig> => {
  const response = await api.put('/settings', config)
  return response.data.data || response.data
}

/**
 * 重置为默认配置
 */
export const resetConfig = async (): Promise<AppConfig> => {
  const response = await api.post('/settings/reset')
  return response.data.data || response.data
}

/**
 * 获取原始JSON配置（供手动编辑参考）
 */
export const getRawConfig = async (): Promise<{ path: string; content: string }> => {
  const response = await api.get('/settings/raw')
  return response.data.data || response.data
}

/**
 * 从JSON字符串导入配置
 */
export const importConfig = async (json: string): Promise<AppConfig> => {
  const response = await api.post('/settings/import', { json })
  return response.data.data || response.data
}

/**
 * 自动检测游戏路径
 */
export const detectGamePath = async (): Promise<any> => {
  const response = await api.get('/settings/detect-game-path')
  return response.data
}

/**
 * 获取指定路径的截图文件夹
 */
export const getScreenshotFolders = async (path: string): Promise<any[]> => {
  const response = await api.get(`/settings/screenshot-folders?path=${encodeURIComponent(path)}`)
  return response.data.data || []
}

/**
 * 保存游戏路径和截图文件夹选择
 */
export const saveGamePath = async (gamePath: string, screenshotFolders: string[]): Promise<AppConfig> => {
  const response = await api.post('/settings/save-game-path', { gamePath, screenshotFolders })
  return response.data.data || response.data
}

/**
 * 游戏启动选项接口
 */
export interface LaunchOption {
  name: string
  path: string
  type: 'exe' | 'steam' | 'epic' | 'custom'
  platform?: string
}

/**
 * 路径验证结果接口
 */
export interface PathValidation {
  valid: boolean
  exists: boolean
  hasExe: boolean
  exePath?: string
  hasScreenshotFolders: boolean
  screenshotFolders: string[]
  diskSpace?: {
    free: number
    total: number
  }
  error?: string
}

/**
 * 获取当前游戏路径的所有可用启动选项
 */
export const getLaunchOptions = async (): Promise<LaunchOption[]> => {
  const response = await api.get('/settings/launch-options')
  return response.data.data || []
}

/**
 * 启动游戏
 */
export const launchGame = async (launchOption: LaunchOption, args?: string[]): Promise<{ success: boolean; pid?: number; error?: string }> => {
  const response = await api.post('/settings/launch-game', { launchOption, args })
  return response.data
}

/**
 * 验证游戏路径是否有效
 */
export const validateGamePath = async (gamePath: string): Promise<PathValidation> => {
  const response = await api.post('/settings/validate-game-path', { gamePath })
  return response.data.data
}

/**
 * AI设备信息
 */
export interface AIDeviceInfo {
  device: 'cpu' | 'cuda' | 'dml' | 'auto'
  providers: string[]
  currentProvider: string
  aiServiceOffline?: boolean
}

/**
 * 获取AI设备信息
 */
export const getAIDeviceInfo = async (): Promise<AIDeviceInfo> => {
  const response = await api.get('/ai/device-info')
  return response.data.data
}

/**
 * 切换AI设备
 */
export const setAIDevice = async (device: 'cpu' | 'cuda' | 'dml' | 'auto'): Promise<any> => {
  const response = await api.post('/ai/set-device', { device })
  return response.data.data
}
