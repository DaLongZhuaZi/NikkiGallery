import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import logger from '../utils/logger'
import config from '../config'

const execAsync = promisify(exec)

export interface GPUInfo {
  type: 'discrete' | 'integrated' | 'cpu'
  backend: 'webgpu' | 'webgl' | 'wasm'
  renderer?: string
  vendor?: string
  features?: string[]
  memory?: number
}

export interface ModelInfo {
  id: string
  name: string
  nameZh: string
  description: string
  type: 'classification' | 'detection' | 'segmentation'
  size: string
  downloadUrl: string
  inputSize: [number, number]
  labels: string[]
  performance: {
    gpu: string
    cpu: string
  }
}

export class AIService {
  private gpuInfo: GPUInfo | null = null

  /**
   * 检测GPU信息 - 优先使用 PowerShell 获取更可靠的结果
   */
  async detectGPU(): Promise<GPUInfo> {
    if (this.gpuInfo) {
      return this.gpuInfo
    }

    try {
      if (process.platform === 'win32') {
        this.gpuInfo = await this.detectGPUWindows()
      } else if (process.platform === 'darwin') {
        this.gpuInfo = await this.detectGPUMacOS()
      } else {
        this.gpuInfo = await this.detectGPULinux()
      }
    } catch (error) {
      logger.warn('GPU detection failed, using CPU fallback:', error)
      this.gpuInfo = {
        type: 'cpu',
        backend: 'wasm',
        renderer: 'CPU Only',
        features: ['wasm'],
      }
    }

    return this.gpuInfo!
  }

  /**
   * Windows GPU检测 - 使用 PowerShell (优先) 或 WMIC (备用)
   */
  private async detectGPUWindows(): Promise<GPUInfo> {
    // 尝试 PowerShell Get-CimInstance（比 Get-WmiObject 更可靠，中文Windows兼容性更好）
    try {
      const { stdout } = await execAsync(
        'powershell -Command "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-CimInstance win32_videocontroller | Select-Object Name, AdapterRAM, DriverVersion | Format-List"',
        { timeout: 10000 }
      )

      const gpuEntries = this.parsePowerShellGPU(stdout)
      if (gpuEntries.length > 0) {
        // 优先选择独立显卡
        const discreteGPU = gpuEntries.find(g => 
          /nvidia|rtx|gtx|rx\s*\d|radeon/i.test(g.name)
        )
        const gpu = discreteGPU || gpuEntries[0]

        const isDiscrete = /nvidia|rtx|gtx|rx\s*\d|radeon/i.test(gpu.name)
        const isIntegrated = /intel|uhd|iris|vega/i.test(gpu.name)

        const gpuInfo: GPUInfo = {
          type: isDiscrete ? 'discrete' : isIntegrated ? 'integrated' : 'cpu',
          backend: isDiscrete ? 'webgpu' : 'webgl',
          renderer: gpu.name,
          vendor: this.getGPUVendor(gpu.name),
          memory: gpu.memory > 0 ? gpu.memory : undefined,
          features: isDiscrete ? ['webgpu', 'webgl', 'wasm'] : ['webgl', 'wasm'],
        }

        logger.info(`GPU detected (PowerShell): ${gpu.name} (${gpuInfo.type}, ${gpu.memory || '?'} MB)`)
        return gpuInfo
      }
    } catch (err) {
      logger.warn('PowerShell GPU detection failed, trying WMIC:', err)
    }

    // 备用: WMIC
    try {
      const { stdout } = await execAsync(
        'wmic path win32_videocontroller get name,adapterram /format:list',
        { timeout: 10000 }
      )

      const gpuEntries = this.parseWMICGPU(stdout)
      if (gpuEntries.length > 0) {
        const discreteGPU = gpuEntries.find(g => 
          /nvidia|rtx|gtx|rx\s*\d|radeon/i.test(g.name)
        )
        const gpu = discreteGPU || gpuEntries[0]

        const isDiscrete = /nvidia|rtx|gtx|rx\s*\d|radeon/i.test(gpu.name)
        const isIntegrated = /intel|uhd|iris|vega/i.test(gpu.name)

        return {
          type: isDiscrete ? 'discrete' : isIntegrated ? 'integrated' : 'cpu',
          backend: isDiscrete ? 'webgpu' : 'webgl',
          renderer: gpu.name,
          vendor: this.getGPUVendor(gpu.name),
          memory: gpu.memory > 0 ? gpu.memory : undefined,
          features: isDiscrete ? ['webgpu', 'webgl', 'wasm'] : ['webgl', 'wasm'],
        }
      }
    } catch (err) {
      logger.warn('WMIC GPU detection also failed:', err)
    }

    // 最终回退
    return {
      type: 'cpu',
      backend: 'wasm',
      renderer: 'CPU Only',
      features: ['wasm'],
    }
  }

