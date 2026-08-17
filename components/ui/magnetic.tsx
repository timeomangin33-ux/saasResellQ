'use client'

import { type MouseEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'

interface MagneticProps {
  children: ReactNode
  className?: string
  strength?: number
  as?: 'div' | 'span'
}

/**
 * Wraps interactive elements (buttons, nav items, cards) and pulls them
 * gently toward the cursor on hover, springing back on leave.
 */
export function Magnetic({ children, className, strength = 0.35, as = 'div' }: MagneticProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 })

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * strength)
    y.set((e.clientY - rect.top - rect.height / 2) * strength)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const Comp = motion[as]

  return (
    <Comp
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn('inline-block will-change-transform', className)}
    >
      {children}
    </Comp>
  )
}
