import * as ort from 'onnxruntime-node'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger'

export interface ClassificationResult {
  tagId: string
  tagNameZh: string
  tagNameEn: string
  confidence: number
  category: string
}

export interface DetectionResult {
  bbox: [number, number, number, number]
  class: string
  classZh: string
  classEn: string
  confidence: number
}

export interface GPUInfo {
  type: 'discrete' | 'integrated' | 'cpu'
  backend: 'webgpu' | 'webgl' | 'wasm'
  renderer?: string
}

export interface ModelInfo {
  name: string
  file: string
  inputSize: [number, number]
  loaded: boolean
}

export type DeviceType = 'cpu' | 'cuda' | 'dml' | 'auto'

export class AIEngine {
  private classifierSession: ort.InferenceSession | null = null
  private detectorSession: ort.InferenceSession | null = null
  private featureSession: ort.InferenceSession | null = null
  private modelsPath: string
  private _isReady: boolean = false
  private _currentDevice: DeviceType = 'cpu'
  private _availableProviders: string[] = []

  // 模型配置 - 支持动态发现
  // supportedModels 按性能从高到低排列：优先使用精度最高的模型
  private modelConfigs = {
    classifier: {
      name: 'Image Classifier',
      file: '',  // 动态发现
      inputSize: [224, 224] as [number, number],
      labels: this.getClassifierLabels(),
      supportedModels: ['resnet18', 'efficientnet-lite4', 'mobilenet-v2'],
    },
    detector: {
      name: 'Object Detector',
      file: '',  // 动态发现
      inputSize: [640, 640] as [number, number],
      labels: this.getDetectorLabels(),
      supportedModels: ['yolov8-small', 'yolov8-nano'],
    },
    feature: {
      name: 'Feature Extractor',
      file: '',  // 动态发现
      inputSize: [224, 224] as [number, number],
      supportedModels: ['resnet18', 'efficientnet-lite4', 'mobilenet-v2'],
    },
  }

  constructor() {
    // 优先使用环境变量，否则默认指向 server/ai-service/models（与主服务器下载路径一致）
    this.modelsPath = process.env.MODELS_PATH || path.join(__dirname, '../../../server/ai-service/models')
    // 检测可用的 execution providers
    this._availableProviders = (ort.env.backends as any) || ['cpu']
    logger.info(`Available ONNX Runtime backends: ${JSON.stringify(this._availableProviders)}`)
  }

  get isReady(): boolean {
    return this._isReady
  }

  get currentDevice(): DeviceType {
    return this._currentDevice
  }

  get availableProviders(): string[] {
    return this._availableProviders
  }

  // 获取当前设备信息
  getDeviceInfo(): { device: DeviceType; providers: string[]; currentProvider: string } {
    return {
      device: this._currentDevice,
      providers: this._availableProviders,
      currentProvider: this.getExecutionProvider(),
    }
  }

  // 获取当前应使用的 execution provider（带可用性检查）
  private getExecutionProvider(): string {
    let requested: string
    switch (this._currentDevice) {
      case 'cuda':
        requested = 'cuda'
        break
      case 'dml':
        requested = 'dml'
        break
      case 'auto':
        if (this._availableProviders.includes('cuda')) return 'cuda'
        if (this._availableProviders.includes('dml')) return 'dml'
        return 'cpu'
      case 'cpu':
      default:
        return 'cpu'
    }

    // 检查请求的 provider 是否实际可用
    if (!this._availableProviders.includes(requested)) {
      logger.warn(`Requested provider '${requested}' is not available. Available: ${JSON.stringify(this._availableProviders)}. Falling back to CPU.`)
      return 'cpu'
    }
    return requested
  }

  // 获取解析后的实际设备类型（考虑回退）
  private getResolvedDevice(): DeviceType {
    const provider = this.getExecutionProvider()
    if (provider === 'cuda') return 'cuda'
    if (provider === 'dml') return 'dml'
    return 'cpu'
  }

  // 获取 ONNX Runtime session 配置
  private getSessionOptions(): ort.InferenceSession.SessionOptions {
    const provider = this.getExecutionProvider()
    logger.info(`Using execution provider: ${provider}`)
    return {
      executionProviders: [provider],
    }
  }

  // 检查至少一个核心模型是否已加载
  private hasModelsLoaded(): boolean {
    return this.classifierSession !== null
  }

