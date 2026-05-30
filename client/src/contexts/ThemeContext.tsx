import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// 5种主题色方案 - 参考 nikki_albums
export type ThemeMode = 'light' | 'dark' | 'sky-blue' | 'sakura-pink' | 'warm-yellow'

interface ColorScheme {
  // 基础色
  primary: string
  primaryHover: string
  primaryActive: string
  primaryLight: string
  
  // 背景色
  bgMain: string
  bgCard: string
  bgSidebar: string
  bgHeader: string
  bgHover: string
  bgActive: string
  bgInput: string
  
  // 文字色
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  
  // 边框色
  border: string
  borderLight: string
  borderFocus: string
  
  // 状态色
  success: string
  warning: string
  error: string
  info: string
  
  // 阴影
  shadowSm: string
  shadowMd: string
  shadowLg: string
  
  // 特殊效果
  glassBg: string
  glassBorder: string
  gradientStart: string
  gradientEnd: string
}

const colorSchemes: Record<ThemeMode, ColorScheme> = {
  light: {
    primary: '#ec4899',
    primaryHover: '#db2777',
    primaryActive: '#be185d',
    primaryLight: '#fdf2f8',
    
    bgMain: '#f8fafc',
    bgCard: '#ffffff',
    bgSidebar: 'rgba(255, 255, 255, 0.9)',
    bgHeader: 'rgba(255, 255, 255, 0.8)',
    bgHover: '#fdf2f8',
    bgActive: '#fce7f3',
    bgInput: '#ffffff',
    
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
    
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderFocus: '#ec4899',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(236, 72, 153, 0.1)',
    gradientStart: '#ec4899',
    gradientEnd: '#8b5cf6',
  },
  
  dark: {
    primary: '#f472b6',
    primaryHover: '#ec4899',
    primaryActive: '#db2777',
    primaryLight: 'rgba(244, 114, 182, 0.1)',
    
    bgMain: '#0f172a',
    bgCard: '#1e293b',
    bgSidebar: 'rgba(30, 41, 59, 0.95)',
    bgHeader: 'rgba(15, 23, 42, 0.9)',
    bgHover: 'rgba(244, 114, 182, 0.08)',
    bgActive: 'rgba(244, 114, 182, 0.15)',
    bgInput: '#334155',
    
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    textInverse: '#0f172a',
    
    border: '#334155',
    borderLight: '#1e293b',
    borderFocus: '#f472b6',
    
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    
    glassBg: 'rgba(30, 41, 59, 0.8)',
    glassBorder: 'rgba(244, 114, 182, 0.2)',
    gradientStart: '#f472b6',
    gradientEnd: '#a78bfa',
  },
  
  'sky-blue': {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryActive: '#0369a1',
    primaryLight: '#f0f9ff',
    
    bgMain: '#f0f9ff',
    bgCard: '#ffffff',
    bgSidebar: 'rgba(255, 255, 255, 0.92)',
    bgHeader: 'rgba(240, 249, 255, 0.85)',
    bgHover: '#e0f2fe',
    bgActive: '#bae6fd',
    bgInput: '#ffffff',
    
    textPrimary: '#0c4a6e',
    textSecondary: '#0369a1',
    textTertiary: '#7dd3fc',
    textInverse: '#ffffff',
    
    border: '#bae6fd',
    borderLight: '#e0f2fe',
    borderFocus: '#0ea5e9',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
    
    shadowSm: '0 1px 2px rgba(14, 165, 233, 0.08)',
    shadowMd: '0 4px 6px -1px rgba(14, 165, 233, 0.12)',
    shadowLg: '0 10px 15px -3px rgba(14, 165, 233, 0.15)',
    
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(14, 165, 233, 0.15)',
    gradientStart: '#0ea5e9',
    gradientEnd: '#6366f1',
  },
  
  'sakura-pink': {
    primary: '#e879a8',
    primaryHover: '#d4567a',
    primaryActive: '#c0385e',
    primaryLight: '#fff1f5',
    
    bgMain: '#fff5f7',
    bgCard: '#ffffff',
    bgSidebar: 'rgba(255, 255, 255, 0.92)',
    bgHeader: 'rgba(255, 245, 247, 0.85)',
    bgHover: '#ffe4ec',
    bgActive: '#ffd1dc',
    bgInput: '#ffffff',
    
    textPrimary: '#4a1d35',
    textSecondary: '#8b4367',
    textTertiary: '#d4a0b5',
    textInverse: '#ffffff',
    
    border: '#ffd1dc',
    borderLight: '#ffe4ec',
    borderFocus: '#e879a8',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#e879a8',
    
    shadowSm: '0 1px 2px rgba(232, 121, 168, 0.1)',
    shadowMd: '0 4px 6px -1px rgba(232, 121, 168, 0.15)',
    shadowLg: '0 10px 15px -3px rgba(232, 121, 168, 0.2)',
    
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(232, 121, 168, 0.15)',
    gradientStart: '#e879a8',
    gradientEnd: '#c084fc',
  },
  
  'warm-yellow': {
    primary: '#f59e0b',
    primaryHover: '#d97706',
    primaryActive: '#b45309',
    primaryLight: '#fffbeb',
    
    bgMain: '#fffbf0',
    bgCard: '#ffffff',
    bgSidebar: 'rgba(255, 255, 255, 0.92)',
    bgHeader: 'rgba(255, 251, 240, 0.85)',
    bgHover: '#fef3c7',
    bgActive: '#fde68a',
    bgInput: '#ffffff',
    
    textPrimary: '#451a03',
    textSecondary: '#92400e',
    textTertiary: '#d4a574',
    textInverse: '#ffffff',
    
    border: '#fde68a',
    borderLight: '#fef3c7',
    borderFocus: '#f59e0b',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#f59e0b',
    
    shadowSm: '0 1px 2px rgba(245, 158, 11, 0.08)',
    shadowMd: '0 4px 6px -1px rgba(245, 158, 11, 0.12)',
    shadowLg: '0 10px 15px -3px rgba(245, 158, 11, 0.15)',
    
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(245, 158, 11, 0.15)',
    gradientStart: '#f59e0b',
    gradientEnd: '#ef4444',
  },
}

interface ThemeContextType {
  mode: ThemeMode
  scheme: ColorScheme
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'nikki-gallery-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && saved in colorSchemes) return saved as ThemeMode
    // 检测系统暗色模式偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'sakura-pink' // 默认樱花粉，更有暖暖特色
  })

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(THEME_STORAGE_KEY, newMode)
  }, [])

  const toggleDark = useCallback(() => {
    setMode(mode === 'dark' ? 'sakura-pink' : 'dark')
  }, [mode, setMode])

  const isDark = mode === 'dark'
  const scheme = colorSchemes[mode]

  // 应用 CSS 变量到 document
  useEffect(() => {
    const root = document.documentElement
    Object.entries(scheme).forEach(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, value)
    })
    // 设置 body 类名用于 Tailwind dark: 前缀
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [scheme, isDark])

  return (
    <ThemeContext.Provider value={{ mode, scheme, isDark, setMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export { colorSchemes }
