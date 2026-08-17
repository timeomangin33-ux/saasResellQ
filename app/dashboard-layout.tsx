'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, BarChart3, BellDot, Bot, ChevronRight, CircleHelp, Clock3, CreditCard, FileText, Home, KeyRound, Layers3, LifeBuoy, Menu, Search, Settings, Sparkles, Smartphone, Target, UserRound, X, Workflow, BadgeCheck } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AuroraField } from '@/components/ui/aurora-field'
import { Magnetic } from '@/components/ui/magnetic'
import { cn } from '@/lib/utils'
import { normalizePlan } from '@/lib/plans'

const explorerNav = [
  { name: 'Accueil', href: '/dashboard', icon: Home },
  { name: 'Explorer le marché', href: '/market-research', icon: Search },
  { name: 'Top Produits', href: '/top-products', icon: BarChart3 },
  { name: 'Vinted', href: '/vinted-dashboard', icon: BarChart3 },
  { name: 'Top Catégories', href: '/categories', icon: Layers3 },
  { name: 'Veilles', href: '/watchlists', icon: BellDot },
  { name: 'Alertes', href: '/alertes', icon: BellDot },
  { name: 'Opportunités', href: '/opportunities', icon: Target },
]

const PLAN_RANK = { FREE: 0, STARTER: 1, PRO: 2, BUSINESS: 3 } as const

const toolsNav = [
  { name: 'Assistant IA', href: '/ai-agent', icon: Bot, minPlan: 'STARTER' as const },
  { name: 'Rapports', href: '/reports', icon: FileText, minPlan: 'PRO' as const },
  { name: 'Historique', href: '/historique', icon: Clock3, minPlan: 'PRO' as const },
  { name: 'Automatisations', href: '/workflows', icon: Workflow, minPlan: 'PRO' as const },
  { name: 'API', href: '/developer', icon: KeyRound, minPlan: 'PRO' as const },
]

