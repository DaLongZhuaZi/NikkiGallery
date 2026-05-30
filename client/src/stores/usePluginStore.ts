import { create } from 'zustand'
import {
  PluginInfo,
  getAllPlugins,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
  updatePluginConfig
} from '../api/plugins'

interface PluginState {
  // 插件列表
  plugins: PluginInfo[]

  // 加载状态
  isLoading: boolean
  error: string | null

  // 操作
  loadPlugins: () => Promise<void>
  installNewPlugin: (manifestPath: string) => Promise<boolean>
  uninstallExistingPlugin: (uuid: string) => Promise<boolean>
  togglePluginStatus: (uuid: string, enabled: boolean) => Promise<boolean>
  updatePluginSettings: (uuid: string, config: Record<string, any>) => Promise<boolean>
  clearError: () => void
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  isLoading: false,
  error: null,

  loadPlugins: async () => {
    set({ isLoading: true, error: null })
    try {
      const plugins = await getAllPlugins()
      set({ plugins, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载插件列表失败',
        isLoading: false
      })
    }
  },

  installNewPlugin: async (manifestPath: string) => {
    set({ error: null })
    try {
      await installPlugin(manifestPath)
      await get().loadPlugins()
      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '安装插件失败'
      })
      return false
    }
  },

  uninstallExistingPlugin: async (uuid: string) => {
    set({ error: null })
    try {
      await uninstallPlugin(uuid)
      await get().loadPlugins()
      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '卸载插件失败'
      })
      return false
    }
  },

  togglePluginStatus: async (uuid: string, enabled: boolean) => {
    set({ error: null })
    try {
      await togglePlugin(uuid, enabled)
      await get().loadPlugins()
      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '切换插件状态失败'
      })
      return false
    }
  },

  updatePluginSettings: async (uuid: string, config: Record<string, any>) => {
    set({ error: null })
    try {
      await updatePluginConfig(uuid, config)
      await get().loadPlugins()
      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新插件配置失败'
      })
      return false
    }
  },

  clearError: () => set({ error: null })
}))

export type { PluginInfo }
