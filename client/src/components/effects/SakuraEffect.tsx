import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function SakuraEffect() {
  const [petals, setPetals] = useState<any[]>([])

  useEffect(() => {
    // Generate initial petals
    const newPetals = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // vw
      y: Math.random() * -100 - 10, // Start above screen
      size: Math.random() * 12 + 8, // 8px - 20px
      duration: Math.random() * 10 + 10, // 10s - 20s
      delay: Math.random() * -20, // Negative delay to pre-populate screen
      rotation: Math.random() * 360,
      opacity: Math.random() * 0.5 + 0.3,
    }))
    setPetals(newPetals)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute rounded-full"
          style={{
            left: `${petal.x}vw`,
            top: `${petal.y}vh`,
            width: petal.size,
            height: petal.size * 1.5, // Oval shape for petals
            background: 'radial-gradient(ellipse at center, #fbcfe8 0%, #f472b6 100%)',
            opacity: petal.opacity,
            borderRadius: '50% 0 50% 50%', // Classic petal shape
            boxShadow: '0 0 10px rgba(244, 114, 182, 0.4)',
          }}
          animate={{
            y: ['0vh', '120vh'],
            x: [`0vw`, `${Math.sin(petal.id) * 20}vw`],
            rotate: [petal.rotation, petal.rotation + 360 * (petal.id % 2 === 0 ? 1 : -1)],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
