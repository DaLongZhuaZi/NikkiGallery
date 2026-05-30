import * as fs from 'fs'
import * as path from 'path'
import configService from './ConfigService'

export interface GameAccount {
  uid: string
  nickname?: string
  avatarUrl?: string
  lastActive: string
  gamePath: string
  launcherChannel: string
  albumCount?: number
  imageCount?: number
}

export interface AccountConfig {
  accounts: GameAccount[]
  currentUid: string | null
}

class AccountService {
  private configPath: string
  private config: AccountConfig = {
    accounts: [],
    currentUid: null
  }

  constructor() {
    const dataDir = path.join(process.cwd(), 'data')
    this.configPath = path.join(dataDir, 'accounts.json')
    this.loadConfig()
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load account config:', error)
    }
  }

  private saveConfig(): void {
    try {
      const dataDir = path.dirname(this.configPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Failed to save account config:', error)
    }
  }

  // 获取所有账号
  getAccounts(): GameAccount[] {
    return this.config.accounts
  }

  // 获取当前账号
  getCurrentAccount(): GameAccount | null {
    if (!this.config.currentUid) return null
    return this.config.accounts.find(a => a.uid === this.config.currentUid) || null
  }

  // 添加或更新账号
  addAccount(account: Omit<GameAccount, 'lastActive'>): GameAccount {
    const existingIndex = this.config.accounts.findIndex(a => a.uid === account.uid)

    const newAccount: GameAccount = {
      ...account,
      lastActive: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      this.config.accounts[existingIndex] = {
        ...this.config.accounts[existingIndex],
        ...newAccount
      }
    } else {
      this.config.accounts.push(newAccount)
    }

    // 如果是第一个账号，自动设为当前账号
    if (this.config.accounts.length === 1 || !this.config.currentUid) {
      this.config.currentUid = account.uid
    }

    this.saveConfig()
    return newAccount
  }

  // 切换当前账号
  switchAccount(uid: string): GameAccount | null {
    const account = this.config.accounts.find(a => a.uid === uid)
    if (!account) return null

    this.config.currentUid = uid
    account.lastActive = new Date().toISOString()
    this.saveConfig()

    // 更新全局配置中的游戏路径
    configService.update({ gamePath: account.gamePath })

    return account
  }

  // 删除账号
  deleteAccount(uid: string): boolean {
    const index = this.config.accounts.findIndex(a => a.uid === uid)
    if (index < 0) return false

    this.config.accounts.splice(index, 1)

    // 如果删除的是当前账号，切换到第一个账号
    if (this.config.currentUid === uid) {
      this.config.currentUid = this.config.accounts.length > 0
        ? this.config.accounts[0].uid
        : null
    }

    this.saveConfig()
    return true
  }

  // 从游戏目录自动发现账号
  async discoverAccounts(gamePath: string): Promise<GameAccount[]> {
    const discovered: GameAccount[] = []

    // 扫描 GamePlayPhotos 目录下的 UID 文件夹
    const photosPath = path.join(gamePath, 'X6Game', 'Saved', 'GamePlayPhotos')

    if (fs.existsSync(photosPath)) {
      try {
        const entries = fs.readdirSync(photosPath, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory() && /^\d{6,12}$/.test(entry.name)) {
            const uid = entry.name
            const albumPath = path.join(photosPath, uid)

            // 统计图片数量
            let imageCount = 0
            try {
              const albums = fs.readdirSync(albumPath, { withFileTypes: true })
              for (const album of albums) {
                if (album.isDirectory()) {
                  const albumDir = path.join(albumPath, album.name)
                  const files = fs.readdirSync(albumDir)
                  imageCount += files.filter(f =>
                    /\.(jpg|jpeg|png|webp|bmp)$/i.test(f)
                  ).length
                }
              }
            } catch (e) {
              // 忽略统计错误
            }

            // 尝试获取头像
            const avatarPath = path.join(albumPath, 'CustomAvatar')
            let avatarUrl: string | undefined
            if (fs.existsSync(avatarPath)) {
              const avatars = fs.readdirSync(avatarPath)
              if (avatars.length > 0) {
                avatarUrl = `/api/images/avatar/${uid}/${avatars[0]}`
              }
            }

            discovered.push({
              uid,
              lastActive: new Date().toISOString(),
              gamePath,
              launcherChannel: 'paper', // 默认
              imageCount,
              avatarUrl
            })
          }
        }
      } catch (e) {
        console.error('Failed to discover accounts:', e)
      }
    }

    // 合并到现有账号列表
    for (const account of discovered) {
      const existing = this.config.accounts.find(a => a.uid === account.uid)
      if (existing) {
        // 更新现有账号信息
        existing.imageCount = account.imageCount
        existing.avatarUrl = account.avatarUrl || existing.avatarUrl
      } else {
        this.config.accounts.push(account)
      }
    }

    this.saveConfig()
    return discovered
  }

  // 获取账号统计信息
  getAccountStats(uid: string): {
    albumCount: number
    imageCount: number
    videoCount: number
    totalSize: number
  } | null {
    const account = this.config.accounts.find(a => a.uid === uid)
    if (!account) return null

    const photosPath = path.join(account.gamePath, 'X6Game', 'Saved', 'GamePlayPhotos', uid)

    let albumCount = 0
    let imageCount = 0
    let videoCount = 0
    let totalSize = 0

    if (fs.existsSync(photosPath)) {
      try {
        const albums = fs.readdirSync(photosPath, { withFileTypes: true })

        for (const album of albums) {
          if (album.isDirectory()) {
            albumCount++
            const albumDir = path.join(photosPath, album.name)
            const files = fs.readdirSync(albumDir)

            for (const file of files) {
              const filePath = path.join(albumDir, file)
              try {
                const stat = fs.statSync(filePath)
                totalSize += stat.size

                if (/\.(jpg|jpeg|png|webp|bmp)$/i.test(file)) {
                  imageCount++
                } else if (/\.(mp4|avi|mov)$/i.test(file)) {
                  videoCount++
                }
              } catch (e) {
                // 忽略文件访问错误
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to get account stats:', e)
      }
    }

    return { albumCount, imageCount, videoCount, totalSize }
  }
}

export const accountService = new AccountService()
export default accountService
