import axios from 'axios'

const api = axios.create({
  baseURL: '/api/plugins',
  timeout: 10000
})

export interface PluginInfo {
  uuid: string
  name: string
  description: string
  icon?: string
  version: number
  author?: string
  web?: string
  downloadUrl?: string
  enabled: boolean
  config?: Record<string, any>
  installedAt: string
  updatedAt: string
}

// 获取所有插件
export const getAllPlugins = async (): Promise<PluginInfo[]> => {
  const response = await api.get('/')
  return response.data
}

// 获取已启用的插件
export const getEnabledPlugins = async (): Promise<PluginInfo[]> => {
  const response = await api.get('/enabled')
  return response.data
}

// 获取单个插件
export const getPlugin = async (uuid: string): Promise<PluginInfo> => {
  const response = await api.get(`/${uuid}`)
  return response.data
}

// 安装插件
export const installPlugin = async (manifestPath: string): Promise<PluginInfo> => {
  const response = await api.post('/install', { manifestPath })
  return response.data
}

// 卸载插件
export const uninstallPlugin = async (uuid: string): Promise<void> => {
  await api.delete(`/${uuid}`)
}

// 启用/禁用插件
export const togglePlugin = async (uuid: string, enabled: boolean): Promise<void> => {
  await api.post(`/${uuid}/toggle`, { enabled })
}

// 更新插件配置
export const updatePluginConfig = async (uuid: string, config: Record<string, any>): Promise<void> => {
  await api.put(`/${uuid}/config`, { config })
}
