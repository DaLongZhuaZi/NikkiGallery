import * as ort from 'onnxruntime-web'
import { GPUInfo, ModelConfig, ClassificationResult, DetectionResult, FeatureVector } from '@/types/ai'
import gpuAdapter from './gpu'

// 模型配置
const AI_MODELS: Record<string, ModelConfig> = {
  classifier: {
    name: 'MobileNetV3-Small',
    file: '/models/mobilenetv3-small.onnx',
    size: '2.5MB',
    inputSize: [224, 224],
    labels: 'classifier',
    backend: 'webgl',
  },
  detector: {
    name: 'YOLOv8-Nano',
    file: '/models/yolov8n.onnx',
    size: '6MB',
    inputSize: [640, 640],
    labels: 'detector',
    backend: 'webgpu',
  },
  feature: {
    name: 'MobileNetV3-Feature',
    file: '/models/mobilenetv3-feature.onnx',
    size: '3MB',
    inputSize: [224, 224],
    labels: 'feature',
    backend: 'webgl',
  },
}

class AIInference {
  private static instance: AIInference
  private sessions: Map<string, ort.InferenceSession> = new Map()
  private gpuInfo: GPUInfo | null = null
  private initialized = false

  static getInstance(): AIInference {
    if (!AIInference.instance) {
      AIInference.instance = new AIInference()
    }
    return AIInference.instance
  }

  async initialize(): Promise<GPUInfo> {
    if (this.initialized && this.gpuInfo) {
      return this.gpuInfo
    }

    this.gpuInfo = await gpuAdapter.detectGPU()
    ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4

    this.initialized = true
    return this.gpuInfo
  }

  private async loadModel(modelKey: string): Promise<ort.InferenceSession> {
    if (this.sessions.has(modelKey)) {
      return this.sessions.get(modelKey)!
    }

    const config = AI_MODELS[modelKey]
    if (!config) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    const backend = this.gpuInfo?.backend || 'webgl'
    const session = await ort.InferenceSession.create(config.file, {
      executionProviders: [backend as string],
      graphOptimizationLevel: 'all',
    })

    this.sessions.set(modelKey, session)
    return session
  }

  private preprocessImage(imageData: ImageData, targetSize: [number, number]): ort.Tensor {
    const [width, height] = targetSize
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    ctx.drawImage(tempCanvas, 0, 0, width, height)

    const pixels = ctx.getImageData(0, 0, width, height)
    const data = pixels.data

    const float32Data = new Float32Array(3 * width * height)
    for (let i = 0; i < width * height; i++) {
      float32Data[i] = data[i * 4] / 255.0
      float32Data[i + width * height] = data[i * 4 + 1] / 255.0
      float32Data[i + 2 * width * height] = data[i * 4 + 2] / 255.0
    }

    return new ort.Tensor('float32', float32Data, [1, 3, height, width])
  }

  async classify(imageData: ImageData): Promise<ClassificationResult[]> {
    const session = await this.loadModel('classifier')
    const tensor = this.preprocessImage(imageData, AI_MODELS.classifier.inputSize)

    const results = await session.run({ input: tensor })
    const output = results[Object.keys(results)[0]]
    const scores = output.data as Float32Array

    const labels = await this.loadLabels('classifier')

    const indexedScores = Array.from(scores).map((score, index) => ({
      index,
      score,
    }))
    indexedScores.sort((a, b) => b.score - a.score)
    const top5 = indexedScores.slice(0, 5)

    return top5.map(({ index, score }) => {
      const label = labels[index] || { zh: `类别${index}`, en: `Class${index}` }
      return {
        label: label.en,
        labelZh: label.zh,
        labelEn: label.en,
        confidence: score,
        category: this.getCategory(index),
      }
    })
  }

