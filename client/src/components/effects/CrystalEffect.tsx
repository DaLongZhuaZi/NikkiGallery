import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function CrystalEffect() {
  const [rays, setRays] = useState<any[]>([])
  const [sparkles, setSparkles] = useState<any[]>([])

  useEffect(() => {
    // 丁达尔光束
    const newRays = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: Math.random() * 60 + 20, // 20-80vw
      width: Math.random() * 150 + 100, // px
      angle: Math.random() * 30 - 15 + 45, // approx 45 deg
      opacity: Math.random() * 0.15 + 0.05,
      duration: Math.random() * 8 + 6,
    }))
    setRays(newRays)

    // 闪烁光斑
    const newSparkles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * -5,
    }))
    setSparkles(newSparkles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {/* 丁达尔光束 */}
      {rays.map((ray) => (
        <motion.div
          key={`ray-${ray.id}`}
          className="absolute top-[-20%] bottom-[-20%]"
          style={{
            left: `${ray.x}vw`,
            width: ray.width,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)',
            transformOrigin: 'top center',
            rotate: `${ray.angle}deg`,
            filter: 'blur(30px)',
          }}
          animate={{
            opacity: [ray.opacity * 0.5, ray.opacity, ray.opacity * 0.5],
            x: ['-5vw', '5vw', '-5vw'],
          }}
          transition={{
            duration: ray.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* 闪烁光斑 (Dust particles) */}
      {sparkles.map((spark) => (
        <motion.div
          key={`spark-${spark.id}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${spark.x}vw`,
            top: `${spark.y}vh`,
            width: spark.size,
            height: spark.size,
            boxShadow: '0 0 8px 2px rgba(255,255,255,0.8)',
          }}
          animate={{
            opacity: [0, 1, 0],
            y: [`0vh`, `-5vh`],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: spark.duration,
            delay: spark.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}
