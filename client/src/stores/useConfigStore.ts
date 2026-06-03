import { create } from 'zustand'
import * as configApi from '@/api/config'
import type { AppConfig, LaunchOption, PathValidation } from '@/api/config'

interface ConfigStore {
  config: AppConfig
  loading: boolean
  error: string | null
  configLoaded: boolean  // 配置是否已从后端加载完成
  
  // Actions
  fetchConfig: () => Promise<void>
  updateConfig: (config: Partial<AppConfig>) => Promise<void>
  resetConfig: () => Promise<void>
  saveGamePath: (gamePath: string, screenshotFolders: string[]) => Promise<void>
  
  // Game launcher actions
  getLaunchOptions: () => Promise<LaunchOption[]>
  launchGame: (launchOption: LaunchOption, args?: string[]) => Promise<{ success: boolean; pid?: number; error?: string }>
  validateGamePath: (gamePath: string) => Promise<PathValidation>
}

const defaultConfig: AppConfig = {
  // 游戏路径
  gamePath: '',
  uids: [],
  screenshotFolders: [],
  customAlbumsPath: '',

  // 界面
  language: 'zh',
  theme: 'system',
  thumbnailSize: 'medium',

  // AI
  aiEnabled: true,
  maxConcurrentAI: 2,
  aiBackend: 'webgl',
  aiDevice: 'cpu',
  autoProcessNewImages: false,

  // 扫描
  autoScan: true,
  scanInterval: 300,

  // 高级
  logLevel: 'info',
  thumbnailQuality: 80,
  maxUploadSize: 50,

  // 元数据
  _version: 1,
  _lastModified: '',
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: defaultConfig,
  loading: false,
  error: null,
  configLoaded: false,

  /**
   * 从后端加载配置
   */
  fetchConfig: async () => {
    set({ loading: true, error: null })
    try {
      const config = await configApi.getConfig()
      set({ config, loading: false, configLoaded: true })

      // 如果配置了游戏路径且启用自动扫描，触发扫描
      if (config.gamePath && config.autoScan) {
        try {
          const { useAlbumStore } = await import('./useAlbumStore')
          await useAlbumStore.getState().scanGameAlbums()
        } catch (scanError) {
          console.warn('Auto-scan game albums failed:', scanError)
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取配置失败',
        loading: false,
        configLoaded: true
      })
    }
  },

  /**
   * 更新配置（部分更新，自动保存到后端JSON文件）
   */
  updateConfig: async (newConfig: Partial<AppConfig>) => {
    set({ loading: true, error: null })
    try {
      const config = await configApi.updateConfig(newConfig)
      set({ config, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新配置失败',
        loading: false 
      })
      throw error
    }
  },

  /**
   * 重置为默认配置
   */
  resetConfig: async () => {
    set({ loading: true, error: null })
    try {
      const config = await configApi.resetConfig()
      set({ config, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '重置配置失败',
        loading: false 
      })
      throw error
    }
  },

  /**
   * 保存游戏路径和截图文件夹
   */
  saveGamePath: async (gamePath: string, screenshotFolders: string[]) => {
    set({ loading: true, error: null })
    try {
      const config = await configApi.saveGamePath(gamePath, screenshotFolders)
      set({ config, loading: false })

      // 保存游戏路径后，自动触发扫描游戏相册
      if (gamePath) {
        try {
          const { useAlbumStore } = await import('./useAlbumStore')
          await useAlbumStore.getState().scanGameAlbums()
        } catch (scanError) {
          // 扫描失败不阻塞保存流程，静默处理
          console.warn('Auto-scan game albums failed:', scanError)
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '保存游戏路径失败',
        loading: false
      })
      throw error
    }
  },

  /**
   * 获取可用的游戏启动选项
   */
  getLaunchOptions: async () => {
    try {
      return await configApi.getLaunchOptions()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取启动选项失败' })
      throw error
    }
  },

  /**
   * 启动游戏
   */
  launchGame: async (launchOption: LaunchOption, args?: string[]) => {
    try {
      return await configApi.launchGame(launchOption, args)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '启动游戏失败' })
      throw error
    }
  },

  /**
   * 验证游戏路径
   */
  validateGamePath: async (gamePath: string) => {
    try {
      return await configApi.validateGamePath(gamePath)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '验证游戏路径失败' })
      throw error
    }
  },
}))