  /**
   * 解析 PowerShell Format-List 输出（支持中英文 Windows）
   */
  private parsePowerShellGPU(output: string): Array<{ name: string; memory: number }> {
    const entries: Array<{ name: string; memory: number }> = []
    const blocks = output.split(/\n\s*\n/).filter(b => b.trim())

    for (const block of blocks) {
      // 支持中英文字段名：Name / 名称, AdapterRAM / 适配器RAM
      const nameMatch = block.match(/(?:Name|名称)\s*:\s*(.+)/i)
      const ramMatch = block.match(/(?:AdapterRAM|适配器RAM)\s*:\s*(\d+)/i)

      if (nameMatch) {
        const name = nameMatch[1].trim()
        // 过滤掉虚拟显卡和无效条目
        if (/virtual|idd|oray|displaylink|basic/i.test(name)) continue
        if (!name || name.length < 2) continue
        const memory = ramMatch ? Math.round(parseInt(ramMatch[1]) / (1024 * 1024)) : 0
        entries.push({ name, memory })
      }
    }

    return entries
  }

  /**
   * 解析 WMIC Format=List 输出（支持中英文 Windows）
   */
  private parseWMICGPU(output: string): Array<{ name: string; memory: number }> {
    const entries: Array<{ name: string; memory: number }> = []
    const blocks = output.split(/\n\s*\n/).filter(b => b.trim())

    for (const block of blocks) {
      // 支持中英文字段名：Name / 名称, AdapterRAM / 适配器RAM
      const nameMatch = block.match(/(?:Name|名称)\s*=\s*(.+)/i)
      const ramMatch = block.match(/(?:AdapterRAM|适配器RAM)\s*=\s*(\d+)/i)

      if (nameMatch) {
        const name = nameMatch[1].trim()
        if (/virtual|idd|oray|displaylink|basic/i.test(name)) continue
        if (!name || name.length < 2) continue
        const memory = ramMatch ? Math.round(parseInt(ramMatch[1]) / (1024 * 1024)) : 0
        entries.push({ name, memory })
      }
    }

    return entries
  }

  /**
   * 识别GPU厂商
   */
  private getGPUVendor(name: string): string {
    if (/nvidia|rtx|gtx|geforce/i.test(name)) return 'NVIDIA'
    if (/amd|radeon|rx\s*\d/i.test(name)) return 'AMD'
    if (/intel|uhd|iris/i.test(name)) return 'Intel'
    return 'Unknown'
  }

  /**
   * macOS GPU检测
   */
  private async detectGPUMacOS(): Promise<GPUInfo> {
    try {
      const { stdout } = await execAsync(
        'system_profiler SPDisplaysDataType 2>/dev/null | head -20',
        { timeout: 5000 }
      )
      const name = stdout.trim()
      const isDiscrete = /nvidia|rtx|gtx|radeon|amd/i.test(name)

      return {
        type: isDiscrete ? 'discrete' : 'integrated',
        backend: isDiscrete ? 'webgpu' : 'webgl',
        renderer: name.split('\n')[0]?.trim() || 'Unknown GPU',
        features: ['webgl', 'wasm'],
      }
    } catch {
      return {
        type: 'cpu',
        backend: 'wasm',
        renderer: 'CPU Only',
        features: ['wasm'],
      }
    }
  }

