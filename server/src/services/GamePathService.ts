import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import logger from '../utils/logger'

const execAsync = promisify(exec)

export interface GamePathInfo {
  gamePath: string
  gameVersion?: string
  screenshotFolders: ScreenshotFolder[]
  launchOptions?: LaunchOption[]
}

export interface ScreenshotFolder {
  name: string
  path: string
  type: 'official' | 'custom' | 'backup' | 'unknown'
  description: string
  fileCount?: number
  lastModified?: string
}

export interface LaunchOption {
  id: string
  name: string
  exePath: string
  platform: 'official' | 'steam' | 'epic' | 'custom'
  icon?: string
  workingDir?: string
}

export interface GamePathEntry {
  id: string
  path: string
  name: string
  platform: 'official' | 'steam' | 'epic' | 'custom'
  isActive: boolean
  lastUsed?: string
  addedAt: string
}

export class GamePathService {
  // 无限暖暖常见的截图文件夹名称
  private readonly SCREENSHOT_FOLDER_NAMES = [
    // 官方截图文件夹
    'ScreenShot',
    'ScreenShots',
    'Screenshot',
    'Screenshots',
    'Screens',
    
    // 游戏内截图
    'GameScreenShot',
    'GameScreenShots',
    'GameScreenshot',
    'GameScreenshots',
    
    // 相册相关
    'Album',
    'Albums',
    'Photo',
    'Photos',
    'Gallery',
    'Snapshots',
    
    // 自定义截图
    'CustomScreenShot',
    'CustomScreenshots',
    'UserScreenshots',
    'MyScreenshots',
    
    // 备份
    'ScreenshotBackup',
    'ScreenShotBackup',
    
    // 其他可能的名称
    'Capture',
    'Captures',
    'Records',
    'Shots',
  ]

  // 游戏可执行文件名称
  private readonly GAME_EXECUTABLE_NAMES = [
    'InfinityNikki.exe',
    'Infinity Nikki.exe',
    'InfinityNikki',
    'Infinity Nikki',
  ]

  /**
   * 自动检测游戏安装路径
   */
  async detectGamePath(): Promise<string | null> {
    try {
      // 1. 先检查常见安装路径（自动检测所有磁盘）
      const commonPaths = await this.getCommonInstallPaths()
      for (const basePath of commonPaths) {
        const found = await this.checkDirectoryForGame(basePath)
        if (found) {
          logger.info(`Found game at common path: ${found}`)
          return found
        }
      }

      // 2. 使用 Windows 搜索（如果在 Windows 上）
      if (process.platform === 'win32') {
        const windowsPath = await this.searchWindowsRegistry()
        if (windowsPath) {
          logger.info(`Found game via Windows registry: ${windowsPath}`)
          return windowsPath
        }

        // 3. 搜索 Program Files
        const programFilesPath = await this.searchProgramFiles()
        if (programFilesPath) {
          logger.info(`Found game in Program Files: ${programFilesPath}`)
          return programFilesPath
        }

        // 4. 使用 where/find 命令搜索
        const searchPath = await this.searchFileSystem()
        if (searchPath) {
          logger.info(`Found game via file system search: ${searchPath}`)
          return searchPath
        }
      }

      logger.warn('Game installation not found')
      return null
    } catch (error) {
      logger.error('Error detecting game path:', error)
      return null
    }
  }

  /**
   * 获取Windows可用磁盘驱动器
   */
  private async getAvailableDrives(): Promise<string[]> {
    const drives: string[] = []

    if (process.platform === 'win32') {
      try {
        // 使用 PowerShell 获取所有可用磁盘
        const { stdout } = await execAsync(
          'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Name"',
          { timeout: 5000 }
        )
        const driveLetters = stdout.trim().split('\n').map(d => d.trim()).filter(d => d)
        for (const letter of driveLetters) {
          drives.push(`${letter}:`)
        }
      } catch {
        // 备用方案：使用 wmic
        try {
          const { stdout } = await execAsync(
            'wmic logicaldisk get caption',
            { timeout: 5000 }
          )
          const matches = stdout.match(/[A-Z]:/g)
          if (matches) {
            drives.push(...matches)
          }
        } catch {
          // 最终回退：常见盘符
          drives.push('C:', 'D:', 'E:', 'F:', 'G:', 'H:')
        }
      }
    }

    return drives
  }

