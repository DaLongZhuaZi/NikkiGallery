import sharp from 'sharp'
import fs from 'fs'
import logger from '../utils/logger'
import ImageModel, { Image, CameraParams } from '../models/Image'
import { ImageDecryptService } from './ImageDecryptService'
import configService from './ConfigService'
import accountService from './AccountService'

export interface ExifData {
  // 基础信息
  make?: string             // 相机制造商
  model?: string            // 相机型号
  software?: string         // 软件
  dateTime?: string         // 拍摄时间
  dateTimeOriginal?: string // 原始拍摄时间
  dateTimeDigitized?: string // 数字化时间
  
  // 图片尺寸
  imageWidth?: number
  imageHeight?: number
  xResolution?: number
  yResolution?: number
  resolutionUnit?: string
  
  // 曝光参数
  exposureTime?: string     // 曝光时间
  fNumber?: number          // 光圈值
  isoSpeedRatings?: number  // ISO
  exposureProgram?: string  // 曝光程序
  exposureBiasValue?: number // 曝光补偿
  maxApertureValue?: number // 最大光圈
  meteringMode?: string     // 测光模式
  flash?: string            // 闪光灯
  focalLength?: number      // 焦距
  focalLengthIn35mm?: number // 35mm等效焦距
  
  // GPS 信息
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAltitude?: number
  gpsTimestamp?: string
  
  // 其他
  colorSpace?: string
  whiteBalance?: string
  sceneCaptureType?: string
  gainControl?: string
  contrast?: string
  saturation?: string
  sharpness?: string
  subjectDistanceRange?: string
}

export class MetadataService {
  // 提取图片 EXIF 数据
  static async extractExifData(imagePath: string): Promise<ExifData | null> {
    try {
      if (!fs.existsSync(imagePath)) {
        logger.warn(`Image file not found: ${imagePath}`)
        return null
      }

      const metadata = await sharp(imagePath).metadata()
      const exif = metadata.exif

      if (!exif) {
        logger.info(`No EXIF data found in: ${imagePath}`)
        return null
      }

      // 解析 EXIF 数据
      const exifData: ExifData = {
        // 基础信息
        make: (metadata.exif as any)?.Make,
        model: (metadata.exif as any)?.Model,
        software: (metadata.exif as any)?.Software,
        dateTime: (metadata.exif as any)?.DateTime,
        dateTimeOriginal: (metadata.exif as any)?.DateTimeOriginal,
        dateTimeDigitized: (metadata.exif as any)?.DateTimeDigitized,
        
        // 图片尺寸
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        xResolution: metadata.density || undefined,
        yResolution: metadata.density || undefined,
        
        // 曝光参数（从 EXIF 标签读取）
        exposureTime: (metadata.exif as any)?.ExposureTime,
        fNumber: (metadata.exif as any)?.FNumber,
        isoSpeedRatings: (metadata.exif as any)?.ISO,
        exposureProgram: (metadata.exif as any)?.ExposureProgram,
        exposureBiasValue: (metadata.exif as any)?.ExposureBiasValue,
        maxApertureValue: (metadata.exif as any)?.MaxApertureValue,
        meteringMode: (metadata.exif as any)?.MeteringMode,
        flash: (metadata.exif as any)?.Flash,
        focalLength: (metadata.exif as any)?.FocalLength,
        focalLengthIn35mm: (metadata.exif as any)?.FocalLengthIn35mmFormat,
        
        // GPS 信息
        gpsLatitude: (metadata.exif as any)?.GPSLatitude,
        gpsLongitude: (metadata.exif as any)?.GPSLongitude,
        gpsAltitude: (metadata.exif as any)?.GPSAltitude,
        gpsTimestamp: (metadata.exif as any)?.GPSTimeStamp,
        
        // 其他
        colorSpace: (metadata.exif as any)?.ColorSpace,
        whiteBalance: (metadata.exif as any)?.WhiteBalance,
        sceneCaptureType: (metadata.exif as any)?.SceneCaptureType,
        gainControl: (metadata.exif as any)?.GainControl,
        contrast: (metadata.exif as any)?.Contrast,
        saturation: (metadata.exif as any)?.Saturation,
        sharpness: (metadata.exif as any)?.Sharpness,
        subjectDistanceRange: (metadata.exif as any)?.SubjectDistanceRange,
      }

      return exifData
    } catch (error) {
      logger.error(`Failed to extract EXIF data from ${imagePath}:`, error)
      return null
    }
  }

  // 尝试提取游戏元数据（从 JPEG 结束标记后）
  static async extractGameMetadata(imagePath: string): Promise<any | null> {
    try {
      if (!fs.existsSync(imagePath)) {
        return null
      }

      const gamePath = configService.get('gamePath')
      let uid = accountService.getCurrentAccount()?.uid
      if (!uid) {
        uid = ImageDecryptService.findUserUid(gamePath) || undefined
      }

      const result = await ImageDecryptService.decryptImage(imagePath, uid)
      
      if (result.hasEncryptedData && result.metadata) {
        return result.metadata
      }

      if (result.hasEncryptedData && !result.metadata) {
        logger.warn(`Image ${imagePath} contains encrypted data but failed to decrypt.`)
      }

      return null
    } catch (error) {
      logger.error(`Failed to extract game metadata from ${imagePath}:`, error)
      return null
    }
  }

