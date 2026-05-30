import axios from 'axios'

const api = axios.create({
  baseURL: '/api/accounts',
  timeout: 10000
})

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

export interface AccountStats {
  albumCount: number
  imageCount: number
  videoCount: number
  totalSize: number
}

export interface AccountsResponse {
  accounts: GameAccount[]
  currentUid: string | null
}

// 获取所有账号
export const getAccounts = async (): Promise<AccountsResponse> => {
  const response = await api.get('/')
  return response.data.data
}

// 获取当前账号
export const getCurrentAccount = async (): Promise<GameAccount | null> => {
  const response = await api.get('/current')
  return response.data.data
}

// 添加账号
export const addAccount = async (account: {
  uid: string
  nickname?: string
  gamePath: string
  launcherChannel?: string
}): Promise<GameAccount> => {
  const response = await api.post('/', account)
  return response.data.data
}

// 切换账号
export const switchAccount = async (uid: string): Promise<GameAccount> => {
  const response = await api.post(`/switch/${uid}`)
  return response.data.data
}

// 删除账号
export const deleteAccount = async (uid: string): Promise<void> => {
  await api.delete(`/${uid}`)
}

// 自动发现账号
export const discoverAccounts = async (gamePath: string): Promise<GameAccount[]> => {
  const response = await api.post('/discover', { gamePath })
  return response.data.data
}

// 获取账号统计
export const getAccountStats = async (uid: string): Promise<AccountStats> => {
  const response = await api.get(`/${uid}/stats`)
  return response.data.data
}