  /**
   * 获取常见安装路径
   */
  private async getCommonInstallPaths(): Promise<string[]> {
    const paths: string[] = []

    if (process.platform === 'win32') {
      // 自动检测所有可用磁盘
      const drives = await this.getAvailableDrives()
      logger.info(`Detected drives: ${drives.join(', ')}`)

      const programDirs = ['Program Files', 'Program Files (x86)']
      const gameDirs = [
        'InfinityNikki',
        'Infinity Nikki',
        'InfinityNikki_Global',
        'InfinityNikki_global',
        'HoYoverse\\InfinityNikki',
        'PapeGames\\InfinityNikki',
      ]

      for (const drive of drives) {
        for (const progDir of programDirs) {
          for (const gameDir of gameDirs) {
            paths.push(`${drive}\\${progDir}\\${gameDir}`)
          }
        }
        // 直接在根目录
        paths.push(`${drive}\\InfinityNikki`)
        paths.push(`${drive}\\Infinity Nikki`)
        // 常见游戏安装目录
        paths.push(`${drive}\\Games\\InfinityNikki`)
        paths.push(`${drive}\\Games\\Infinity Nikki`)
        // Steam 路径
        paths.push(`${drive}\\Steam\\steamapps\\common\\InfinityNikki`)
        paths.push(`${drive}\\SteamLibrary\\steamapps\\common\\InfinityNikki`)
        // Epic Games 路径
        paths.push(`${drive}\\Epic Games\\InfinityNikki`)
      }
    } else if (process.platform === 'darwin') {
      const home = process.env.HOME || ''
      paths.push(
        '/Applications/InfinityNikki.app',
        `${home}/Applications/InfinityNikki.app`,
        `${home}/Library/Application Support/InfinityNikki`,
      )
    } else {
      const home = process.env.HOME || ''
      paths.push(
        `${home}/.local/share/InfinityNikki`,
        `${home}/InfinityNikki`,
        '/opt/InfinityNikki',
      )
    }

    return paths
  }

  /**
   * 检查目录是否包含游戏
   */
  private async checkDirectoryForGame(dirPath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(dirPath)
      if (!stat.isDirectory()) {
        return null
      }

      // 检查是否有游戏可执行文件
      for (const exeName of this.GAME_EXECUTABLE_NAMES) {
        const exePath = path.join(dirPath, exeName)
        try {
          await fs.access(exePath)
          return dirPath
        } catch {
          // 继续检查下一个
        }
      }

      // 检查子目录
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(dirPath, entry.name)
          for (const exeName of this.GAME_EXECUTABLE_NAMES) {
            const exePath = path.join(subPath, exeName)
            try {
              await fs.access(exePath)
              return subPath
            } catch {
              // 继续
            }
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * 搜索 Windows 注册表
   */
  private async searchWindowsRegistry(): Promise<string | null> {
    try {
      // 尝试从注册表获取安装路径
      const { stdout } = await execAsync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "InfinityNikki" /d',
        { timeout: 10000 }
      )

      const match = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
      if (match && match[1]) {
        const installPath = match[1].trim()
        const gamePath = await this.checkDirectoryForGame(installPath)
        return gamePath
      }
    } catch {
      // 注册表搜索失败，继续其他方法
    }
    return null
  }

  /**
   * 搜索 Program Files 目录
   */
  private async searchProgramFiles(): Promise<string | null> {
    const programDirs = [
      process.env.ProgramFiles || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      process.env.ProgramData || 'C:\\ProgramData',
    ]

    for (const progDir of programDirs) {
      try {
        const entries = await fs.readdir(progDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const dirName = entry.name.toLowerCase()
            if (dirName.includes('infinitynikki') || dirName.includes('infinity nikki') || dirName.includes('hoyoverse')) {
              const fullPath = path.join(progDir, entry.name)
              const gamePath = await this.checkDirectoryForGame(fullPath)
              if (gamePath) return gamePath
            }
          }
        }
      } catch {
        // 继续搜索
      }
    }
    return null
  }