  async detect(imageData: ImageData): Promise<DetectionResult[]> {
    const session = await this.loadModel('detector')
    const tensor = this.preprocessImage(imageData, AI_MODELS.detector.inputSize)

    const results = await session.run({ input: tensor })
    const output = results[Object.keys(results)[0]]
    const data = output.data as Float32Array

    const detections: DetectionResult[] = []
    const labels = await this.loadLabels('detector')

    const numDetections = 8400
    const numClasses = 80

    for (let i = 0; i < numDetections; i++) {
      const confidence = data[4 * numDetections + i]
      if (confidence < 0.5) continue

      const x = data[i]
      const y = data[numDetections + i]
      const w = data[2 * numDetections + i]
      const h = data[3 * numDetections + i]

      let maxClassScore = 0
      let maxClassIndex = 0
      for (let c = 0; c < numClasses; c++) {
        const classScore = data[(4 + c) * numDetections + i]
        if (classScore > maxClassScore) {
          maxClassScore = classScore
          maxClassIndex = c
        }
      }

      const finalScore = confidence * maxClassScore
      if (finalScore < 0.5) continue

      const label = labels[maxClassIndex] || { zh: `物体${maxClassIndex}`, en: `Object${maxClassIndex}` }
      detections.push({
        bbox: [x - w / 2, y - h / 2, w, h],
        label: label.en,
        labelZh: label.zh,
        labelEn: label.en,
        confidence: finalScore,
      })
    }

    return this.nms(detections, 0.5)
  }

  async extractFeatures(imageData: ImageData): Promise<FeatureVector> {
    const session = await this.loadModel('feature')
    const tensor = this.preprocessImage(imageData, AI_MODELS.feature.inputSize)

    const results = await session.run({ input: tensor })
    const output = results[Object.keys(results)[0]]
    const data = output.data as Float32Array

    return {
      data,
      dimensions: data.length,
    }
  }

  private async loadLabels(modelKey: string): Promise<Array<{ zh: string; en: string }>> {
    try {
      const response = await fetch('/models/labels.json')
      const labelsData = await response.json()

      if (modelKey === 'classifier') {
        return [
          ...Object.values(labelsData.scenes),
          ...Object.values(labelsData.clothing),
          ...Object.values(labelsData.actions),
        ] as Array<{ zh: string; en: string }>
      }

      return Object.values(labelsData).flatMap((category: unknown) =>
        Object.values(category as Record<string, { zh: string; en: string }>)
      ) as Array<{ zh: string; en: string }>
    } catch {
      return []
    }
  }

  private getCategory(index: number): string {
    if (index < 12) return 'scene'
    if (index < 25) return 'clothing'
    return 'action'
  }

  private nms(detections: DetectionResult[], iouThreshold: number): DetectionResult[] {
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
    const keep: DetectionResult[] = []

    while (sorted.length > 0) {
      const current = sorted.shift()!
      keep.push(current)

      for (let i = sorted.length - 1; i >= 0; i--) {
        if (this.calculateIoU(current.bbox, sorted[i].bbox) > iouThreshold) {
          sorted.splice(i, 1)
        }
      }
    }

    return keep
  }

  private calculateIoU(
    bbox1: [number, number, number, number],
    bbox2: [number, number, number, number]
  ): number {
    const [x1, y1, w1, h1] = bbox1
    const [x2, y2, w2, h2] = bbox2

    const xLeft = Math.max(x1, x2)
    const yTop = Math.max(y1, y2)
    const xRight = Math.min(x1 + w1, x2 + w2)
    const yBottom = Math.min(y1 + h1, y2 + h2)

    if (xRight < xLeft || yBottom < yTop) return 0

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop)
    const bbox1Area = w1 * h1
    const bbox2Area = w2 * h2
    const unionArea = bbox1Area + bbox2Area - intersectionArea

    return intersectionArea / unionArea
  }

  getGPUInfo(): GPUInfo | null {
    return this.gpuInfo
  }

  getAvailableModels(): ModelConfig[] {
    return Object.values(AI_MODELS)
  }

  dispose(): void {
    this.sessions.forEach((session) => session.release())
    this.sessions.clear()
    this.initialized = false
  }
}

export default AIInference.getInstance()
