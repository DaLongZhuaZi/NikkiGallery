import { GPUInfo } from '@/types/ai'

// WebGPU 类型声明
declare global {
  interface Navigator {
    gpu?: GPU
  }
  
  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>
  }
  
  interface GPUAdapter {
    features: Set<string>
    limits: GPULimits
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>
  }
  
  interface GPUDevice {
    features: Set<string>
    limits: GPULimits
  }
  
  interface GPULimits {
    maxBufferSize: number
    maxStorageBufferBindingSize: number
  }
  
  interface GPUDeviceDescriptor {
    requiredFeatures?: string[]
    requiredLimits?: Record<string, number>
  }
}

export class GPUAdapter {
  private static instance: GPUAdapter
  private gpuInfo: GPUInfo | null = null

  static getInstance(): GPUAdapter {
    if (!GPUAdapter.instance) {
      GPUAdapter.instance = new GPUAdapter()
    }
    return GPUAdapter.instance
  }

  async detectGPU(): Promise<GPUInfo> {
    if (this.gpuInfo) {
      return this.gpuInfo
    }

    // 检测WebGPU支持
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (adapter) {
          const features = Array.from(adapter.features) as string[]
          this.gpuInfo = {
            type: 'discrete',
            backend: 'webgpu',
            features,
          }
          return this.gpuInfo
        }
      } catch (e) {
        console.warn('WebGPU detection failed:', e)
      }
    }

    // 检测WebGL支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
        : 'Unknown'

      const isIntegrated = this.isIntegratedGPU(renderer)
      this.gpuInfo = {
        type: isIntegrated ? 'integrated' : 'discrete',
        backend: 'webgl',
        renderer,
      }
      return this.gpuInfo
    }

    // 回退到WASM
    this.gpuInfo = {
      type: 'cpu',
      backend: 'wasm',
    }
    return this.gpuInfo
  }

  private isIntegratedGPU(renderer: string): boolean {
    const integratedKeywords = [
      'Intel',
      'UHD',
      'HD Graphics',
      'Iris',
      'AMD Radeon(TM) Graphics',
      'AMD Radeon Graphics',
    ]
    return integratedKeywords.some((keyword) =>
      renderer.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  isWebGPUSupported(): boolean {
    return !!navigator.gpu
  }

  isWebGLSupported(): boolean {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  }

  getRecommendedBackend(): 'webgpu' | 'webgl' | 'wasm' {
    if (this.gpuInfo) {
      return this.gpuInfo.backend
    }
    if (this.isWebGPUSupported()) return 'webgpu'
    if (this.isWebGLSupported()) return 'webgl'
    return 'wasm'
  }
}

export default GPUAdapter.getInstance()
