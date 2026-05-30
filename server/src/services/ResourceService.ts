import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export enum ResourceType {
  LauncherCacheImages = 'LauncherCacheImages',
  MallPic = 'MallPic',
  Movies = 'Movies'
}

export interface ResourceInfo {
  type: ResourceType
  name: string
  description: string
  isImage: boolean
  onlyWindows: boolean
  isRequireInstall: boolean
  locate: string
}

export interface ResourceFile {
  path: string
  filename: string
  size: number
  lastModified: string
  extension: string
}

export interface ResourceResult {
  type: ResourceType
  path: string | null
  files: ResourceFile[]
  totalSize: number
}

// 资源配置信息
const resourcesInfoMap: Record<ResourceType, ResourceInfo> = {
  [ResourceType.LauncherCacheImages]: {
    type: ResourceType.LauncherCacheImages,
    name: '启动器缓存图片',
    description: '游戏启动器缓存的图片资源',
    isImage: true,
    onlyWindows: true,
    isRequireInstall: false,
    locate: 'C:\\Users\\$username$\\AppData\\Local\\InfinityNikki Launcher\\cache\\images'
  },
  [ResourceType.MallPic]: {
    type: ResourceType.MallPic,
    name: '商城图片',
    description: '游戏内商城展示图片',
    isImage: true,
    onlyWindows: false,
    isRequireInstall: true,
    locate: '\\X6Game\\Saved\\MallPic'
  },
  [ResourceType.Movies]: {
    type: ResourceType.Movies,
    name: '游戏影片',
    description: '游戏内过场动画和影片',
    isImage: false,
    onlyWindows: false,
    isRequireInstall: true,
    locate: '\\X6Game\\Content\\Movies'
  }
}

class ResourceService {
  // 获取资源信息
  getResourceInfo(type: ResourceType): ResourceInfo {
    return resourcesInfoMap[type]
  }

  // 获取所有资源类型信息
  getAllResourceInfo(): ResourceInfo[] {
    return Object.values(resourcesInfoMap)
  }

  // 获取资源路径
  getResourcePath(type: ResourceType, gamePath?: string): string | null {
    const info = resourcesInfoMap[type]

    // 仅Windows的资源
    if (info.onlyWindows) {
      if (process.platform !== 'win32') {
        return null
      }
      const username = os.userInfo().username
      return info.locate.replace('$username$', username)
    }

    // 需要游戏安装路径的资源
    if (info.isRequireInstall) {
      if (!gamePath) {
        return null
      }
      return path.join(gamePath, info.locate)
    }

    return null
  }

  // 扫描资源文件
  async scanResources(type: ResourceType, gamePath?: string): Promise<ResourceResult> {
    const info = resourcesInfoMap[type]
    const resourcePath = this.getResourcePath(type, gamePath)

    if (!resourcePath) {
      return {
        type,
        path: null,
        files: [],
        totalSize: 0
      }
    }

    const files = await this.scanDirectory(resourcePath, info.isImage)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    return {
      type,
      path: resourcePath,
      files,
      totalSize
    }
  }

  // 扫描目录
  private async scanDirectory(dirPath: string, isImage: boolean): Promise<ResourceFile[]> {
    const files: ResourceFile[] = []

    if (!fs.existsSync(dirPath)) {
      return files
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv']
    const validExtensions = isImage ? imageExtensions : videoExtensions

    const scan = async (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name)

          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (validExtensions.includes(ext)) {
              try {
                const stat = fs.statSync(fullPath)
                files.push({
                  path: fullPath,
                  filename: entry.name,
                  size: stat.size,
                  lastModified: stat.mtime.toISOString(),
                  extension: ext
                })
              } catch (error) {
                // 忽略无法访问的文件
              }
            }
          } else if (entry.isDirectory()) {
            await scan(fullPath)
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    await scan(dirPath)
    return files
  }

  // 检查资源路径是否存在
  checkResourcePath(type: ResourceType, gamePath?: string): boolean {
    const resourcePath = this.getResourcePath(type, gamePath)
    if (!resourcePath) {
      return false
    }
    return fs.existsSync(resourcePath)
  }
}

export const resourceService = new ResourceService()
