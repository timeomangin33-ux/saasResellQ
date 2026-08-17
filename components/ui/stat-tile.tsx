'use client'

import { motion } from 'motion/react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NumberTicker } from '@/components/ui/number-ticker'

interface StatTileProps {
  label: string
  value: number | string
  detail?: string
  icon?: LucideIcon
  accent?: boolean
  prefix?: string
  suffix?: string
  decimalPlaces?: number
  delay?: number
  className?: string
}

/**
 * Metric tile with an animated count-up when `value` is numeric, and a
 * graceful fallback for string values (e.g. "—" while loading).
 */
export function StatTile({ label, value, detail, icon: Icon, accent = false, prefix = '', suffix = '', decimalPlaces = 0, delay = 0, className }: StatTileProps) {
  const numeric = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'panel panel-hover p-5',
        accent ? 'border-emerald-400/20 bg-emerald-500/[0.06]' : '',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
        {Icon && (
          <span className={cn('grid h-7 w-7 place-items-center rounded-lg', accent ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.05] text-zinc-400')}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {numeric ? (
          <NumberTicker value={value as number} prefix={prefix} suffix={suffix} decimalPlaces={decimalPlaces} delay={delay} />
        ) : (
          <span>{prefix}{value}{suffix}</span>
        )}
      </p>
      {detail && <p className={cn('mt-2 text-sm', accent ? 'text-emerald-200/80' : 'text-zinc-500')}>{detail}</p>}
    </motion.div>
  )
}