  /**
   * 使用文件系统搜索（搜索所有可用磁盘）
   */
  private async searchFileSystem(): Promise<string | null> {
    try {
      const drives = await this.getAvailableDrives()
      // 限制超时，每个驱动器最多15秒
      const timeoutPerDrive = 15000

      for (const drive of drives) {
        try {
          const { stdout } = await execAsync(
            `where /R ${drive}\\ InfinityNikki.exe 2>nul`,
            { timeout: timeoutPerDrive }
          )

          const lines = stdout.trim().split('\n')
          if (lines.length > 0 && lines[0]) {
            const exePath = lines[0].trim()
            return path.dirname(exePath)
          }
        } catch {
          // 该驱动器搜索超时或失败，继续下一个
          continue
        }
      }
    } catch {
      // 搜索失败
    }
    return null
  }

  /**
   * 获取游戏目录下的截图文件夹
   */
  async findScreenshotFolders(gamePath: string): Promise<ScreenshotFolder[]> {
    const folders: ScreenshotFolder[] = []

    try {
      const entries = await fs.readdir(gamePath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderName = entry.name
          const folderPath = path.join(gamePath, folderName)
          const lowerName = folderName.toLowerCase()

          // 检查是否是截图文件夹
          const isScreenshotFolder = this.SCREENSHOT_FOLDER_NAMES.some(
            name => lowerName.includes(name.toLowerCase())
          )

          if (isScreenshotFolder || await this.containsImages(folderPath)) {
            const folderInfo = await this.getFolderInfo(folderPath)
            folders.push({
              name: folderName,
              path: folderPath,
              type: this.classifyFolder(folderName),
              description: this.getFolderDescription(folderName),
              ...folderInfo,
            })
          }
        }
      }

      // 递归搜索一级子目录
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(gamePath, entry.name)
          try {
            const subEntries = await fs.readdir(subPath, { withFileTypes: true })
            for (const subEntry of subEntries) {
              if (subEntry.isDirectory()) {
                const subFolderName = subEntry.name
                const subFolderPath = path.join(subPath, subFolderName)
                const lowerSubName = subFolderName.toLowerCase()

                const isScreenshotFolder = this.SCREENSHOT_FOLDER_NAMES.some(
                  name => lowerSubName.includes(name.toLowerCase())
                )

                if (isScreenshotFolder) {
                  const folderInfo = await this.getFolderInfo(subFolderPath)
                  folders.push({
                    name: `${entry.name}/${subFolderName}`,
                    path: subFolderPath,
                    type: this.classifyFolder(subFolderName),
                    description: this.getFolderDescription(subFolderName),
                    ...folderInfo,
                  })
                }
              }
            }
          } catch {
            // 无权访问子目录，跳过
          }
        }
      }
    } catch (error) {
      logger.error('Error finding screenshot folders:', error)
    }

    return folders
  }

  /**
   * 检查文件夹是否包含图片
   */
  private async containsImages(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
      return entries.some(entry => {
        const ext = path.extname(entry).toLowerCase()
        return imageExtensions.includes(ext)
      })
    } catch {
      return false
    }
  }

  /**
   * 获取文件夹信息
   */
  private async getFolderInfo(dirPath: string): Promise<{ fileCount?: number; lastModified?: string }> {
    try {
      const entries = await fs.readdir(dirPath)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
      const imageFiles = entries.filter(entry => {
        const ext = path.extname(entry).toLowerCase()
        return imageExtensions.includes(ext)
      })

      const stat = await fs.stat(dirPath)

      return {
        fileCount: imageFiles.length,
        lastModified: stat.mtime.toISOString(),
      }
    } catch {
      return {}
    }
  }

  /**
   * 分类文件夹类型
   */
  private classifyFolder(name: string): 'official' | 'custom' | 'backup' | 'unknown' {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('backup') || lowerName.includes('bak')) {
      return 'backup'
    }
    if (lowerName.includes('custom') || lowerName.includes('user') || lowerName.includes('my')) {
      return 'custom'
    }
    if (lowerName.includes('screenshot') || lowerName.includes('screen') || lowerName.includes('photo')) {
      return 'official'
    }
    return 'unknown'
  }

  /**
   * 获取文件夹描述
   */
  private getFolderDescription(name: string): string {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('screenshot') || lowerName.includes('screen')) {
      return '游戏内截图'
    }
    if (lowerName.includes('photo') || lowerName.includes('album')) {
      return '游戏相册'
    }
    if (lowerName.includes('custom') || lowerName.includes('user')) {
      return '自定义截图'
    }
    if (lowerName.includes('backup') || lowerName.includes('bak')) {
      return '备份文件夹'
    }
    if (lowerName.includes('capture') || lowerName.includes('record')) {
      return '录制内容'
    }
    return '图片文件夹'
  }

  /**
   * 获取完整的游戏路径信息
   */
  async getGamePathInfo(gamePath?: string): Promise<GamePathInfo | null> {
    let detectedPath = gamePath

    if (!detectedPath) {
      detectedPath = await this.detectGamePath() || undefined
    }

    if (!detectedPath) {
      return null
    }

    const screenshotFolders = await this.findScreenshotFolders(detectedPath)
    const launchOptions = await this.findLaunchOptions(detectedPath)

    return {
      gamePath: detectedPath,
      screenshotFolders,
      launchOptions,
    }
  }

  /**
   * 查找游戏启动选项
   */
  async findLaunchOptions(gamePath: string): Promise<LaunchOption[]> {
    const options: LaunchOption[] = []

    try {
      const entries = await fs.readdir(gamePath, { withFileTypes: true })

      // 查找所有可执行文件
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.exe')) {
          const lowerName = entry.name.toLowerCase()
          const exePath = path.join(gamePath, entry.name)

          // 识别游戏主程序
          if (lowerName.includes('infinitynikki') || lowerName.includes('infinity nikki')) {
            options.push({
              id: 'official',
              name: '无限暖暖 (官方启动器)',
              exePath,
              platform: 'official',
              workingDir: gamePath,
            })
          }

          // 识别启动器
          if (lowerName.includes('launcher')) {
            options.push({
              id: 'launcher',
              name: '游戏启动器',
              exePath,
              platform: 'official',
              workingDir: gamePath,
            })
          }
        }
      }

      // 检查 Steam 启动
      const steamPath = await this.findSteamPath()
      if (steamPath) {
        options.push({
          id: 'steam',
          name: '通过 Steam 启动',
          exePath: steamPath,
          platform: 'steam',
        })
      }

      // 检查 Epic Games 启动
      const epicPath = await this.findEpicPath()
      if (epicPath) {
        options.push({
          id: 'epic',
          name: '通过 Epic Games 启动',
          exePath: epicPath,
          platform: 'epic',
        })
      }
    } catch (error) {
      logger.error('Error finding launch options:', error)
    }

    return options
  }

  /**
   * 查找 Steam 路径
   */
  private async findSteamPath(): Promise<string | null> {
    if (process.platform !== 'win32') return null

    try {
      // 从注册表获取 Steam 路径
      const { stdout } = await execAsync(
        'reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath',
        { timeout: 5000 }
      )

      const match = stdout.match(/SteamPath\s+REG_SZ\s+(.+)/i)
      if (match && match[1]) {
        const steamPath = match[1].trim()
        const steamExe = path.join(steamPath, 'steam.exe')
        
        try {
          await fs.access(steamExe)
          return steamExe
        } catch {
          // Steam 可执行文件不存在
        }
      }
    } catch {
      // 注册表查询失败
    }

    // 常见 Steam 路径
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steam.exe',
      'C:\\Program Files\\Steam\\steam.exe',
      'D:\\Steam\\steam.exe',
      'E:\\Steam\\steam.exe',
    ]

    for (const steamPath of commonPaths) {
      try {
        await fs.access(steamPath)
        return steamPath
      } catch {
        // 继续
      }
    }

    return null
  }

  /**
   * 查找 Epic Games 路径
   */
  private async findEpicPath(): Promise<string | null> {
    if (process.platform !== 'win32') return null

    try {
      // 从注册表获取 Epic Games 路径
      const { stdout } = await execAsync(
        'reg query "HKCU\\SOFTWARE\\Epic Games\\EOS" /v ModSdkCommand',
        { timeout: 5000 }
      )

      const match = stdout.match(/ModSdkCommand\s+REG_SZ\s+(.+)/i)
      if (match && match[1]) {
        const epicPath = match[1].trim()
        const epicExe = path.join(path.dirname(epicPath), 'EpicGamesLauncher.exe')
        
        try {
          await fs.access(epicExe)
          return epicExe
        } catch {
          // Epic Games 可执行文件不存在
        }
      }
    } catch {
      // 注册表查询失败
    }

    // 常见 Epic Games 路径
    const commonPaths = [
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
      'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
    ]

    for (const epicPath of commonPaths) {
      try {
        await fs.access(epicPath)
        return epicPath
      } catch {
        // 继续
      }
    }

    return null
  }

  /**
   * 启动游戏
   */
  async launchGame(option: LaunchOption): Promise<boolean> {
    try {
      logger.info(`Launching game: ${option.name} (${option.exePath})`)

      if (option.platform === 'steam') {
        // 通过 Steam 启动
        const steamProcess = spawn(option.exePath, ['-applaunch', '2379780'], {
          detached: true,
          stdio: 'ignore',
        })
        steamProcess.unref()
      } else if (option.platform === 'epic') {
        // 通过 Epic Games 启动
        const epicProcess = spawn(option.exePath, ['com.epicgames.launcher://apps/InfinityNikki'], {
          detached: true,
          stdio: 'ignore',
        })
        epicProcess.unref()
      } else {
        // 直接启动
        const gameProcess = spawn(option.exePath, [], {
          cwd: option.workingDir || path.dirname(option.exePath),
          detached: true,
          stdio: 'ignore',
        })
        gameProcess.unref()
      }

      logger.info(`Game launched successfully: ${option.name}`)
      return true
    } catch (error) {
      logger.error(`Failed to launch game: ${option.name}`, error)
      return false
    }
  }

  /**
   * 验证游戏路径
   */
  async validateGamePath(gamePath: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 检查目录是否存在
      const stat = await fs.stat(gamePath)
      if (!stat.isDirectory()) {
        errors.push('路径不是目录')
        return { valid: false, errors, warnings }
      }

      // 检查是否有游戏可执行文件
      let hasExe = false
      for (const exeName of this.GAME_EXECUTABLE_NAMES) {
        const exePath = path.join(gamePath, exeName)
        try {
          await fs.access(exePath)
          hasExe = true
          break
        } catch {
          // 继续
        }
      }

      if (!hasExe) {
        warnings.push('未找到游戏可执行文件，可能不是游戏安装目录')
      }

      // 检查是否有截图文件夹
      const screenshotFolders = await this.findScreenshotFolders(gamePath)
      if (screenshotFolders.length === 0) {
        warnings.push('未找到截图文件夹')
      }

      // 检查磁盘空间
      try {
        const { stdout } = await execAsync(
          `wmic logicaldisk where "DeviceID='${gamePath.charAt(0)}:'" get FreeSpace`,
          { timeout: 5000 }
        )
        const match = stdout.match(/(\d+)/)
        if (match) {
          const freeSpace = parseInt(match[1])
          const freeGB = freeSpace / (1024 * 1024 * 1024)
          if (freeGB < 1) {
            warnings.push(`磁盘剩余空间不足: ${freeGB.toFixed(2)} GB`)
          }
        }
      } catch {
        // 无法获取磁盘空间
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      errors.push(`无法访问路径: ${error}`)
      return { valid: false, errors, warnings }
    }
  }
}

export default new GamePathService()
