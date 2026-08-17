'use client'

import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  as?: 'div' | 'section' | 'li'
}

/**
 * Fades + slides content in once it enters the viewport (or on mount for
 * above-the-fold content). Cheap, GPU-friendly, no layout thrash.
 */
export function Reveal({ children, className, delay = 0, y = 16, once = true, as = 'div' }: RevealProps) {
  const initial = { opacity: 0, y }
  const whileInView = { opacity: 1, y: 0 }
  const viewport = { once, margin: '-60px' }
  const transition = { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const }

  if (as === 'section') {
    return (
      <motion.section className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
        {children}
      </motion.section>
    )
  }

  if (as === 'li') {
    return (
      <motion.li className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
        {children}
      </motion.li>
    )
  }

  return (
    <motion.div className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
      {children}
    </motion.div>
  )
}

interface StaggerProps {
  children: ReactNode
  className?: string
  gap?: number
}

/** Wrap a list of children to stagger their entrance via CSS custom property delays. */
export function StaggerGroup({ children, className }: StaggerProps) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  }
  return (
    <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
      {children}
    </motion.div>
  )
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}
