import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

const variants = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-[hsl(var(--accent))/10] text-[hsl(var(--accent))]',
  warning: 'bg-amber-500/10 text-amber-400',
  destructive: 'bg-red-500/10 text-red-400',
  primary: 'bg-primary/10 text-primary',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
