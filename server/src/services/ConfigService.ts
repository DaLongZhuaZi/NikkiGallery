import fs from 'fs'
import path from 'path'
import logger from '../utils/logger'

/**
 * 应用配置接口 - 所有用户可设置的选项
 */
export interface AppConfig {
  // === 游戏路径设置 ===
  gamePath: string                    // 游戏安装根目录
  uid: string                         // 用户UID (用于解密图片元数据)
  screenshotFolders: string[]         // 已启用的截图文件夹路径列表
  customAlbumsPath: string            // 自定义相册存储目录

  // === 界面设置 ===
  language: 'zh' | 'en'              // 界面语言
  theme: 'light' | 'dark' | 'system' // 主题模式
  thumbnailSize: 'small' | 'medium' | 'large' // 缩略图尺寸

  // === AI设置 ===
  aiEnabled: boolean                  // 是否启用AI功能
  maxConcurrentAI: number             // AI最大并发处理数
  aiBackend: 'webgl' | 'webgpu' | 'wasm' // AI推理后端
  aiDevice: 'cpu' | 'cuda' | 'dml' | 'auto' // ONNX Runtime推理设备
  autoProcessNewImages: boolean       // 是否自动处理新图片

  // === 扫描设置 ===
  autoScan: boolean                   // 是否自动扫描新图片
  scanInterval: number                // 扫描间隔（秒）

  // === 高级设置 ===
  logLevel: 'debug' | 'info' | 'warn' | 'error' // 日志级别
  thumbnailQuality: number            // 缩略图质量 (1-100)
  maxUploadSize: number               // 最大上传文件大小 (MB)

  // === 元数据 ===
  _version: number                    // 配置版本号
  _lastModified: string               // 最后修改时间
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  // 游戏路径
  gamePath: '',
  uid: '',
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
  _lastModified: new Date().toISOString(),
}

/**
 * 配置管理服务 - 使用JSON文件持久化
 * 
 * 配置文件位置: data/settings.json
 * 设计为人类可读可编辑的JSON格式
 */
class ConfigService {
  private configPath: string
  private config: AppConfig
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // 配置文件路径: 项目根目录/data/settings.json
    this.configPath = path.join(__dirname, '../../data/settings.json')
    this.config = { ...DEFAULT_CONFIG }
    this.load()
  }

  /**
   * 从JSON文件加载配置
   */
  private load(): void {
    try {
      // 确保 data 目录存在
      const dataDir = path.dirname(this.configPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        const saved = JSON.parse(raw) as Partial<AppConfig>

        // 合并配置：保留默认值，覆盖已保存的值
        this.config = {
          ...DEFAULT_CONFIG,
          ...saved,
          _version: DEFAULT_CONFIG._version,
          _lastModified: new Date().toISOString(),
        }

        logger.info(`Config loaded from ${this.configPath}`)
      } else {
        // 首次运行，创建默认配置文件
        this.save()
        logger.info(`Default config created at ${this.configPath}`)
      }
    } catch (error) {
      logger.error('Failed to load config, using defaults:', error)
      this.config = { ...DEFAULT_CONFIG }
    }
  }

  /**
   * 保存配置到JSON文件
   */
  private save(): void {
    try {
      this.config._lastModified = new Date().toISOString()

      const dataDir = path.dirname(this.configPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // 写入格式化的JSON，方便用户手动编辑
      const json = JSON.stringify(this.config, null, 2)
      fs.writeFileSync(this.configPath, json, 'utf-8')

      logger.info('Config saved to file')
    } catch (error) {
      logger.error('Failed to save config:', error)
    }
  }

  /**
   * 防抖保存 - 避免频繁写入磁盘
   */
  private debouncedSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.save()
      this.saveTimer = null
    }, 500)
  }

  /**
   * 获取完整配置
   */
  getAll(): AppConfig {
    return { ...this.config }
  }

  /**
   * 获取单个配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key]
  }

  /**
   * 更新配置（部分更新）
   */
  update(partial: Partial<AppConfig>): AppConfig {
    // 验证并过滤有效字段
    const validKeys = Object.keys(DEFAULT_CONFIG) as (keyof AppConfig)[]
    const updates: Partial<AppConfig> = {}

    for (const key of validKeys) {
      if (key in partial && partial[key] !== undefined) {
        (updates as any)[key] = partial[key]
      }
    }

    // 应用更新
    this.config = {
      ...this.config,
      ...updates,
      _lastModified: new Date().toISOString(),
    }

    // 保存到文件
    this.debouncedSave()

    logger.info('Config updated:', Object.keys(updates))
    return this.getAll()
  }

  /**
   * 重置为默认配置
   */
  reset(): AppConfig {
    this.config = {
      ...DEFAULT_CONFIG,
      _lastModified: new Date().toISOString(),
    }
    this.save()
    logger.info('Config reset to defaults')
    return this.getAll()
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * 获取配置文件内容（原始JSON字符串）
   */
  getRawJson(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * 从JSON字符串导入配置
   */
  importFromJson(jsonStr: string): AppConfig {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<AppConfig>
      return this.update(parsed)
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }
}

// 导出单例
export const configService = new ConfigService()
export default configService
