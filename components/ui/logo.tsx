import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  href?: string
}

const sizes = {
  sm: { icon: 'w-5 h-5', box: 'w-7 h-7', text: 'text-sm' },
  md: { icon: 'w-4 h-4', box: 'w-8 h-8', text: 'text-base' },
  lg: { icon: 'w-5 h-5', box: 'w-9 h-9', text: 'text-lg' },
  xl: { icon: 'w-6 h-6', box: 'w-12 h-12', text: 'text-2xl' },
}

export function Logo({ className, showText = true, size = 'md', href = '/' }: LogoProps) {
  const s = sizes[size]

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(s.box, 'flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 shadow-[0_8px_24px_rgba(16,185,129,0.16)] flex-shrink-0')}>
        <Image src="/resellq-logo.svg" alt="ResellQ" width={24} height={24} className={cn(s.icon, 'object-contain')} />
      </div>
      {showText && (
        <span className={cn(s.text, 'font-semibold tracking-tight text-foreground')}>
          ResellQ
        </span>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="inline-flex">{content}</Link>
  }

  return content
}
