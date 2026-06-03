import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function CyberEffect() {
  const [lines, setLines] = useState<any[]>([])

  useEffect(() => {
    // Generate digital rain / scanlines
    const newLines = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // vw
      height: Math.random() * 150 + 50, // px
      duration: Math.random() * 1.5 + 0.5, // fast!
      delay: Math.random() * -2,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? '#00f0ff' : '#ff003c',
    }))
    setLines(newLines)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-[#050510]">
      {/* 静态扫描线背景层 */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          background: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
          backgroundSize: '100% 4px, 3px 100%'
        }} 
      />
      
      {/* 动态下降数据流 */}
      {lines.map((line) => (
        <motion.div
          key={line.id}
          className="absolute w-[2px]"
          style={{
            left: `${line.x}vw`,
            top: `-200px`,
            height: line.height,
            background: `linear-gradient(to bottom, transparent, ${line.color})`,
            opacity: line.opacity,
            boxShadow: `0 0 10px ${line.color}`,
          }}
          animate={{
            y: ['0vh', '120vh'],
          }}
          transition={{
            duration: line.duration,
            delay: line.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* 随机闪烁噪点 */}
      <motion.div 
        className="absolute inset-0 opacity-10 bg-white"
        animate={{
          opacity: [0, 0.05, 0, 0.02, 0, 0.08, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.1, 0.2, 0.5, 0.6, 0.8, 1]
        }}
        style={{ mixBlendMode: 'overlay' }}
      />
    </div>
  )
}
