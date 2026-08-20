'use client'

import { usePathname } from 'next/navigation'
import { SiteFooter } from './site-footer'

// Routes that render their own self-contained shell and should not also get
// the global marketing footer appended below them.
//
// - `/auth/*` uses `AuthLayout` (components/auth/auth-layout.tsx), a focused
//   full-screen auth experience with its own background.
// - The routes below wrap themselves in `DashboardLayout`
//   (app/dashboard-layout.tsx), which renders its own fixed sidebar + main
//   content shell. Appending the marketing footer after that shell breaks
//   the layout and shows a "sign up" CTA to already-authenticated users.
//
// Matched by exact pathname (not prefix) so dynamic child routes that do NOT
// use DashboardLayout — e.g. /brands/[brand], /categories/[slug],
const AUTH_PREFIX = '/auth'

const DASHBOARD_SHELL_ROUTES = [
  '/admin',
  '/ai-agent',
  '/alertes',
  '/brands',
  '/categories',
  '/dashboard',
  '/dashboard/accounts',
  '/dashboard/automation',
  '/dashboard/billing',
  '/dashboard/bot',
  '/deal-finder',
  '/historique',
  '/insights',
  '/market-research',
  '/notifications',
  '/opportunities',
  '/product-analyzer',
  '/profile',
  '/reports',
  '/settings',
  '/support',
  '/top-products',
  '/vinted-dashboard',
  '/watchlists',
]

export function ConditionalSiteFooter() {
  const pathname = usePathname() ?? ''

  const isAuthRoute = pathname === AUTH_PREFIX || pathname.startsWith(`${AUTH_PREFIX}/`)
  const isDashboardShellRoute = DASHBOARD_SHELL_ROUTES.includes(pathname)

  if (isAuthRoute || isDashboardShellRoute) {
    return null
  }

  return <SiteFooter />
}