  // 切换设备（需要重新加载模型），失败时自动回退到 CPU
  async setDevice(device: DeviceType): Promise<{ success: boolean; actualDevice: DeviceType; message: string }> {
    if (this._currentDevice === device && this._isReady && this.hasModelsLoaded()) {
      logger.info(`Already using device: ${device}`)
      return { success: true, actualDevice: device, message: `Already using ${device}` }
    }

    const previousDevice = this._currentDevice
    logger.info(`Switching device from ${previousDevice} to ${device}`)
    this._currentDevice = device
    this._isReady = false

    // 释放现有 sessions
    await this.dispose()

    // 尝试加载模型
    const results = await Promise.allSettled([
      this.loadClassifier(),
      this.loadDetector(),
      this.loadFeatureExtractor(),
    ])

    const allFailed = results.every(r => r.status === 'rejected')
    const anyModelLoaded = this.hasModelsLoaded()

    // 如果请求的不是 CPU 且全部失败，回退到 CPU
    if (device !== 'cpu' && (!anyModelLoaded || allFailed)) {
      logger.warn(`Device '${device}' failed to load models. Falling back to CPU.`)
      this._currentDevice = 'cpu'
      await this.dispose()

      const cpuResults = await Promise.allSettled([
        this.loadClassifier(),
        this.loadDetector(),
        this.loadFeatureExtractor(),
      ])

      if (this.hasModelsLoaded()) {
        this._isReady = true
        const msg = `Device '${device}' is not available (backend not found). Automatically fell back to CPU.`
        logger.info(msg)
        return { success: false, actualDevice: 'cpu', message: msg }
      } else {
        logger.error('Failed to load models even on CPU!')
        return { success: false, actualDevice: 'cpu', message: 'Failed to load models on any device' }
      }
    }

    // 检查实际使用的 provider 是否与请求不同（已回退但部分成功）
    const actualDevice = this.getResolvedDevice()
    if (actualDevice !== device && anyModelLoaded) {
      this._isReady = true
      const msg = `Device '${device}' not available, using ${actualDevice} instead.`
      logger.info(msg)
      return { success: false, actualDevice, message: msg }
    }

    if (anyModelLoaded) {
      this._isReady = true
      logger.info(`Device switched to ${actualDevice}, models reloaded`)
      return { success: true, actualDevice, message: `Successfully switched to ${actualDevice}` }
    }

    logger.error('No models loaded on any device')
    return { success: false, actualDevice: 'cpu', message: 'No models could be loaded' }
  }

  // 释放所有 sessions
  private async dispose(): Promise<void> {
    const sessions = [this.classifierSession, this.detectorSession, this.featureSession]
    for (const session of sessions) {
      if (session) {
        try {
          await session.release()
        } catch (e) {
          // ignore
        }
      }
    }
    this.classifierSession = null
    this.detectorSession = null
    this.featureSession = null
  }

  // 发现可用的模型文件
  private async discoverModels(): Promise<void> {
    try {
      logger.info(`Discovering models in: ${this.modelsPath}`)
      
      // 确保目录存在
      if (!fs.existsSync(this.modelsPath)) {
        logger.warn(`Models directory does not exist: ${this.modelsPath}`)
        return
      }

      const files = fs.readdirSync(this.modelsPath)
      const onnxFiles = files.filter(f => f.endsWith('.onnx'))
      
      logger.info(`Found ${onnxFiles.length} ONNX files: ${onnxFiles.join(', ')}`)

      // 为每个模型类型查找匹配的文件
      for (const [type, config] of Object.entries(this.modelConfigs)) {
        for (const modelId of config.supportedModels) {
          const expectedFile = `${modelId}.onnx`
          if (onnxFiles.includes(expectedFile)) {
            config.file = expectedFile
            logger.info(`Found ${type} model: ${expectedFile}`)
            break
          }
        }
      }
    } catch (error) {
      logger.error('Failed to discover models:', error)
    }
  }

  // 初始化引擎
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AI Engine...')

      // 先发现可用的模型
      await this.discoverModels()

      // 加载模型
      await Promise.all([
        this.loadClassifier(),
        this.loadDetector(),
        this.loadFeatureExtractor(),
      ])

