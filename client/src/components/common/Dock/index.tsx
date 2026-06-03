import { useRef, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { Home, Image, Map, RefreshCw, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { scanAll } from '@/api/album'
import toast from 'react-hot-toast'
import type { LucideIcon } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DockItemType = 'nav' | 'action'

interface DockItemDef {
  id: string
  type: DockItemType
  icon: LucideIcon
  label: string
  path: string // nav → route path, action → action key
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ITEMS: DockItemDef[] = [
  { id: 'home',    type: 'nav',    icon: Home,      label: '首页', path: '/' },
  { id: 'gallery', type: 'nav',    icon: Image,     label: '相册', path: '/gallery' },
  { id: 'map',     type: 'nav',    icon: Map,       label: '地图', path: '/map' },
  { id: 'scan',    type: 'action', icon: RefreshCw, label: '扫描', path: 'scan' },
  { id: 'search',  type: 'action', icon: Search,    label: '搜索', path: 'command' },
]

const DOCK_PADDING   = 12
const ICON_BASE_SIZE = 24   // w-6 h-6 icon
const ICON_PAD       = 12   // padding around icon inside its container
const ICON_GAP       = 8    // gap between icons
const SIGMA          = 70   // magnification radius
const MAX_SCALE      = 1.65
const LIFT_PX        = 14   // max vertical lift

// ─── DockIcon ────────────────────────────────────────────────────────────────

interface DockIconProps {
  item: DockItemDef
  index: number
  mouseX: ReturnType<typeof useMotionValue<number>>
  isActive: boolean
  onActivate: (item: DockItemDef) => void
}

function DockIcon({ item, index, mouseX, isActive, onActivate }: DockIconProps) {
  const { scheme } = useTheme()
  const Icon = item.icon

  // Center-X of this icon relative to the dock container
  const itemX = DOCK_PADDING + index * (ICON_BASE_SIZE + ICON_PAD * 2 + ICON_GAP) + (ICON_BASE_SIZE + ICON_PAD * 2) / 2

  // Gaussian magnification: scale based on distance from mouseX
  const scale = useTransform(mouseX, (mx: number) => {
    if (mx < -100) return 1 // no tracking
    const dist = Math.abs(mx - itemX)
    const g = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))
    return 1 + (MAX_SCALE - 1) * g
  })

  // Vertical lift (follows scale curve)
  const y = useTransform(scale, (s) => -((s - 1) / (MAX_SCALE - 1)) * LIFT_PX)

  // Spring for smooth easing
  const springScale = useSpring(scale, { stiffness: 350, damping: 28, mass: 0.6 })
  const springY     = useSpring(y,     { stiffness: 350, damping: 28, mass: 0.6 })

  // Label opacity — only fully visible when significantly magnified
  const labelOpacity = useTransform(springScale, [1, 1.25, 1.5], [0, 0.6, 1])

  return (
    <motion.button
      onClick={() => onActivate(item)}
      className="relative flex flex-col items-center justify-center rounded-2xl transition-colors duration-150"
      style={{
        width: ICON_BASE_SIZE + ICON_PAD * 2,
        height: ICON_BASE_SIZE + ICON_PAD * 2,
        scale: springScale,
        y: springY,
        background: isActive
          ? `linear-gradient(135deg, ${scheme.gradientStart}25, ${scheme.gradientEnd}25)`
          : 'transparent',
        boxShadow: isActive ? `0 0 14px ${scheme.primary}30` : 'none',
      }}
      whileTap={{ scale: 0.88 }}
      aria-label={item.label}
    >
      <Icon
        width={ICON_BASE_SIZE}
        height={ICON_BASE_SIZE}
        style={{
          color: isActive ? scheme.primary : scheme.textSecondary,
          filter: isActive ? `drop-shadow(0 0 6px ${scheme.primary}55)` : 'none',
        }}
      />

      {/* Floating label */}
      <motion.span
        className="pointer-events-none absolute whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-semibold"
        style={{
          bottom: -20,
          opacity: labelOpacity,
          background: scheme.bgCard,
          color: scheme.primary,
          border: `1px solid ${scheme.borderLight}`,
          boxShadow: scheme.shadowSm,
        }}
      >
        {item.label}
      </motion.span>

      {/* Active dot indicator */}
      {isActive && (
        <motion.span
          layoutId="dock-active-dot"
          className="absolute rounded-full"
          style={{
            bottom: -7,
            width: 4,
            height: 4,
            background: scheme.primary,
            boxShadow: `0 0 8px ${scheme.primary}99`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      )}
    </motion.button>
  )
}

// ─── Dock Component ──────────────────────────────────────────────────────────

export default function Dock() {
  const { scheme } = useTheme()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile]   = useState(false)

  const dockRef      = useRef<HTMLDivElement>(null)
  const mouseX       = useMotionValue(-Infinity)
  const dockY        = useMotionValue(0)
  const springDockY  = useSpring(dockY, { stiffness: 260, damping: 28 })

  const lastScrollY    = useRef(0)
  const isInteracting  = useRef(false)
  const touchStartPos  = useRef<{ x: number; y: number } | null>(null)
  const didDrag        = useRef(false)

  // ── Media query: only show on mobile ──────────────────────────────────────

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // ── Active-item detection ─────────────────────────────────────────────────

  const checkActive = useCallback(
    (item: DockItemDef) => {
      if (item.type !== 'nav') return false
      if (item.path === '/') return location.pathname === '/'
      return location.pathname.startsWith(item.path)
    },
    [location.pathname],
  )

  // ── Item activation (click / tap) ────────────────────────────────────────

  const handleActivate = useCallback(
    (item: DockItemDef) => {
      switch (item.path) {
        case 'scan':
          toast.promise(scanAll(), {
            loading: '正在扫描相册...',
            success: '相册扫描完成!',
            error: '扫描失败，请重试',
          })
          break
        case 'command':
          window.dispatchEvent(new CustomEvent('command-palette-open'))
          break
        default:
          navigate(item.path)
      }
    },
    [navigate],
  )

  // ── Scroll hide/show ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isMobile) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (isInteracting.current) { lastScrollY.current = y; return }
        if (y > lastScrollY.current + 8 && y > 60) {
          setIsVisible(false)
          dockY.set(120)
        } else if (y < lastScrollY.current - 8) {
          setIsVisible(true)
          dockY.set(0)
        }
        lastScrollY.current = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [isMobile, dockY])

  // ── Mouse magnification (works on desktop preview too) ───────────────────

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current) return
    const rect = dockRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
  }, [mouseX])

  const onMouseLeave = useCallback(() => {
    mouseX.set(-Infinity)
  }, [mouseX])

  // ── Touch magnification ──────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    didDrag.current = false
    isInteracting.current = true
    setIsVisible(true)
    dockY.set(0)
  }, [dockY])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dockRef.current || !touchStartPos.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y

    // Only magnify if horizontal movement dominates (let vertical scroll pass)
    if (Math.abs(dx) > Math.abs(dy) * 1.3 && Math.abs(dx) > 6) {
      didDrag.current = true
      const rect = dockRef.current.getBoundingClientRect()
      mouseX.set(touch.clientX - rect.left)
    }
  }, [mouseX])

  const onTouchEnd = useCallback(() => {
    mouseX.set(-Infinity)
    isInteracting.current = false
    touchStartPos.current = null
    didDrag.current = false
  }, [mouseX])

  // ── Bail out on desktop ──────────────────────────────────────────────────

  if (!isMobile) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center md:hidden"
          style={{
            y: springDockY,
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          {/* Dock shell */}
          <motion.div
            ref={dockRef}
            className="relative flex items-center rounded-[22px] overflow-visible"
            style={{
              paddingLeft: DOCK_PADDING,
              paddingRight: DOCK_PADDING,
              paddingTop: 8,
              paddingBottom: 8,
              gap: ICON_GAP,
              background: scheme.bgCard,
              backdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
              WebkitBackdropFilter: `blur(${scheme.glassBlur}) saturate(${scheme.glassSaturate})`,
              border: `1px solid ${scheme.border}`,
              boxShadow: `${scheme.shadowLg}, inset 0 1px 0 ${scheme.glassBorder}`,
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Top highlight edge (glass reflection) */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[22px]"
              style={{
                background: `linear-gradient(90deg, transparent 8%, ${scheme.glassBorder} 30%, ${scheme.primary}35 50%, ${scheme.glassBorder} 70%, transparent 92%)`,
              }}
            />

            {/* Icon items */}
            {ITEMS.map((item, i) => (
              <DockIcon
                key={item.id}
                item={item}
                index={i}
                mouseX={mouseX}
                isActive={checkActive(item)}
                onActivate={handleActivate}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