const accountNav = [
  { name: 'Facturation', href: '/billing', icon: CreditCard },
  { name: 'Paramètres', href: '/settings', icon: Settings },
  { name: 'Support', href: '/support', icon: LifeBuoy },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<{ remaining: number; limit: number; planLabel: string; active: boolean } | null>(null)
  const [clock, setClock] = useState('')
  const planKey = normalizePlan(session?.user?.subscriptionPlan)
  const business = planKey === 'BUSINESS'
  const isAdmin = session?.user?.role === 'ADMIN'
  const isAdminRoute = pathname.startsWith('/admin')

  useEffect(() => {
    if (status === 'authenticated') fetch('/api/ai/usage').then(r => r.ok ? r.json() : null).then(setUsage).catch(() => undefined)
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && isAdminRoute && session?.user?.role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }

    if (
      status === 'authenticated' &&
      session?.user?.role !== 'ADMIN' &&
      session?.user?.subscriptionStatus !== 'ACTIVE' &&
      !pathname.startsWith('/pricing') &&
      !pathname.startsWith('/payment') &&
      !pathname.startsWith('/billing') &&
      !pathname.startsWith('/dashboard/billing')
    ) {
      router.replace('/pricing')
    }
  }, [session, status, pathname, router, isAdminRoute])

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08080b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{ borderTopColor: '#34d399', borderRightColor: '#a78bfa' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-1.5 rounded-full border-2 border-transparent"
              style={{ borderBottomColor: '#22d3ee' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <motion.p
            className="text-xs text-zinc-500"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            Chargement de l'espace de travail…
          </motion.p>
        </div>
      </div>
    )
  }
  if (status === 'unauthenticated') return null
  if (!session) return <>{children}</>

  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  const availableToolsNav = toolsNav.filter((item) => !item.minPlan || PLAN_RANK[planKey] >= PLAN_RANK[item.minPlan])
  const businessNav = business ? [
    { name: 'Device Lab', href: '/dashboard/device-lab', icon: Smartphone },
    { name: 'Comptes Vinted', href: '/dashboard/accounts', icon: Layers3 },
  ] : []
  const navSections = [
    { title: 'Explorer', items: explorerNav },
    { title: 'Outils & IA', items: [...availableToolsNav, ...businessNav, ...(isAdmin ? [{ name: 'Administration', href: '/admin', icon: Activity }] : [])] },
    { title: 'Compte', items: accountNav },
  ]
  const nav = navSections.flatMap((section) => section.items)
  const initials = (session.user?.name || session.user?.email || 'R').slice(0, 1).toUpperCase()
  const usagePct = usage?.active && usage.limit ? Math.max(3, (usage.remaining / usage.limit) * 100) : 0
  const usageLow = usage?.active && usage.limit ? usage.remaining / usage.limit < 0.15 : false

  const sidebar = (
    <aside className="relative flex h-full w-[280px] flex-col overflow-hidden border-r border-white/[0.08] bg-[#0a0a0e]/90 px-4 py-5 backdrop-blur-2xl">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-emerald-400/50 via-violet-400/25 to-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/[0.12] blur-[100px]"
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.15, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-violet-500/[0.1] blur-[100px]"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative flex items-center justify-between px-2">
        <Logo size="sm" href="/dashboard" />
        <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-8 flex items-center gap-2 px-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Espace de travail</p>
      </div>

      <nav className="relative mt-3 flex-1 space-y-6 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: sectionIndex * 0.06 }}
          >
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{section.title}</p>
            <div className="relative space-y-1">
              {section.items.map((item, index) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Magnetic key={`${item.href}-${item.name}-${index}`} strength={0.12} className="block w-full">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                        active ? 'text-white' : 'text-zinc-400 hover:text-white',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-nav-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.45)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      {!active && (
                        <span className="absolute inset-0 rounded-xl bg-white/0 transition-colors duration-150 group-hover:bg-white/[0.06]" />
                      )}
                      <Icon className={cn('relative z-10 h-4 w-4 flex-shrink-0 transition-transform duration-200', !active && 'group-hover:scale-110 group-hover:text-emerald-300', active && 'text-zinc-950')} />
                      <span className={cn('relative z-10 flex-1', active && 'font-semibold text-zinc-950')}>{item.name}</span>
                      {active && <ChevronRight className="relative z-10 h-4 w-4 text-zinc-950" />}
                    </Link>
                  </Magnetic>
                )
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      <div className="relative mt-auto space-y-3 pt-3">
        <Link href="/pricing" className="group block overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-violet-500/10 p-4 transition hover:border-emerald-300/40">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100"
            style={{ background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.08) 50%, transparent 80%)', backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
              <Sparkles className="h-3.5 w-3.5" />
            </motion.span>
            {usage?.active ? usage?.planLabel : usage?.planLabel ? `${usage.planLabel} (inactif)` : 'Forfait'}
          </div>
          <p className="relative mt-3 text-2xl font-semibold text-white">
            {usage ? (usage.active ? <NumberTicker value={usage.remaining} /> : '—') : '—'}
          </p>
          <p className="relative text-xs text-zinc-400">{usage ? (usage.active ? 'crédits IA disponibles' : 'activez votre abonnement') : 'Plan non renseigné'}</p>
          <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={cn('h-full rounded-full', usageLow ? 'bg-gradient-to-r from-amber-400 to-red-400' : 'bg-gradient-to-r from-emerald-400 to-teal-300')}
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-white/[0.14]">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-violet-400 text-xs font-bold text-white">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{session.user?.name || 'Mon compte'}</p>
            <Link href="/billing" className="text-[11px] text-zinc-500 transition hover:text-zinc-300">Facturation</Link>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} title="Déconnexion" className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <UserRound className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  const activeLabel = nav.find(item => isActive(item.href))?.name || 'Espace client'

  return (
    <div className="relative min-h-screen text-zinc-100">
      <AuroraField />

      <div className="hidden fixed inset-y-0 left-0 z-30 lg:block">{sidebar}</div>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#08080b]/75 px-4 backdrop-blur-2xl lg:ml-[280px] lg:px-8">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/5 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 text-sm text-zinc-500 sm:flex">
          <span>ResellQ</span>
          <span className="text-zinc-700">/</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={activeLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="text-zinc-300"
            >
              {activeLabel}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          {clock && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-500 md:flex tabular-nums">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {clock}
            </span>
          )}
          {usage?.active && (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 md:flex">
              <BadgeCheck className="h-3.5 w-3.5" />
              {usage.planLabel} actif
            </span>
          )}
          <Magnetic strength={0.25}>
            <Link href="/billing" className="hidden rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white sm:block">
              <CreditCard className="mr-1.5 inline h-3.5 w-3.5" />Facturation
            </Link>
          </Magnetic>
          <Magnetic strength={0.3}>
            <Link href="/settings" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
              <Settings className="h-4 w-4" />
            </Link>
          </Magnetic>
          <Magnetic strength={0.3}>
            <Link href="/support" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
              <CircleHelp className="h-4 w-4" />
            </Link>
          </Magnetic>
        </div>
      </header>

      <main className="lg:ml-[280px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