  /**
   * Linux GPU检测
   */
  private async detectGPULinux(): Promise<GPUInfo> {
    try {
      const { stdout } = await execAsync('lspci | grep -i vga', { timeout: 5000 })
      const name = stdout.trim()
      const isDiscrete = /nvidia|rtx|gtx|rx\s*\d|radeon/i.test(name)

      return {
        type: isDiscrete ? 'discrete' : 'integrated',
        backend: isDiscrete ? 'webgpu' : 'webgl',
        renderer: name,
        features: ['webgl', 'wasm'],
      }
    } catch {
      return {
        type: 'cpu',
        backend: 'wasm',
        renderer: 'CPU Only',
        features: ['wasm'],
      }
    }
  }

  /**
   * 获取推荐的AI模型列表
   * downloadUrl: 直连地址
   * mirrorUrls: 国内镜像地址列表（按优先级排列，连同主URL一起尝试）
   */
  getRecommendedModels(): ModelInfo[] {
    return [
      {
        id: 'mobilenet-v2',
        name: 'MobileNet V2',
        nameZh: 'MobileNet V2 轻量版',
        description: '轻量级图像分类模型，适合快速识别场景和服装类型（ImageNet 1000类）',
        type: 'classification',
        size: '13.3 MB',
        downloadUrl: 'https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx',
        inputSize: [224, 224],
        labels: [
          '场景', '服装', '人物', '背景', '装饰',
          '室内', '室外', '森林', '城市', '海边',
          '裙子', '上衣', '裤子', '鞋子', '配饰'
        ],
        performance: {
          gpu: '~15ms',
          cpu: '~45ms',
        },
      },
      {
        id: 'efficientnet-lite4',
        name: 'EfficientNet-Lite4',
        nameZh: 'EfficientNet Lite4 精确版',
        description: '高精度图像分类模型，平衡速度和准确度（ImageNet 1000类）',
        type: 'classification',
        size: '51.9 MB',
        downloadUrl: 'https://github.com/onnx/models/raw/main/validated/vision/classification/efficientnet-lite4/model/efficientnet-lite4-11.onnx',
        inputSize: [224, 224],
        labels: [
          '场景', '服装', '人物', '背景', '装饰',
          '室内', '室外', '森林', '城市', '海边',
          '裙子', '上衣', '裤子', '鞋子', '配饰',
          '可爱', '优雅', '华丽', '简约', '复古'
        ],
        performance: {
          gpu: '~20ms',
          cpu: '~60ms',
        },
      },
      {
        id: 'yolov8-nano',
        name: 'YOLOv8 Nano',
        nameZh: 'YOLOv8 极速版',
        description: '超轻量目标检测模型，实时检测人物和服装部件（COCO 80类）',
        type: 'detection',
        size: '6.2 MB',
        downloadUrl: 'https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx',
        inputSize: [640, 640],
        labels: [
          'person', 'dress', 'top', 'skirt', 'shoes',
          'hat', 'bag', 'accessory', 'hair', 'face'
        ],
        performance: {
          gpu: '~8ms',
          cpu: '~35ms',
        },
      },
      {
        id: 'yolov8-small',
        name: 'YOLOv8 Small',
        nameZh: 'YOLOv8 标准版',
        description: '高精度目标检测模型，适合详细的人物和服装分析（COCO 80类）',
        type: 'detection',
        size: '22.5 MB',
        downloadUrl: 'https://huggingface.co/Kalray/yolov8/resolve/main/yolov8s.onnx',
        inputSize: [640, 640],
        labels: [
          'person', 'dress', 'top', 'skirt', 'shoes',
          'hat', 'bag', 'accessory', 'hair', 'face',
          'arm', 'leg', 'hand', 'foot', 'neck'
        ],
        performance: {
          gpu: '~15ms',
          cpu: '~80ms',
        },
      },
      {
        id: 'resnet18',
        name: 'ResNet-18',
        nameZh: 'ResNet-18 特征提取',
        description: '深度特征提取模型，用于以图搜图和相似度计算（ImageNet 1000类）',
        type: 'classification',
        size: '44.7 MB',
        downloadUrl: 'https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet18-v2-7.onnx',
        inputSize: [224, 224],
        labels: [],
        performance: {
          gpu: '~25ms',
          cpu: '~100ms',
        },
      },
    ]
  }

