import { Router, Request, Response } from 'express'
import accountService from '../services/AccountService'

const router = Router()

// 获取所有账号
router.get('/', (req: Request, res: Response) => {
  try {
    const accounts = accountService.getAccounts()
    const current = accountService.getCurrentAccount()
    res.json({
      success: true,
      data: {
        accounts,
        currentUid: current?.uid || null
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get accounts'
    })
  }
})

// 获取当前账号
router.get('/current', (req: Request, res: Response) => {
  try {
    const account = accountService.getCurrentAccount()
    res.json({
      success: true,
      data: account
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get current account'
    })
  }
})

// 添加账号
router.post('/', (req: Request, res: Response) => {
  try {
    const { uid, nickname, gamePath, launcherChannel } = req.body

    if (!uid || !gamePath) {
      return res.status(400).json({
        success: false,
        error: 'uid and gamePath are required'
      })
    }

    const account = accountService.addAccount({
      uid,
      nickname,
      gamePath,
      launcherChannel: launcherChannel || 'paper'
    })

    res.json({
      success: true,
      data: account
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add account'
    })
  }
})

// 切换账号
router.post('/switch/:uid', (req: Request, res: Response) => {
  try {
    const { uid } = req.params
    const account = accountService.switchAccount(uid)

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      })
    }

    res.json({
      success: true,
      data: account
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to switch account'
    })
  }
})

// 删除账号
router.delete('/:uid', (req: Request, res: Response) => {
  try {
    const { uid } = req.params
    const success = accountService.deleteAccount(uid)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      })
    }

    res.json({
      success: true,
      message: 'Account deleted'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    })
  }
})

// 自动发现账号
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { gamePath } = req.body

    if (!gamePath) {
      return res.status(400).json({
        success: false,
        error: 'gamePath is required'
      })
    }

    const accounts = await accountService.discoverAccounts(gamePath)

    res.json({
      success: true,
      data: accounts
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to discover accounts'
    })
  }
})

// 获取账号统计信息
router.get('/:uid/stats', (req: Request, res: Response) => {
  try {
    const { uid } = req.params
    const stats = accountService.getAccountStats(uid)

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      })
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get account stats'
    })
  }
})

export default router
