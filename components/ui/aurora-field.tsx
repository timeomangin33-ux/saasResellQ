'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

interface Orb {
  className: string
  size: number
  color: string
  x: string
  y: string
  duration: number
  delay: number
  parallax: number
}

const ORBS: Orb[] = [
  { className: 'aurora-orb-1', size: 460, color: 'rgba(16,185,129,0.16)', x: '-8%', y: '-6%', duration: 13, delay: 0, parallax: 22 },
  { className: 'aurora-orb-2', size: 380, color: 'rgba(139,92,246,0.14)', x: '78%', y: '8%', duration: 16, delay: 1.2, parallax: -18 },
  { className: 'aurora-orb-3', size: 420, color: 'rgba(34,211,238,0.1)', x: '58%', y: '68%', duration: 19, delay: 0.6, parallax: 16 },
  { className: 'aurora-orb-4', size: 320, color: 'rgba(16,185,129,0.12)', x: '4%', y: '72%', duration: 15, delay: 2, parallax: -14 },
  { className: 'aurora-orb-5', size: 260, color: 'rgba(217,70,239,0.08)', x: '38%', y: '32%', duration: 22, delay: 0.4, parallax: 10 },
]

/**
 * Full-bleed animated backdrop: drifting blurred aurora orbs (emerald/violet/cyan)
 * with subtle mouse parallax, a moving grid, and a noise layer on top.
 * Mounted once behind the whole authenticated shell — every page inherits it.
 */
export function AuroraField() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20, mass: 0.6 })

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      mouseX.set(e.clientX / window.innerWidth - 0.5)
      mouseY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080b]">
      {ORBS.map((orb) => (
        <ParallaxOrb key={orb.className} orb={orb} springX={springX} springY={springY} />
      ))}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute inset-0 bg-noise" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08080b]" />
    </div>
  )
}

function ParallaxOrb({
  orb,
  springX,
  springY,
}: {
  orb: Orb
  springX: ReturnType<typeof useSpring>
  springY: ReturnType<typeof useSpring>
}) {
  const px = useTransform(springX, (v) => v * orb.parallax)
  const py = useTransform(springY, (v) => v * orb.parallax)

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: orb.size,
        height: orb.size,
        left: orb.x,
        top: orb.y,
        background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
        filter: 'blur(60px)',
        x: px,
        y: py,
      }}
      animate={{
        y: [0, -26, 0, 20, 0],
        x: [0, 18, -12, 0],
        scale: [1, 1.08, 0.96, 1],
        opacity: [0.55, 0.9, 0.6, 0.55],
      }}
      transition={{ duration: orb.duration, delay: orb.delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
