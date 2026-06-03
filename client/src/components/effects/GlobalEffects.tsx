import { useTheme } from '@/contexts/ThemeContext'
import SakuraEffect from './SakuraEffect'
import CyberEffect from './CyberEffect'
import CrystalEffect from './CrystalEffect'
import StarryEffect from './StarryEffect'
import EmberEffect from './EmberEffect'
import { AnimatePresence, motion } from 'framer-motion'

export default function GlobalEffects() {
  const { mode } = useTheme()

  const renderEffect = () => {
    switch (mode) {
      case 'nikki-fantasy':
        return <SakuraEffect />
      case 'cyber-neon':
        return <CyberEffect />
      case 'crystal-palace':
        return <CrystalEffect />
      case 'starry-night':
        return <StarryEffect />
      case 'abyss-dark':
        return <EmberEffect />
      default:
        return null
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      >
        {renderEffect()}
      </motion.div>
    </AnimatePresence>
  )
}