      this._isReady = true
      logger.info('AI Engine initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize AI Engine:', error)
      throw error
    }
  }

  // 加载分类模型
  private async loadClassifier(): Promise<void> {
    const configFile = this.modelConfigs.classifier.file
    if (!configFile) {
      logger.warn('No classifier model discovered')
      return
    }

    const modelPath = path.join(this.modelsPath, configFile)
    if (!fs.existsSync(modelPath)) {
      logger.warn(`Classifier model not found: ${modelPath}`)
      return
    }

    try {
      this.classifierSession = await ort.InferenceSession.create(modelPath, this.getSessionOptions())
      logger.info(`Classifier model loaded: ${configFile}`)
    } catch (error) {
      logger.error('Failed to load classifier model:', error)
    }
  }

  // 加载检测模型
  private async loadDetector(): Promise<void> {
    const configFile = this.modelConfigs.detector.file
    if (!configFile) {
      logger.warn('No detector model discovered')
      return
    }

    const modelPath = path.join(this.modelsPath, configFile)
    if (!fs.existsSync(modelPath)) {
      logger.warn(`Detector model not found: ${modelPath}`)
      return
    }

    try {
      this.detectorSession = await ort.InferenceSession.create(modelPath, this.getSessionOptions())
      logger.info(`Detector model loaded: ${configFile}`)
    } catch (error) {
      logger.error('Failed to load detector model:', error)
    }
  }

  // 加载特征提取模型
  private async loadFeatureExtractor(): Promise<void> {
    const configFile = this.modelConfigs.feature.file
    if (!configFile) {
      logger.warn('No feature extractor model discovered')
      return
    }

    const modelPath = path.join(this.modelsPath, configFile)
    if (!fs.existsSync(modelPath)) {
      logger.warn(`Feature extractor model not found: ${modelPath}`)
      return
    }

    try {
      this.featureSession = await ort.InferenceSession.create(modelPath, this.getSessionOptions())
      logger.info(`Feature extractor model loaded: ${configFile}`)
    } catch (error) {
      logger.error('Failed to load feature extractor model:', error)
    }
  }

  // 获取模型的输入名称（动态读取）
  private getInputName(session: ort.InferenceSession): string {
    // ONNX 模型通常使用 'data' 或 'input' 作为输入名
    const names = session.inputNames
    if (names.includes('data')) return 'data'
    if (names.includes('input')) return 'input'
    return names[0] || 'data'
  }

  // 获取模型的输出张量（动态读取，不依赖固定名称）
  private getOutputTensor(results: ort.InferenceSession.OnnxValueMapType): ort.Tensor {
    // 优先取 'output'，否则取第一个输出
    if (results['output']) return results['output'] as ort.Tensor
    const firstKey = Object.keys(results)[0]
    if (firstKey) return results[firstKey] as ort.Tensor
    throw new Error('No output tensor found in model results')
  }

  // 图像分类
  async classify(imagePath: string): Promise<ClassificationResult[]> {
    if (!this.classifierSession) {
      throw new Error('Classifier model not loaded')
    }

    const inputName = this.getInputName(this.classifierSession)
    const inputTensor = await this.preprocessImage(imagePath, this.modelConfigs.classifier.inputSize)
    const results = await this.classifierSession.run({ [inputName]: inputTensor })
    return this.parseClassificationResults(results)
  }

  // 目标检测
  async detect(imagePath: string): Promise<DetectionResult[]> {
    if (!this.detectorSession) {
      throw new Error('Detector model not loaded')
    }

    const inputName = this.getInputName(this.detectorSession)
    const inputTensor = await this.preprocessImage(imagePath, this.modelConfigs.detector.inputSize)
    const results = await this.detectorSession.run({ [inputName]: inputTensor })
    return this.parseDetectionResults(results)
  }

  // 特征提取
  async extractFeatures(imagePath: string): Promise<number[]> {
    if (!this.featureSession) {
      throw new Error('Feature extractor model not loaded')
    }

    const inputName = this.getInputName(this.featureSession)
    const inputTensor = await this.preprocessImage(imagePath, this.modelConfigs.feature.inputSize)
    const results = await this.featureSession.run({ [inputName]: inputTensor })
    return this.parseFeatureResults(results)
  }

  // 计算相似度
  calculateSimilarity(features1: number[], features2: number[]): number {
    if (features1.length !== features2.length) {
      throw new Error('Feature vectors must have the same length')
    }

    // 余弦相似度
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i]
      norm1 += features1[i] * features1[i]
      norm2 += features2[i] * features2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  // 图像预处理
  private async preprocessImage(imagePath: string, inputSize: [number, number]): Promise<ort.Tensor> {
    const [width, height] = inputSize

    // 使用sharp进行图像预处理
    const imageBuffer = await sharp(imagePath)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .removeAlpha()
      .raw()
      .toBuffer()

    // 转换为Float32Array并归一化
    const float32Data = new Float32Array(imageBuffer.length)
    for (let i = 0; i < imageBuffer.length; i++) {
      float32Data[i] = imageBuffer[i] / 255.0
    }

    // 创建tensor [batch, channels, height, width]
    const tensor = new ort.Tensor('float32', float32Data, [1, 3, height, width])
    return tensor
  }

  // 解析分类结果
  private parseClassificationResults(results: ort.InferenceSession.OnnxValueMapType): ClassificationResult[] {
    const output = this.getOutputTensor(results)
    const scores = output.data as Float32Array
    const labels = this.modelConfigs.classifier.labels

    const classificationResults: ClassificationResult[] = []

    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0.3) { // 置信度阈值
        const label = labels[i.toString()]
        if (label) {
          classificationResults.push({
            tagId: `tag_${i}`,
            tagNameZh: label.zh,
            tagNameEn: label.en,
            confidence: scores[i],
            category: label.category,
          })
        }
      }
    }

    // 按置信度排序
    return classificationResults.sort((a, b) => b.confidence - a.confidence)
  }

  // 解析检测结果
  private parseDetectionResults(results: ort.InferenceSession.OnnxValueMapType): DetectionResult[] {
    const output = this.getOutputTensor(results)
    const data = output.data as Float32Array
    const labels = this.modelConfigs.detector.labels

    const detectionResults: DetectionResult[] = []

    // 假设输出格式为 [x, y, w, h, confidence, class_id, ...]
    for (let i = 0; i < data.length; i += 7) {
      const confidence = data[i + 4]
      if (confidence > 0.5) {
        const classId = Math.floor(data[i + 5])
        const label = labels[classId.toString()]

        detectionResults.push({
          bbox: [data[i], data[i + 1], data[i + 2], data[i + 3]],
          class: label?.en || `class_${classId}`,
          classZh: label?.zh || `类别_${classId}`,
          classEn: label?.en || `class_${classId}`,
          confidence,
        })
      }
    }

    return detectionResults
  }

  // 解析特征结果
  private parseFeatureResults(results: ort.InferenceSession.OnnxValueMapType): number[] {
    const output = this.getOutputTensor(results)
    const features = output.data as Float32Array
    return Array.from(features)
  }

  // 获取GPU信息
  getGPUInfo(): GPUInfo {
    return {
      type: 'cpu',
      backend: 'wasm',
      renderer: 'ONNX Runtime Node',
    }
  }

  // 获取模型信息
  getModelInfo(): Record<string, ModelInfo> {
    return {
      classifier: {
        ...this.modelConfigs.classifier,
        loaded: this.classifierSession !== null,
      },
      detector: {
        ...this.modelConfigs.detector,
        loaded: this.detectorSession !== null,
      },
      feature: {
        ...this.modelConfigs.feature,
        loaded: this.featureSession !== null,
      },
    }
  }

  // 分类器标签（中英双语）
  private getClassifierLabels(): Record<string, { zh: string; en: string; category: string }> {
    return {
      '0': { zh: '室内', en: 'Indoor', category: 'scene' },
      '1': { zh: '室外', en: 'Outdoor', category: 'scene' },
      '2': { zh: '花园', en: 'Garden', category: 'scene' },
      '3': { zh: '城堡', en: 'Castle', category: 'scene' },
      '4': { zh: '森林', en: 'Forest', category: 'scene' },
      '5': { zh: '海边', en: 'Seaside', category: 'scene' },
      '6': { zh: '城市', en: 'City', category: 'scene' },
      '7': { zh: '夜景', en: 'Night Scene', category: 'scene' },
      '8': { zh: '日落', en: 'Sunset', category: 'scene' },
      '9': { zh: '连衣裙', en: 'Dress', category: 'clothing' },
      '10': { zh: '外套', en: 'Coat', category: 'clothing' },
      '11': { zh: '裤子', en: 'Pants', category: 'clothing' },
      '12': { zh: '鞋子', en: 'Shoes', category: 'clothing' },
      '13': { zh: '帽子', en: 'Hat', category: 'clothing' },
      '14': { zh: '配饰', en: 'Accessories', category: 'clothing' },
      '15': { zh: '发型', en: 'Hairstyle', category: 'clothing' },
      '16': { zh: '站立', en: 'Standing', category: 'action' },
      '17': { zh: '坐着', en: 'Sitting', category: 'action' },
      '18': { zh: '跳跃', en: 'Jumping', category: 'action' },
      '19': { zh: '奔跑', en: 'Running', category: 'action' },
      '20': { zh: '舞蹈', en: 'Dancing', category: 'action' },
      '21': { zh: '拍照', en: 'Taking Photo', category: 'action' },
    }
  }

  // 检测器标签
  private getDetectorLabels(): Record<string, { zh: string; en: string }> {
    return {
      '0': { zh: '人物', en: 'Person' },
      '1': { zh: '连衣裙', en: 'Dress' },
      '2': { zh: '外套', en: 'Coat' },
      '3': { zh: '帽子', en: 'Hat' },
      '4': { zh: '鞋子', en: 'Shoes' },
      '5': { zh: '配饰', en: 'Accessory' },
      '6': { zh: '包包', en: 'Bag' },
      '7': { zh: '家具', en: 'Furniture' },
    }
  }
}

export default AIEngine