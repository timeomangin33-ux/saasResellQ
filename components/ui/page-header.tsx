'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  kicker?: string
  icon?: LucideIcon
}

export function PageHeader({ title, description, actions, className, kicker, icon: Icon }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between page-header', className)}
    >
      <div className="min-w-0">
        {kicker && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-300/90">
            {Icon && <Icon className="h-3 w-3" />}
            {kicker}
          </p>
        )}
        <h1 className="page-title flex items-center gap-2.5">
          {Icon && !kicker && (
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-300">
              <Icon className="h-4 w-4" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="page-description max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
