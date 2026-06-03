import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function EmberEffect() {
  const [embers, setEmbers] = useState<any[]>([])

  useEffect(() => {
    const newEmbers = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 2, // 2-6px
      duration: Math.random() * 5 + 4, // 4-9s floating up
      delay: Math.random() * -10,
      wiggle: Math.random() * 10 + 5, // horizontal drift
    }))
    setEmbers(newEmbers)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-[#000000]">
      {/* 底部暗红辉光 */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 opacity-30"
        style={{
          background: 'linear-gradient(to top, #ef4444, transparent)',
        }}
      />
      
      {/* 飘落向上飘升的余烬 */}
      {embers.map((ember) => (
        <motion.div
          key={`ember-${ember.id}`}
          className="absolute rounded-full"
          style={{
            left: `${ember.x}vw`,
            bottom: `-10px`,
            width: ember.size,
            height: ember.size,
            backgroundColor: '#ff6b2b',
            boxShadow: `0 0 ${ember.size * 2}px #ff2a00, 0 0 ${ember.size * 4}px #ef4444`,
          }}
          animate={{
            y: [`0vh`, `-110vh`], // 向上飘
            x: [`0vw`, `${Math.sin(ember.id) * ember.wiggle}vw`], // 左右摇摆
            opacity: [0, 1, 1, 0], // 出现后慢慢消失
            scale: [0, 1, 0.5, 0],
          }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}
