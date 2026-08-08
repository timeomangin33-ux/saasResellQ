'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Activity, BarChart3, BellDot, Bot, ChevronRight, CircleHelp, Clock3, CreditCard, FileText, Home, KeyRound, Layers3, LifeBuoy, Menu, Search, Settings, Sparkles, Smartphone, Target, UserRound, X, Workflow, BadgeCheck } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
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

  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>
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

  const sidebar = <aside className="flex h-full w-[280px] flex-col border-r border-white/[0.08] bg-[#0c0c10] px-4 py-5">
    <div className="flex items-center justify-between px-2"><Logo size="sm" href="/dashboard" /><button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="rounded-lg p-2 text-zinc-500 lg:hidden"><X className="h-4 w-4" /></button></div>
    <div className="mt-8 px-2"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Espace de travail</p></div>
    <nav className="mt-3 space-y-6">{navSections.map((section) => (
      <div key={section.title}>
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{section.title}</p>
        <div className="space-y-1">
          {section.items.map((item, index) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link key={`${item.href}-${item.name}-${index}`} href={item.href} onClick={() => setOpen(false)} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition', active ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white')}>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            )
          })}
        </div>
      </div>
    ))}</nav>
    <div className="mt-auto space-y-3">
      <Link href="/pricing" className="block rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 p-4 transition hover:border-violet-300/40"><div className="flex items-center gap-2 text-xs font-semibold text-violet-200"><Sparkles className="h-3.5 w-3.5" /> {usage?.active ? usage?.planLabel : usage?.planLabel ? `${usage.planLabel} (inactif)` : 'Forfait'}</div><p className="mt-3 text-2xl font-semibold text-white">{usage ? (usage.active ? usage.remaining.toLocaleString('fr-FR') : '—') : '—'}</p><p className="text-xs text-zinc-400">{usage ? (usage.active ? 'crédits IA disponibles' : 'activez votre abonnement') : 'Plan non renseigné'}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300" style={{ width: usage?.active && usage.limit ? `${Math.max(3, (usage.remaining / usage.limit) * 100)}%` : '0%' }} /></div></Link>
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-400 text-xs font-bold text-zinc-950">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{session.user?.name || 'Mon compte'}</p><Link href="/billing" className="text-[11px] text-zinc-500 hover:text-zinc-300">Facturation</Link></div><button onClick={() => signOut({ callbackUrl: '/' })} title="Déconnexion" className="text-zinc-500 hover:text-white"><UserRound className="h-4 w-4" /></button></div>
    </div>
  </aside>

  return <div className="min-h-screen bg-[#09090b] text-zinc-100"><div className="hidden fixed inset-y-0 left-0 z-30 lg:block">{sidebar}</div><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#09090b]/85 px-4 backdrop-blur-xl lg:ml-[280px] lg:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-300 lg:hidden"><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-sm text-zinc-500 sm:flex"><span>ResellQ</span><span className="text-zinc-700">/</span><span className="text-zinc-300">{nav.find(item => isActive(item.href))?.name || 'Espace client'}</span></div><div className="flex items-center gap-2"><Link href="/billing" className="hidden rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white sm:block"><CreditCard className="mr-1.5 inline h-3.5 w-3.5" />Facturation</Link><Link href="/settings" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"><Settings className="h-4 w-4" /></Link><Link href="/support" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"><CircleHelp className="h-4 w-4" /></Link></div></header><main className="lg:ml-[280px]">{children}</main>{open && <><div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} /><div className="fixed inset-y-0 left-0 z-50 lg:hidden">{sidebar}</div></>}</div>
}
