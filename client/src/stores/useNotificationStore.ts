import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean

  addNotification: (type: NotificationType, title: string, message: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (id: string) => void
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
}

let nextId = 1

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (type, title, message) => {
    const notification: Notification = {
      id: String(nextId++),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    }
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // 最多保留50条
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set(state => {
      const notification = state.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        return {
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }
      }
      return {}
    })
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },

  removeNotification: (id) => {
    set(state => {
      const notification = state.notifications.find(n => n.id === id)
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }
    })
  },

  togglePanel: () => {
    set(state => ({ isOpen: !state.isOpen }))
  },

  setPanelOpen: (open) => {
    set({ isOpen: open })
  },
}))
