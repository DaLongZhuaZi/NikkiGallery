import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

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
  // 新增字段：语言包、图标、游戏配置、主题
  langPathList?: Record<string, string>    // 语言代码 -> 文件路径
  iconPathList?: Record<string, string>    // 图标名 -> 文件路径
  gameConfigList?: any[]                   // 游戏配置列表
  themeList?: any[]                        // 主题列表
}

export interface PluginManifest {
  uuid: string
  name: string
  description: string
  icon?: string
  version: number
  author?: string
  web?: string
  downloadUrl?: string
  minAppVersion?: number
  main?: string
  config?: Record<string, any>
}

class PluginService {
  private pluginsDir: string
  private configPath: string
  private plugins: Map<string, PluginInfo> = new Map()

  constructor() {
    this.pluginsDir = path.join(process.cwd(), 'data', 'plugins')
    this.configPath = path.join(process.cwd(), 'data', 'plugins.json')
    this.ensureDirectories()
    this.loadPlugins()
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true })
    }
  }

  private loadPlugins() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        const plugins: PluginInfo[] = JSON.parse(data)
        for (const plugin of plugins) {
          // 重新扫描插件资源，确保资源信息是最新的
          const pluginDir = path.join(this.pluginsDir, plugin.uuid)
          if (fs.existsSync(pluginDir)) {
            const resources = this.scanPluginResources(pluginDir)
            plugin.langPathList = resources.langPathList
            plugin.iconPathList = resources.iconPathList
            plugin.gameConfigList = resources.gameConfigList
            plugin.themeList = resources.themeList
          }
          this.plugins.set(plugin.uuid, plugin)
        }
      }
    } catch (error) {
      console.error('加载插件配置失败:', error)
    }
  }

  private savePlugins() {
    try {
      const plugins = Array.from(this.plugins.values())
      fs.writeFileSync(this.configPath, JSON.stringify(plugins, null, 2), 'utf-8')
    } catch (error) {
      console.error('保存插件配置失败:', error)
    }
  }

  // 获取所有插件
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values())
  }

  // 获取已启用的插件
  getEnabledPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).filter(p => this.isPluginEffectivelyEnabled(p.uuid))
  }

  // 获取单个插件
  getPlugin(uuid: string): PluginInfo | undefined {
    return this.plugins.get(uuid)
  }

  // 安装插件
  async installPlugin(manifestPath: string): Promise<{ success: boolean; plugin?: PluginInfo; error?: string }> {
    try {
      // 读取插件清单
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: '插件清单文件不存在' }
      }

      const manifestData = fs.readFileSync(manifestPath, 'utf-8')
      const manifest: PluginManifest = JSON.parse(manifestData)

      // 验证必填字段
      if (!manifest.uuid || !manifest.name || !manifest.version) {
        return { success: false, error: '插件清单缺少必填字段 (uuid, name, version)' }
      }

      // 检查是否已安装
      if (this.plugins.has(manifest.uuid)) {
        return { success: false, error: '插件已存在' }
      }

      // 创建插件目录
      const pluginDir = path.join(this.pluginsDir, manifest.uuid)
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true })
      }

      // 复制插件文件
      const manifestDir = path.dirname(manifestPath)
      this.copyDirectory(manifestDir, pluginDir)

      // 扫描插件资源
      const resources = this.scanPluginResources(pluginDir)

      // 检查是否存在disable.txt文件
      const disableFile = path.join(pluginDir, 'disable.txt')
      const hasDisableFile = fs.existsSync(disableFile)

      // 创建插件信息
      const plugin: PluginInfo = {
        uuid: manifest.uuid,
        name: manifest.name,
        description: manifest.description,
        icon: manifest.icon,
        version: manifest.version,
        author: manifest.author,
        web: manifest.web,
        downloadUrl: manifest.downloadUrl,
        enabled: !hasDisableFile, // 如果存在disable.txt文件，则默认禁用
        config: manifest.config,
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        langPathList: resources.langPathList,
        iconPathList: resources.iconPathList,
        gameConfigList: resources.gameConfigList,
        themeList: resources.themeList
      }

      this.plugins.set(plugin.uuid, plugin)
      this.savePlugins()

      return { success: true, plugin }
    } catch (error) {
      console.error('安装插件失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '安装失败' }
    }
  }

  // 卸载插件
  async uninstallPlugin(uuid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }

      // 删除插件目录
      const pluginDir = path.join(this.pluginsDir, uuid)
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }

      this.plugins.delete(uuid)
      this.savePlugins()

      return { success: true }
    } catch (error) {
      console.error('卸载插件失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '卸载失败' }
    }
  }

  // 启用/禁用插件
  async togglePlugin(uuid: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }

      // 更新配置中的enabled字段
      plugin.enabled = enabled
      plugin.updatedAt = new Date().toISOString()
      
      // 同时更新disable.txt文件
      if (enabled) {
        await this.enablePluginByFile(uuid)
      } else {
        await this.disablePluginByFile(uuid)
      }
      
      this.savePlugins()

      return { success: true }
    } catch (error) {
      console.error('切换插件状态失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  // 更新插件配置
  async updatePluginConfig(uuid: string, config: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }

      plugin.config = { ...plugin.config, ...config }
      plugin.updatedAt = new Date().toISOString()
      this.savePlugins()

      return { success: true }
    } catch (error) {
      console.error('更新插件配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '更新失败' }
    }
  }

  // 获取插件目录路径
  getPluginDir(uuid: string): string {
    return path.join(this.pluginsDir, uuid)
  }

  // 获取插件的完整信息（包括资源统计）
  getPluginDetails(uuid: string): {
    plugin: PluginInfo | undefined
    resourceStats: {
      langCount: number
      iconCount: number
      gameConfigCount: number
      themeCount: number
    }
    isEffectivelyEnabled: boolean
  } {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return {
        plugin: undefined,
        resourceStats: { langCount: 0, iconCount: 0, gameConfigCount: 0, themeCount: 0 },
        isEffectivelyEnabled: false
      }
    }

    return {
      plugin,
      resourceStats: {
        langCount: plugin.langPathList ? Object.keys(plugin.langPathList).length : 0,
        iconCount: plugin.iconPathList ? Object.keys(plugin.iconPathList).length : 0,
        gameConfigCount: plugin.gameConfigList ? plugin.gameConfigList.length : 0,
        themeCount: plugin.themeList ? plugin.themeList.length : 0
      },
      isEffectivelyEnabled: this.isPluginEffectivelyEnabled(uuid)
    }
  }

  // 重新加载插件的资源（语言包、图标、游戏配置、主题）
  async reloadPluginResources(uuid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }

      const pluginDir = path.join(this.pluginsDir, uuid)
      if (!fs.existsSync(pluginDir)) {
        return { success: false, error: '插件目录不存在' }
      }

      // 重新扫描资源
      const resources = this.scanPluginResources(pluginDir)

      // 更新插件信息
      plugin.langPathList = resources.langPathList
      plugin.iconPathList = resources.iconPathList
      plugin.gameConfigList = resources.gameConfigList
      plugin.themeList = resources.themeList
      plugin.updatedAt = new Date().toISOString()

      this.savePlugins()

      return { success: true }
    } catch (error) {
      console.error('重新加载插件资源失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '重新加载失败' }
    }
  }

  // 获取插件的语言包内容
  async getPluginLanguage(uuid: string, langCode: string): Promise<Record<string, any> | null> {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin || !plugin.langPathList) {
        return null
      }

      const langPath = plugin.langPathList[langCode]
      if (!langPath || !fs.existsSync(langPath)) {
        return null
      }

      const langData = fs.readFileSync(langPath, 'utf-8')
      return JSON.parse(langData)
    } catch (error) {
      console.error(`获取插件语言包失败 ${uuid} ${langCode}:`, error)
      return null
    }
  }

  // 获取插件的游戏配置
  getPluginGameConfigs(uuid: string): any[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin || !plugin.gameConfigList) {
      return []
    }
    return plugin.gameConfigList
  }

  // 获取插件的图标路径
  getPluginIconPath(uuid: string, iconName: string): string | null {
    const plugin = this.plugins.get(uuid)
    if (!plugin || !plugin.iconPathList) {
      return null
    }
    return plugin.iconPathList[iconName] || null
  }

  // 获取插件支持的语言代码列表
  getPluginSupportedLanguages(uuid: string): string[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin || !plugin.langPathList) {
      return []
    }
    return Object.keys(plugin.langPathList)
  }

  // 获取插件的所有图标名称
  getPluginIconNames(uuid: string): string[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin || !plugin.iconPathList) {
      return []
    }
    return Object.keys(plugin.iconPathList)
  }

  // 获取所有插件的语言包统计
  getPluginsLanguageStats(): Record<string, { total: number; plugins: string[] }> {
    const stats: Record<string, { total: number; plugins: string[] }> = {}
    
    for (const plugin of this.plugins.values()) {
      if (plugin.langPathList) {
        for (const langCode of Object.keys(plugin.langPathList)) {
          if (!stats[langCode]) {
            stats[langCode] = { total: 0, plugins: [] }
          }
          stats[langCode].total++
          stats[langCode].plugins.push(plugin.uuid)
        }
      }
    }
    
    return stats
  }

  // 获取所有已启用插件的游戏配置
  getAllEnabledPluginsGameConfigs(): any[] {
    const configs: any[] = []
    
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.gameConfigList) {
        configs.push(...plugin.gameConfigList)
      }
    }
    
    return configs
  }

  // 获取所有已启用插件的图标路径映射
  getAllEnabledPluginsIconPaths(): Record<string, string> {
    const iconPaths: Record<string, string> = {}
    
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.iconPathList) {
        // 合并图标路径，插件UUID作为前缀避免冲突
        for (const [iconName, iconPath] of Object.entries(plugin.iconPathList)) {
          const prefixedName = `${plugin.uuid}/${iconName}`
          iconPaths[prefixedName] = iconPath
        }
      }
    }
    
    return iconPaths
  }

  // 获取所有已启用插件的主题列表
  getAllEnabledPluginsThemes(): any[] {
    const themes: any[] = []
    
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.themeList) {
        themes.push(...plugin.themeList)
      }
    }
    
    return themes
  }

  // 获取插件的语言包内容（支持默认语言回退）
  async getPluginLanguageWithFallback(uuid: string, langCode: string, defaultLangCode: string = 'en-US'): Promise<Record<string, any> | null> {
    // 首先尝试请求的语言
    const langData = await this.getPluginLanguage(uuid, langCode)
    if (langData) {
      return langData
    }
    
    // 如果请求的语言不存在，尝试默认语言
    if (langCode !== defaultLangCode) {
      const defaultLangData = await this.getPluginLanguage(uuid, defaultLangCode)
      if (defaultLangData) {
        return defaultLangData
      }
    }
    
    // 如果都没有，返回null
    return null
  }

  // 获取插件的资源文件内容
  async getPluginResource(uuid: string, resourcePath: string): Promise<string | null> {
    try {
      const pluginDir = path.join(this.pluginsDir, uuid)
      const fullPath = path.join(pluginDir, resourcePath)
      
      // 安全检查：确保路径在插件目录内
      if (!fullPath.startsWith(pluginDir)) {
        console.error('资源路径越界:', resourcePath)
        return null
      }
      
      if (!fs.existsSync(fullPath)) {
        return null
      }
      
      return fs.readFileSync(fullPath, 'utf-8')
    } catch (error) {
      console.error(`获取插件资源失败 ${uuid} ${resourcePath}:`, error)
      return null
    }
  }

  // 获取插件的二进制资源文件（如图标）
  async getPluginBinaryResource(uuid: string, resourcePath: string): Promise<Buffer | null> {
    try {
      const pluginDir = path.join(this.pluginsDir, uuid)
      const fullPath = path.join(pluginDir, resourcePath)
      
      // 安全检查：确保路径在插件目录内
      if (!fullPath.startsWith(pluginDir)) {
        console.error('资源路径越界:', resourcePath)
        return null
      }
      
      if (!fs.existsSync(fullPath)) {
        return null
      }
      
      return fs.readFileSync(fullPath)
    } catch (error) {
      console.error(`获取插件二进制资源失败 ${uuid} ${resourcePath}:`, error)
      return null
    }
  }

  // 验证插件清单文件
  validatePluginManifest(manifestPath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    try {
      if (!fs.existsSync(manifestPath)) {
        return { valid: false, errors: ['清单文件不存在'] }
      }
      
      const manifestData = fs.readFileSync(manifestPath, 'utf-8')
      const manifest: PluginManifest = JSON.parse(manifestData)
      
      // 检查必填字段
      if (!manifest.uuid) {
        errors.push('缺少uuid字段')
      } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(manifest.uuid)) {
        errors.push('uuid格式无效')
      }
      
      if (!manifest.name) {
        errors.push('缺少name字段')
      }
      
      if (!manifest.version) {
        errors.push('缺少version字段')
      } else if (typeof manifest.version !== 'number' || manifest.version < 1) {
        errors.push('version必须是正整数')
      }
      
      // 检查可选字段类型
      if (manifest.icon && typeof manifest.icon !== 'string') {
        errors.push('icon必须是字符串')
      }
      
      if (manifest.author && typeof manifest.author !== 'string') {
        errors.push('author必须是字符串')
      }
      
      if (manifest.web && typeof manifest.web !== 'string') {
        errors.push('web必须是字符串')
      }
      
      if (manifest.downloadUrl && typeof manifest.downloadUrl !== 'string') {
        errors.push('downloadUrl必须是字符串')
      }
      
      if (manifest.minAppVersion && typeof manifest.minAppVersion !== 'number') {
        errors.push('minAppVersion必须是数字')
      }
      
      if (manifest.main && typeof manifest.main !== 'string') {
        errors.push('main必须是字符串')
      }
      
      if (manifest.config && typeof manifest.config !== 'object') {
        errors.push('config必须是对象')
      }
      
      return { valid: errors.length === 0, errors }
    } catch (error) {
      return { valid: false, errors: [`解析清单文件失败: ${error instanceof Error ? error.message : '未知错误'}`] }
    }
  }

  // 获取插件目录大小
  async getPluginSize(uuid: string): Promise<number> {
    try {
      const pluginDir = path.join(this.pluginsDir, uuid)
      if (!fs.existsSync(pluginDir)) {
        return 0
      }
      
      let totalSize = 0
      
      const calculateSize = (dirPath: string) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name)
          if (entry.isDirectory()) {
            calculateSize(fullPath)
          } else {
            const stats = fs.statSync(fullPath)
            totalSize += stats.size
          }
        }
      }
      
      calculateSize(pluginDir)
      return totalSize
    } catch (error) {
      console.error(`获取插件大小失败 ${uuid}:`, error)
      return 0
    }
  }

  // 获取所有插件的大小统计
  async getAllPluginsSizeStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {}
    
    for (const plugin of this.plugins.values()) {
      stats[plugin.uuid] = await this.getPluginSize(plugin.uuid)
    }
    
    return stats
  }

  // 清理未使用的插件资源（删除未安装插件的目录）
  async cleanupUnusedPluginDirectories(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = []
    let cleaned = 0
    
    try {
      if (!fs.existsSync(this.pluginsDir)) {
        return { cleaned: 0, errors: [] }
      }
      
      const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      const installedUuids = new Set(this.plugins.keys())
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        
        const dirName = entry.name
        // 检查是否是UUID格式
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dirName)) {
          continue
        }
        
        // 如果目录对应的插件未安装，则删除目录
        if (!installedUuids.has(dirName)) {
          try {
            const dirPath = path.join(this.pluginsDir, dirName)
            fs.rmSync(dirPath, { recursive: true, force: true })
            cleaned++
          } catch (error) {
            errors.push(`清理目录 ${dirName} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
          }
        }
      }
    } catch (error) {
      errors.push(`清理过程失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
    
    return { cleaned, errors }
  }

  // 备份插件配置
  async backupPluginConfig(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return { success: false, error: '插件配置文件不存在' }
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf-8')
      fs.writeFileSync(backupPath, configData, 'utf-8')
      
      return { success: true }
    } catch (error) {
      console.error('备份插件配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '备份失败' }
    }
  }

  // 恢复插件配置
  async restorePluginConfig(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: '备份文件不存在' }
      }
      
      const backupData = fs.readFileSync(backupPath, 'utf-8')
      const backupPlugins: PluginInfo[] = JSON.parse(backupData)
      
      // 验证备份数据格式
      if (!Array.isArray(backupPlugins)) {
        return { success: false, error: '备份文件格式无效' }
      }
      
      // 恢复配置
      this.plugins.clear()
      for (const plugin of backupPlugins) {
        this.plugins.set(plugin.uuid, plugin)
      }
      
      this.savePlugins()
      
      return { success: true }
    } catch (error) {
      console.error('恢复插件配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '恢复失败' }
    }
  }

  // 获取插件的依赖关系（从pluginList字段解析）
  getPluginDependencies(uuid: string): string[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return []
    }
    
    // 从配置中获取pluginList字段（如果存在）
    const pluginList = (plugin as any).pluginList
    if (!pluginList || typeof pluginList !== 'string') {
      return []
    }
    
    // 解析依赖列表（假设是逗号分隔的UUID列表）
    return pluginList.split(',').map((dep: string) => dep.trim()).filter((dep: string) => dep.length > 0)
  }

  // 检查插件依赖是否满足
  checkPluginDependencies(uuid: string): { satisfied: boolean; missing: string[] } {
    const dependencies = this.getPluginDependencies(uuid)
    const missing: string[] = []
    
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        missing.push(dep)
      }
    }
    
    return {
      satisfied: missing.length === 0,
      missing
    }
  }

  // 获取插件的扩展信息（asExtensionOf字段）
  getPluginExtensionOf(uuid: string): string | null {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return null
    }
    
    // 从配置中获取asExtensionOf字段（如果存在）
    return (plugin as any).asExtensionOf || null
  }

  // 获取某个插件的所有扩展插件
  getPluginExtensions(uuid: string): PluginInfo[] {
    const extensions: PluginInfo[] = []
    
    for (const plugin of this.plugins.values()) {
      const extensionOf = this.getPluginExtensionOf(plugin.uuid)
      if (extensionOf === uuid) {
        extensions.push(plugin)
      }
    }
    
    return extensions
  }

  // 获取插件的平台支持信息
  getPluginPlatforms(uuid: string): string[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return []
    }
    
    // 从配置中获取platforms字段（如果存在）
    const platforms = (plugin as any).platforms
    if (!platforms || !Array.isArray(platforms)) {
      return []
    }
    
    return platforms
  }

  // 检查插件是否支持当前平台
  isPluginSupportedOnCurrentPlatform(uuid: string): boolean {
    const platforms = this.getPluginPlatforms(uuid)
    if (platforms.length === 0) {
      // 如果没有指定平台，则假设支持所有平台
      return true
    }
    
    const currentPlatform = process.platform
    return platforms.includes(currentPlatform)
  }

  // 获取插件的配置模式（config schema）
  getPluginConfigSchema(uuid: string): any | null {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return null
    }
    
    // 从配置中获取configSchema字段（如果存在）
    return (plugin as any).configSchema || null
  }

  // 获取插件的默认配置
  getPluginDefaultConfig(uuid: string): Record<string, any> {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return {}
    }
    
    // 从配置中获取defaultConfig字段（如果存在）
    return (plugin as any).defaultConfig || {}
  }

  // 获取插件的权限信息
  getPluginPermissions(uuid: string): string[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return []
    }
    
    // 从配置中获取permissions字段（如果存在）
    const permissions = (plugin as any).permissions
    if (!permissions || !Array.isArray(permissions)) {
      return []
    }
    
    return permissions
  }

  // 检查插件是否请求了特定权限
  hasPluginPermission(uuid: string, permission: string): boolean {
    const permissions = this.getPluginPermissions(uuid)
    return permissions.includes(permission)
  }

  // 获取插件的更新信息
  getPluginUpdateInfo(uuid: string): { hasUpdate: boolean; latestVersion?: number; downloadUrl?: string } {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return { hasUpdate: false }
    }
    
    // 从配置中获取updateInfo字段（如果存在）
    const updateInfo = (plugin as any).updateInfo
    if (!updateInfo) {
      return { hasUpdate: false }
    }
    
    return {
      hasUpdate: updateInfo.hasUpdate || false,
      latestVersion: updateInfo.latestVersion,
      downloadUrl: updateInfo.downloadUrl
    }
  }

  // 设置插件的更新信息
  setPluginUpdateInfo(uuid: string, updateInfo: { hasUpdate: boolean; latestVersion?: number; downloadUrl?: string }): { success: boolean; error?: string } {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }
      
      (plugin as any).updateInfo = updateInfo
      plugin.updatedAt = new Date().toISOString()
      this.savePlugins()
      
      return { success: true }
    } catch (error) {
      console.error('设置插件更新信息失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  // 获取插件的统计信息
  getPluginStats(): {
    total: number
    enabled: number
    disabled: number
    withLangs: number
    withIcons: number
    withGameConfigs: number
    withThemes: number
  } {
    const plugins = Array.from(this.plugins.values())
    
    return {
      total: plugins.length,
      enabled: plugins.filter(p => this.isPluginEffectivelyEnabled(p.uuid)).length,
      disabled: plugins.filter(p => !this.isPluginEffectivelyEnabled(p.uuid)).length,
      withLangs: plugins.filter(p => p.langPathList && Object.keys(p.langPathList).length > 0).length,
      withIcons: plugins.filter(p => p.iconPathList && Object.keys(p.iconPathList).length > 0).length,
      withGameConfigs: plugins.filter(p => p.gameConfigList && p.gameConfigList.length > 0).length,
      withThemes: plugins.filter(p => p.themeList && p.themeList.length > 0).length
    }
  }

  // 获取插件的元数据（用于API响应）
  getPluginMetadata(uuid: string): any {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return null
    }
    
    return {
      uuid: plugin.uuid,
      name: plugin.name,
      description: plugin.description,
      icon: plugin.icon,
      version: plugin.version,
      author: plugin.author,
      web: plugin.web,
      enabled: this.isPluginEffectivelyEnabled(plugin.uuid),
      installedAt: plugin.installedAt,
      updatedAt: plugin.updatedAt,
      resourceStats: {
        langCount: plugin.langPathList ? Object.keys(plugin.langPathList).length : 0,
        iconCount: plugin.iconPathList ? Object.keys(plugin.iconPathList).length : 0,
        gameConfigCount: plugin.gameConfigList ? plugin.gameConfigList.length : 0,
        themeCount: plugin.themeList ? plugin.themeList.length : 0
      }
    }
  }

  // 获取所有插件的元数据
  getAllPluginsMetadata(): any[] {
    return Array.from(this.plugins.values()).map(plugin => this.getPluginMetadata(plugin.uuid))
  }

  // 获取插件的资源文件列表
  getPluginResourceFiles(uuid: string): { langFiles: string[]; iconFiles: string[]; gameConfigFiles: string[]; themeFiles: string[] } {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return { langFiles: [], iconFiles: [], gameConfigFiles: [], themeFiles: [] }
    }
    
    return {
      langFiles: plugin.langPathList ? Object.keys(plugin.langPathList) : [],
      iconFiles: plugin.iconPathList ? Object.keys(plugin.iconPathList) : [],
      gameConfigFiles: plugin.gameConfigList ? plugin.gameConfigList.map((_, index) => `config_${index}.json`) : [],
      themeFiles: plugin.themeList ? plugin.themeList.map((_, index) => `theme_${index}.json`) : []
    }
  }

  // 获取插件的配置信息（用于配置界面）
  getPluginConfigInfo(uuid: string): { config: Record<string, any> | undefined; configSchema: any | null; defaultConfig: Record<string, any> } {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return { config: undefined, configSchema: null, defaultConfig: {} }
    }
    
    return {
      config: plugin.config,
      configSchema: this.getPluginConfigSchema(uuid),
      defaultConfig: this.getPluginDefaultConfig(uuid)
    }
  }

  // 获取插件的权限信息（用于安全检查）
  getPluginSecurityInfo(uuid: string): { permissions: string[]; hasDangerousPermissions: boolean } {
    const permissions = this.getPluginPermissions(uuid)
    
    // 定义危险权限列表
    const dangerousPermissions = [
      'filesystem.write',
      'filesystem.delete',
      'network.request',
      'system.execute',
      'registry.read',
      'registry.write'
    ]
    
    const hasDangerousPermissions = permissions.some(p => dangerousPermissions.includes(p))
    
    return {
      permissions,
      hasDangerousPermissions
    }
  }

  // 获取插件的更新历史
  getPluginUpdateHistory(uuid: string): any[] {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return []
    }
    
    // 从配置中获取updateHistory字段（如果存在）
    const updateHistory = (plugin as any).updateHistory
    if (!updateHistory || !Array.isArray(updateHistory)) {
      return []
    }
    
    return updateHistory
  }

  // 添加插件的更新历史记录
  addPluginUpdateHistory(uuid: string, historyEntry: { version: number; date: string; changes: string[] }): { success: boolean; error?: string } {
    try {
      const plugin = this.plugins.get(uuid)
      if (!plugin) {
        return { success: false, error: '插件不存在' }
      }
      
      if (!(plugin as any).updateHistory) {
        (plugin as any).updateHistory = []
      }
      
      (plugin as any).updateHistory.push(historyEntry)
      plugin.updatedAt = new Date().toISOString()
      this.savePlugins()
      
      return { success: true }
    } catch (error) {
      console.error('添加插件更新历史失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  // 获取插件的开发者信息
  getPluginDeveloperInfo(uuid: string): { author?: string; web?: string; downloadUrl?: string; email?: string } {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return {}
    }

    return {
      author: plugin.author,
      web: plugin.web,
      downloadUrl: plugin.downloadUrl,
      email: (plugin as any).email
    }
  }

  // 创建disable.txt文件来禁用插件
  private async disablePluginByFile(uuid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const pluginDir = path.join(this.pluginsDir, uuid)
      if (!fs.existsSync(pluginDir)) {
        return { success: false, error: '插件目录不存在' }
      }

      const disableFile = path.join(pluginDir, 'disable.txt')
      fs.writeFileSync(disableFile, 'Plugin disabled by user', 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('创建disable.txt失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  // 删除disable.txt文件来启用插件
  private async enablePluginByFile(uuid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const pluginDir = path.join(this.pluginsDir, uuid)
      if (!fs.existsSync(pluginDir)) {
        return { success: false, error: '插件目录不存在' }
      }

      const disableFile = path.join(pluginDir, 'disable.txt')
      if (fs.existsSync(disableFile)) {
        fs.unlinkSync(disableFile)
      }

      return { success: true }
    } catch (error) {
      console.error('删除disable.txt失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  // 检查插件是否存在
  pluginExists(uuid: string): boolean {
    return this.plugins.has(uuid)
  }

  // 检查插件是否被禁用（通过disable.txt文件）
  isPluginDisabledByFile(uuid: string): boolean {
    const pluginDir = path.join(this.pluginsDir, uuid)
    const disableFile = path.join(pluginDir, 'disable.txt')
    return fs.existsSync(disableFile)
  }

  // 获取插件的实际启用状态（考虑disable.txt文件）
  isPluginEffectivelyEnabled(uuid: string): boolean {
    const plugin = this.plugins.get(uuid)
    if (!plugin) {
      return false
    }

    // 如果插件配置中禁用，则禁用
    if (!plugin.enabled) {
      return false
    }

    // 如果存在disable.txt文件，则禁用
    if (this.isPluginDisabledByFile(uuid)) {
      return false
    }

    return true
  }

  // 复制目录
  private copyDirectory(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  // 扫描插件目录中的资源（语言包、图标、游戏配置、主题）
  private scanPluginResources(pluginDir: string): {
    langPathList: Record<string, string>
    iconPathList: Record<string, string>
    gameConfigList: any[]
    themeList: any[]
  } {
    const langPathList: Record<string, string> = {}
    const iconPathList: Record<string, string> = {}
    const gameConfigList: any[] = []
    const themeList: any[] = []

    try {
      // 扫描语言包目录
      const langDir = path.join(pluginDir, 'lang')
      if (fs.existsSync(langDir) && fs.statSync(langDir).isDirectory()) {
        const langFiles = fs.readdirSync(langDir)
        for (const file of langFiles) {
          if (file.endsWith('.json')) {
            const langCode = path.basename(file, '.json')
            langPathList[langCode] = path.join(langDir, file)
          }
        }
      }

      // 扫描图标目录
      const iconDir = path.join(pluginDir, 'icon')
      if (fs.existsSync(iconDir) && fs.statSync(iconDir).isDirectory()) {
        const iconFiles = fs.readdirSync(iconDir)
        for (const file of iconFiles) {
          if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            iconPathList[file] = path.join(iconDir, file)
          }
        }
      }

      // 扫描游戏配置目录
      const gameConfigDir = path.join(pluginDir, 'game_config')
      if (fs.existsSync(gameConfigDir) && fs.statSync(gameConfigDir).isDirectory()) {
        const configFiles = fs.readdirSync(gameConfigDir)
        for (const file of configFiles) {
          if (file.endsWith('.json')) {
            try {
              const configPath = path.join(gameConfigDir, file)
              const configData = fs.readFileSync(configPath, 'utf-8')
              const config = JSON.parse(configData)
              gameConfigList.push(config)
            } catch (error) {
              console.error(`解析游戏配置文件失败 ${file}:`, error)
            }
          }
        }
      }

      // 扫描主题目录
      const themeDir = path.join(pluginDir, 'theme')
      if (fs.existsSync(themeDir) && fs.statSync(themeDir).isDirectory()) {
        const themeFiles = fs.readdirSync(themeDir)
        for (const file of themeFiles) {
          if (file.endsWith('.json')) {
            try {
              const themePath = path.join(themeDir, file)
              const themeData = fs.readFileSync(themePath, 'utf-8')
              const theme = JSON.parse(themeData)
              themeList.push(theme)
            } catch (error) {
              console.error(`解析主题文件失败 ${file}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error('扫描插件资源失败:', error)
    }

    return { langPathList, iconPathList, gameConfigList, themeList }
  }
}

export const pluginService = new PluginService()
