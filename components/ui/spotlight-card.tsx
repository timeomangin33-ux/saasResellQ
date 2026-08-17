'use client'

import { useMotionValue, motion, useMotionTemplate } from 'motion/react'
import { type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
  spotlightColor?: string
}

/**
 * Lightweight mouse-follow glow, CSS-only (no canvas/WebGL) so it stays cheap
 * even when several are rendered on the same page.
 */
export function SpotlightCard({ children, className, spotlightColor = 'rgba(16,185,129,0.14)' }: SpotlightCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const background = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 70%)`

  return (
    <div onMouseMove={handleMouseMove} className={cn('group/spot relative overflow-hidden', className)}>
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