  // 解析相机参数
  static parseCameraParams(data: any): CameraParams | null {
    if (!data) return null

    try {
      // 如果是数组格式（nikki_albums 的格式）
      if (Array.isArray(data) && data.length >= 31) {
        return {
          focalLength: data[14],
          brightness: (data[22] - 0.3) / 1.2,
          contrast: (data[24] - 0.55) / 1.45,
          saturation: data[25],
          exposure: data[23],
          highlights: data[27],
          shadows: data[28],
          bloomIntensity: data[20] / 8,
          vignetteIntensity: data[19],
          filterId: data[29],
          filterStrength: data[30],
          portraitMode: data[1] === 1,
        }
      }

      // 如果是对象格式
      if (typeof data === 'object') {
        return {
          focalLength: data.focalLength || data.focal_length,
          aperture: data.aperture || data.fNumber,
          fov: data.fov,
          positionX: data.positionX || data.position_x,
          positionY: data.positionY || data.position_y,
          positionZ: data.positionZ || data.position_z,
          pitch: data.pitch,
          yaw: data.yaw,
          roll: data.roll,
          brightness: data.brightness,
          contrast: data.contrast,
          saturation: data.saturation,
          exposure: data.exposure,
          highlights: data.highlights,
          shadows: data.shadows,
          bloomIntensity: data.bloomIntensity || data.bloom_intensity,
          vignetteIntensity: data.vignetteIntensity || data.vignette_intensity,
          filterId: data.filterId || data.filter_id,
          filterStrength: data.filterStrength || data.filter_strength,
          portraitMode: data.portraitMode || data.portrait_mode,
          weatherType: data.weatherType || data.weather_type,
          gameTime: data.gameTime || data.game_time,
        }
      }

      return null
    } catch (error) {
      logger.error('Failed to parse camera params:', error)
      return null
    }
  }

  // 为图片提取并保存所有元数据
  static async extractAndSaveMetadata(imageId: string): Promise<boolean> {
    try {
      const image = ImageModel.findById(imageId)
      if (!image) {
        logger.warn(`Image not found: ${imageId}`)
        return false
      }

      // 提取 EXIF 数据
      const exifData = await this.extractExifData(image.path)
      
      // 尝试提取游戏元数据
      const gameMetadata = await this.extractGameMetadata(image.path)
      
      // 解析相机参数
      let cameraParams: CameraParams | null = null
      if (gameMetadata) {
        // 尝试从游戏元数据中提取相机参数
        if (gameMetadata.SocialPhoto?.PhotoInfo) {
          const info = gameMetadata.SocialPhoto.PhotoInfo
          const time = gameMetadata.SocialPhoto.Time
          cameraParams = {
            focalLength: info.cameraFocalLength,
            aperture: info.apertureSection,
            positionX: info.cameraComponentLocX,
            positionY: info.cameraComponentLocZ,
            positionZ: info.cameraComponentLocY,
            pitch: info.cameraComponentRotPitch,
            yaw: info.cameraComponentRotYaw,
            roll: info.cameraComponentRotRoll,
            filterId: info.filterId !== -1 ? String(info.filterId) : undefined,
            filterStrength: info.filterStrength,
            vignetteIntensity: info.vignetteIntensity,
            weatherType: gameMetadata.SocialPhoto.WeatherType,
            gameTime: time ? `${time.day}d ${time.hour}:${time.min}` : undefined,
          }
        } else if (gameMetadata.cameraParams || gameMetadata.CameraParams) {
          cameraParams = this.parseCameraParams(gameMetadata.cameraParams || gameMetadata.CameraParams)
        }
      }

      // 保存到数据库
      const updateData: Partial<Image> = {}
      
      const hasDefinedValues = (obj: any) => obj && Object.keys(obj).some(key => obj[key] !== undefined)

      if (hasDefinedValues(exifData)) {
        updateData.exifData = JSON.stringify(exifData)
      }
      
      if (hasDefinedValues(cameraParams)) {
        updateData.cameraParams = JSON.stringify(cameraParams)
      }
      
      if (gameMetadata && Object.keys(gameMetadata).length > 0) {
        updateData.gameMetadata = JSON.stringify(gameMetadata)
      }

      if (Object.keys(updateData).length > 0) {
        ImageModel.update(imageId, updateData)
        logger.info(`Metadata extracted for image ${imageId}`)
      } else {
        logger.info(`No meaningful metadata found for image ${imageId}`)
      }

      return true
    } catch (error) {
      logger.error(`Failed to extract metadata for image ${imageId}:`, error)
      return false
    }
  }

  // 批量提取元数据
  static async batchExtractMetadata(imageIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const imageId of imageIds) {
      try {
        const result = await this.extractAndSaveMetadata(imageId)
        if (result) {
          success++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }

    return { success, failed }
  }

  // 获取图片的完整元数据
  static async getImageMetadata(imageId: string): Promise<{
    exif: ExifData | null
    cameraParams: CameraParams | null
    gameMetadata: any | null
  }> {
    const image = ImageModel.findById(imageId)
    if (!image) {
      return { exif: null, cameraParams: null, gameMetadata: null }
    }

    return {
      exif: image.exifData ? JSON.parse(image.exifData) : null,
      cameraParams: image.cameraParams ? JSON.parse(image.cameraParams) : null,
      gameMetadata: image.gameMetadata ? JSON.parse(image.gameMetadata) : null,
    }
  }
}

export default MetadataService
