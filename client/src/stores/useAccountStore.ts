import { create } from 'zustand'
import {
  type GameAccount,
  type AccountStats,
  getAccounts,
  getCurrentAccount,
  addAccount as addAccountApi,
  switchAccount as switchAccountApi,
  deleteAccount as deleteAccountApi,
  discoverAccounts as discoverAccountsApi,
  getAccountStats as getAccountStatsApi
} from '../api/accounts'

// 重新导出类型
export type { GameAccount, AccountStats }

interface AccountStore {
  // 状态
  accounts: GameAccount[]
  currentUid: string | null
  currentAccount: GameAccount | null
  accountStats: Record<string, AccountStats>
  isLoading: boolean
  error: string | null

  // 操作
  loadAccounts: () => Promise<void>
  addAccount: (account: { uid: string; nickname?: string; gamePath: string; launcherChannel?: string }) => Promise<void>
  switchAccount: (uid: string) => Promise<void>
  deleteAccount: (uid: string) => Promise<void>
  discoverAccounts: (gamePath: string) => Promise<GameAccount[]>
  loadAccountStats: (uid: string) => Promise<void>
  clearError: () => void
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  // 初始状态
  accounts: [],
  currentUid: null,
  currentAccount: null,
  accountStats: {},
  isLoading: false,
  error: null,

  // 加载所有账号
  loadAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const { accounts, currentUid } = await getAccounts()
      const currentAccount = accounts.find(a => a.uid === currentUid) || null
      set({
        accounts,
        currentUid,
        currentAccount,
        isLoading: false
      })
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to load accounts'
      })
    }
  },

  // 添加账号
  addAccount: async (account) => {
    set({ isLoading: true, error: null })
    try {
      await addAccountApi(account)
      await get().loadAccounts()
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to add account'
      })
    }
  },

  // 切换账号
  switchAccount: async (uid) => {
    set({ isLoading: true, error: null })
    try {
      await switchAccountApi(uid)
      await get().loadAccounts()
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to switch account'
      })
    }
  },

  // 删除账号
  deleteAccount: async (uid) => {
    set({ isLoading: true, error: null })
    try {
      await deleteAccountApi(uid)
      await get().loadAccounts()
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to delete account'
      })
    }
  },

  // 自动发现账号
  discoverAccounts: async (gamePath) => {
    set({ isLoading: true, error: null })
    try {
      const accounts = await discoverAccountsApi(gamePath)
      await get().loadAccounts()
      set({ isLoading: false })
      return accounts
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to discover accounts'
      })
      return []
    }
  },

  // 加载账号统计
  loadAccountStats: async (uid) => {
    try {
      const stats = await getAccountStatsApi(uid)
      set(state => ({
        accountStats: {
          ...state.accountStats,
          [uid]: stats
        }
      }))
    } catch (error) {
      console.error('Failed to load account stats:', error)
    }
  },

  // 清除错误
  clearError: () => set({ error: null })
}))

export default useAccountStore
