import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'nikki-fantasy' | 'cyber-neon' | 'crystal-palace' | 'starry-night' | 'abyss-dark'

interface ColorScheme {
  primary: string
  primaryHover: string
  primaryActive: string
  primaryLight: string
  
  bgMain: string
  bgCard: string
  bgSidebar: string
  bgHeader: string
  bgHover: string
  bgActive: string
  bgInput: string
  
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  
  border: string
  borderLight: string
  borderFocus: string
  
  success: string
  warning: string
  error: string
  info: string
  
  shadowSm: string
  shadowMd: string
  shadowLg: string
  
  glassBg: string
  glassBorder: string
  glassBlur: string
  glassSaturate: string
  
  gradientStart: string
  gradientEnd: string
}

const colorSchemes: Record<ThemeMode, ColorScheme> = {
  'nikki-fantasy': {
    primary: '#f472b6',
    primaryHover: '#ec4899',
    primaryActive: '#db2777',
    primaryLight: 'rgba(244, 114, 182, 0.15)',
    
    bgMain: '#fff5f7',
    bgCard: 'rgba(255, 255, 255, 0.65)',
    bgSidebar: 'rgba(255, 255, 255, 0.75)',
    bgHeader: 'rgba(255, 245, 247, 0.7)',
    bgHover: 'rgba(255, 228, 236, 0.6)',
    bgActive: 'rgba(255, 209, 220, 0.8)',
    bgInput: 'rgba(255, 255, 255, 0.8)',
    
    textPrimary: '#4a1d35',
    textSecondary: '#8b4367',
    textTertiary: '#d4a0b5',
    textInverse: '#ffffff',
    
    border: 'rgba(255, 209, 220, 0.5)',
    borderLight: 'rgba(255, 228, 236, 0.5)',
    borderFocus: '#f472b6',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#e879a8',
    
    shadowSm: '0 2px 8px rgba(232, 121, 168, 0.1)',
    shadowMd: '0 8px 24px rgba(232, 121, 168, 0.15)',
    shadowLg: '0 16px 32px rgba(232, 121, 168, 0.2)',
    
    glassBg: 'rgba(255, 255, 255, 0.4)',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
    glassBlur: '12px',
    glassSaturate: '150%',
    
    gradientStart: '#f472b6',
    gradientEnd: '#818cf8',
  },
  
  'cyber-neon': {
    primary: '#00f0ff',
    primaryHover: '#00d0e0',
    primaryActive: '#00b0c0',
    primaryLight: 'rgba(0, 240, 255, 0.15)',
    
    bgMain: '#050510',
    bgCard: 'rgba(10, 10, 20, 0.7)',
    bgSidebar: 'rgba(5, 5, 12, 0.85)',
    bgHeader: 'rgba(5, 5, 15, 0.8)',
    bgHover: 'rgba(0, 240, 255, 0.1)',
    bgActive: 'rgba(0, 240, 255, 0.2)',
    bgInput: 'rgba(20, 20, 35, 0.8)',
    
    textPrimary: '#e0f8ff',
    textSecondary: '#00f0ff',
    textTertiary: '#ff003c',
    textInverse: '#050510',
    
    border: 'rgba(0, 240, 255, 0.3)',
    borderLight: 'rgba(255, 0, 60, 0.2)',
    borderFocus: '#00f0ff',
    
    success: '#39ff14',
    warning: '#ffed00',
    error: '#ff003c',
    info: '#00f0ff',
    
    shadowSm: '0 0 5px rgba(0, 240, 255, 0.2)',
    shadowMd: '0 0 15px rgba(0, 240, 255, 0.3)',
    shadowLg: '0 0 30px rgba(255, 0, 60, 0.4)',
    
    glassBg: 'rgba(5, 10, 20, 0.6)',
    glassBorder: 'rgba(0, 240, 255, 0.2)',
    glassBlur: '8px',
    glassSaturate: '120%',
    
    gradientStart: '#00f0ff',
    gradientEnd: '#ff003c',
  },
  
  'crystal-palace': {
    primary: '#2dd4bf',
    primaryHover: '#14b8a6',
    primaryActive: '#0f766e',
    primaryLight: 'rgba(45, 212, 191, 0.15)',
    
    bgMain: '#f0fdfa',
    bgCard: 'rgba(255, 255, 255, 0.5)',
    bgSidebar: 'rgba(240, 253, 250, 0.6)',
    bgHeader: 'rgba(255, 255, 255, 0.55)',
    bgHover: 'rgba(204, 251, 241, 0.6)',
    bgActive: 'rgba(153, 246, 228, 0.8)',
    bgInput: 'rgba(255, 255, 255, 0.7)',
    
    textPrimary: '#0f766e',
    textSecondary: '#14b8a6',
    textTertiary: '#5eead4',
    textInverse: '#ffffff',
    
    border: 'rgba(153, 246, 228, 0.5)',
    borderLight: 'rgba(204, 251, 241, 0.5)',
    borderFocus: '#2dd4bf',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#2dd4bf',
    
    shadowSm: '0 2px 10px rgba(45, 212, 191, 0.1)',
    shadowMd: '0 8px 30px rgba(45, 212, 191, 0.2)',
    shadowLg: '0 16px 40px rgba(45, 212, 191, 0.3)',
    
    glassBg: 'rgba(255, 255, 255, 0.25)',
    glassBorder: 'rgba(255, 255, 255, 0.7)',
    glassBlur: '16px',
    glassSaturate: '180%',
    
    gradientStart: '#2dd4bf',
    gradientEnd: '#38bdf8',
  },
  
  'starry-night': {
    primary: '#a78bfa',
    primaryHover: '#8b5cf6',
    primaryActive: '#7c3aed',
    primaryLight: 'rgba(167, 139, 250, 0.15)',
    
    bgMain: '#0f0c29',
    bgCard: 'rgba(30, 27, 75, 0.6)',
    bgSidebar: 'rgba(15, 12, 41, 0.8)',
    bgHeader: 'rgba(20, 15, 50, 0.7)',
    bgHover: 'rgba(139, 92, 246, 0.15)',
    bgActive: 'rgba(139, 92, 246, 0.25)',
    bgInput: 'rgba(46, 38, 109, 0.6)',
    
    textPrimary: '#f5f3ff',
    textSecondary: '#c4b5fd',
    textTertiary: '#8b5cf6',
    textInverse: '#0f0c29',
    
    border: 'rgba(139, 92, 246, 0.3)',
    borderLight: 'rgba(139, 92, 246, 0.15)',
    borderFocus: '#a78bfa',
    
    success: '#34d399',
    warning: '#fde047',
    error: '#f87171',
    info: '#60a5fa',
    
    shadowSm: '0 2px 10px rgba(139, 92, 246, 0.2)',
    shadowMd: '0 8px 30px rgba(139, 92, 246, 0.3)',
    shadowLg: '0 16px 40px rgba(139, 92, 246, 0.5)',
    
    glassBg: 'rgba(15, 12, 41, 0.4)',
    glassBorder: 'rgba(167, 139, 250, 0.2)',
    glassBlur: '12px',
    glassSaturate: '110%',
    
    gradientStart: '#8b5cf6',
    gradientEnd: '#fde047',
  },
  
  'abyss-dark': {
    primary: '#ef4444',
    primaryHover: '#dc2626',
    primaryActive: '#b91c1c',
    primaryLight: 'rgba(239, 68, 68, 0.15)',
    
    bgMain: '#000000',
    bgCard: 'rgba(20, 20, 20, 0.7)',
    bgSidebar: 'rgba(10, 10, 10, 0.85)',
    bgHeader: 'rgba(5, 5, 5, 0.8)',
    bgHover: 'rgba(239, 68, 68, 0.1)',
    bgActive: 'rgba(239, 68, 68, 0.2)',
    bgInput: 'rgba(30, 30, 30, 0.8)',
    
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    textTertiary: '#ef4444',
    textInverse: '#000000',
    
    border: 'rgba(239, 68, 68, 0.3)',
    borderLight: 'rgba(50, 50, 50, 0.5)',
    borderFocus: '#ef4444',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    shadowSm: '0 2px 8px rgba(0, 0, 0, 0.5)',
    shadowMd: '0 8px 24px rgba(0, 0, 0, 0.7)',
    shadowLg: '0 16px 40px rgba(239, 68, 68, 0.2)',
    
    glassBg: 'rgba(10, 10, 10, 0.6)',
    glassBorder: 'rgba(239, 68, 68, 0.15)',
    glassBlur: '10px',
    glassSaturate: '90%',
    
    gradientStart: '#ef4444',
    gradientEnd: '#000000',
  },
}

interface ThemeContextType {
  mode: ThemeMode
  scheme: ColorScheme
  isDark: boolean
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'nikki-gallery-epic-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && saved in colorSchemes) return saved as ThemeMode
    return 'nikki-fantasy'
  })

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(THEME_STORAGE_KEY, newMode)
  }, [])

  const isDark = ['cyber-neon', 'starry-night', 'abyss-dark'].includes(mode)
  const scheme = colorSchemes[mode]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(scheme).forEach(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, value)
    })
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [scheme, isDark])

  return (
    <ThemeContext.Provider value={{ mode, scheme, isDark, setMode }}>
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