  /**
   * 获取模型的所有可用下载URL（主URL + 镜像URL）
   * 按优先级排列，优先使用已验证可用的镜像
   */
  getModelDownloadUrls(modelId: string): string[] {
    const models = this.getRecommendedModels()
    const model = models.find(m => m.id === modelId)
    if (!model) return []

    const urls: string[] = []
    const original = model.downloadUrl

    // HuggingFace 模型 → 使用 hf-mirror.com 镜像（已验证可用）
    if (original.includes('huggingface.co')) {
      const mirrorUrl = original.replace('huggingface.co', 'hf-mirror.com')
      urls.push(mirrorUrl)  // 镜像优先（国内更快）
      urls.push(original)   // 原始地址作为回退
    }
    // GitHub 模型 → 使用 ghfast.top 镜像
    else if (original.includes('github.com')) {
      const mirrorUrl = `https://ghfast.top/${original}`
      urls.push(mirrorUrl)
      urls.push(original)
    }
    else {
      urls.push(original)
    }

    return urls
  }

  /**
   * 获取已下载的模型ID列表
   * 文件名格式: {modelId}.onnx (如 mobilenet-v2.onnx, yolov8-nano.onnx)
   */
  async getDownloadedModels(): Promise<string[]> {
    const modelsDir = config.ai.modelsPath
    try {
      const files = await fs.readdir(modelsDir)
      return files
        .filter(f => f.endsWith('.onnx'))
        .map(f => f.replace('.onnx', ''))
    } catch {
      return []
    }
  }

  /**
   * 检查模型是否已下载
   */
  async isModelDownloaded(modelId: string): Promise<boolean> {
    const models = await this.getDownloadedModels()
    return models.includes(modelId)
  }

  /**
   * 获取模型下载进度（模拟）
   */
  async getModelDownloadProgress(modelId: string): Promise<number> {
    // 实际实现中应该跟踪下载进度
    const isDownloaded = await this.isModelDownloaded(modelId)
    return isDownloaded ? 100 : 0
  }

  /**
   * 从 AI 微服务同步标签到数据库
   * AI 服务返回的标签格式: { "0": { "zh": "室内", "en": "Indoor", "category": "scene" }, ... }
   * 转换为数据库格式: id = "tag_0", nameZh = "室内", nameEn = "Indoor", type = category
   */
  async syncAITags(): Promise<number> {
    try {
      const { TagModel } = await import('../models/Tag')
      
      // 从 AI 微服务获取模型配置
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:15000'
      const response = await fetch(`${AI_SERVICE_URL}/models`)
      if (!response.ok) {
        logger.warn('Failed to fetch AI service models for tag sync')
        return 0
      }
      
      const models = await response.json() as any
      const labels = models.classifier?.labels || {}
      
      let syncedCount = 0
      
      for (const [index, label] of Object.entries(labels)) {
        const labelData = label as any
        const tagId = `tag_${index}`
        
        // 检查标签是否已存在
        const existingTag = TagModel.findById(tagId)
        if (!existingTag) {
          // 创建新标签
          TagModel.create({
            id: tagId,
            nameZh: labelData.zh || labelData.en || `Tag ${index}`,
            nameEn: labelData.en || `tag_${index}`,
            type: labelData.category || 'ai',
            category: labelData.category || null,
          })
          syncedCount++
        }
      }
      
      if (syncedCount > 0) {
        logger.info(`Synced ${syncedCount} AI tags to database`)
      }
      
      return syncedCount
    } catch (error) {
      logger.error('Failed to sync AI tags:', error)
      return 0
    }
  }
}

export default new AIService()
