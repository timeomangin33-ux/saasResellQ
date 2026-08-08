'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, BarChart3, Clock3, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { PRICING_PLANS } from '@/lib/constants'
import { getCheckoutPlan, checkoutCallbackUrl } from './helpers'

function PaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const selectedPlan = searchParams.get('plan') ?? undefined

  const isAuthenticating = status === 'loading'
  const isAuthenticated = !!session
  const isPro = session?.user?.subscriptionStatus === 'ACTIVE'
  const shouldShowAuthPrompt = !isAuthenticating && !isAuthenticated

  // helper functions moved to app/payment/helpers.ts
  
  

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!session) return
    if (isPro) {
      router.replace('/dashboard')
    }
  }, [status, session, isPro, router])

  const openCheckout = useMemo(() => {
    return async (plan?: string) => {
      const checkoutPlan = getCheckoutPlan(plan)
      if (!isAuthenticated) {
        signIn('credentials', {
          callbackUrl: `${window.location.origin}${checkoutCallbackUrl}`,
        })
        return
      }

      setCheckoutError('')
      setCheckoutLoading(true)

      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: checkoutPlan, returnUrl: `${window.location.origin}/dashboard` }),
        })
        const data = await res.json()

        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Impossible de lancer le paiement')
        }

        window.location.href = data.url
      } catch (error) {
        setCheckoutError(error instanceof Error ? error.message : 'Erreur inconnue')
      } finally {
        setCheckoutLoading(false)
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (status !== 'authenticated' || !session || !selectedPlan || checkoutLoading) return
    const id = window.setTimeout(() => { void openCheckout(selectedPlan) }, 0)
    return () => window.clearTimeout(id)
  }, [status, session, selectedPlan, checkoutLoading, openCheckout])

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),radial-gradient(circle_at_80%_0%,_rgba(56,189,248,0.14),_transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.03)_0%,_transparent_30%,_rgba(255,255,255,0.02)_100%)]" />
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:gap-8">
            <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#08101f]/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="absolute -right-8 top-6 h-40 w-40 rounded-full bg-emerald-400/12 blur-3xl" />
              <div className="absolute left-10 top-20 h-24 w-24 rounded-full border border-emerald-400/20" />
              <div className="relative space-y-8">
                <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
                  <div className="flex items-center gap-4">
                    <Logo size="xl" href="/" className="rounded-2xl bg-slate-950/90 p-1 shadow-[0_16px_45px_rgba(16,185,129,0.18)]" />
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-400">ResellQ Pro</p>
                      <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Dashboard intelligence</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Market pulse
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                  <div className="space-y-5">
                    <p className="max-w-2xl text-[clamp(2.2rem,4.3vw,3.55rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white">
                      Buy the signal before the market moves.
                    </p>
                    <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                      Découvrez les deals les plus rentables, priorisez les produits à fort potentiel et recevez des alertes avant que la concurrence ne réagisse.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => void openCheckout('75')} disabled={checkoutLoading} className="rounded-[16px] bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.18)] hover:from-emerald-300 hover:to-cyan-200">
                        {checkoutLoading ? 'Préparation...' : 'Activer le mode Pro'}
                      </Button>
                      <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                        Voir ce qui est inclus
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[#03131c] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.34em] text-emerald-200">Aperçu du dashboard</p>
                        <p className="mt-2 text-4xl font-semibold text-white">+27%</p>
                      </div>
                      <div className="rounded-full border border-emerald-400/30 bg-slate-950/60 p-2">
                        <TrendingUp className="h-5 w-5 text-emerald-300" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-[20px] border border-emerald-400/15 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <span>Opportunités priorisées</span>
                        <span className="text-slate-200">14</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-800">
                        <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300" />
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Alertes</p>
                          <p className="mt-2 text-lg font-semibold text-white">12 nouvelles</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Marge estimée</p>
                          <p className="mt-2 text-lg font-semibold text-white">€182</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                        <Clock3 className="h-4 w-4 text-emerald-300" />
                        Mise à jour toutes les 48h avec des signaux d&apos;achat
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: '14', label: 'Catégories actives' },
                    { value: '48h', label: 'Rafraîchissement' },
                    { value: '4.9/5', label: 'Temps de détection' },
                  ].map(item => (
                    <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-2xl font-semibold text-white">{item.value}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Ce que vous recevez dès l&apos;activation</p>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                        Analyse premium, opportunités triées par valeur, recommandations IA et un support réactif, pour transformer l&apos;information en décisions concrètes et en marge.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Scraping', 'Alertes', 'Exports', 'Assistant'].map(item => (
                        <span key={item} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[32px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_20px_70px_rgba(3,7,18,0.45)] sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Sécurisé</p>
                    <p className="mt-2 text-2xl font-semibold text-white">Choisissez votre mode d&apos;accès</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {isAuthenticating ? (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                      Vérification de votre session en cours...
                    </div>
                  ) : shouldShowAuthPrompt ? (
                    <div className="space-y-4">
                      <p className="text-sm leading-7 text-slate-400">Vous pouvez continuer vers le paiement et vous connecter ensuite si vous le souhaitez.</p>
                      <div className="grid gap-3">
                        <Button onClick={() => void openCheckout('75')} disabled={checkoutLoading} className="w-full rounded-[16px] py-3 text-base">
                          {checkoutLoading ? 'Préparation...' : 'Continuer vers le paiement'}
                        </Button>
                        <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(checkoutCallbackUrl)}`} className="inline-flex justify-center rounded-[16px] border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                          Se connecter
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => void openCheckout('75')} disabled={checkoutLoading} className="w-full rounded-[16px] py-4 text-base">
                      {checkoutLoading ? 'Préparation...' : 'Accéder à ResellQ Pro'}
                    </Button>
                  )}

                  {checkoutError ? (
                    <p className="text-sm text-rose-300">{checkoutError}</p>
                  ) : (
                    <div className="rounded-[20px] border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-400">
                      Paiement Stripe sécurisé. La redirection vers le checkout est entièrement contrôlée.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                {PRICING_PLANS.map(plan => (
                  <motion.article
                    key={plan.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className={`relative overflow-hidden rounded-[24px] border p-5 shadow-[0_16px_50px_rgba(3,7,18,0.28)] ${
                      plan.highlight
                        ? 'border-emerald-400/25 bg-emerald-500/10'
                        : plan.id === 'business'
                          ? 'border-violet-500/20 bg-[#0F131A]'
                          : 'border-white/10 bg-[#0F131A]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{plan.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{plan.description}</p>
                      </div>
                      {plan.badge && plan.badge !== plan.name ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      <p className="text-3xl font-semibold text-white">{plan.price}{plan.currency}</p>
                      <span className="mb-1 text-sm text-slate-500">/ {plan.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{plan.tokenLabel}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      {plan.features.slice(0, 3).map(feature => (
                        <div key={feature} className="flex items-start gap-2">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <BarChart3 className="h-4 w-4 text-emerald-300" />
                        {plan.id === 'business' ? 'Pilotage avancé' : 'Opportunités priorisées'}
                      </div>
                      {plan.id === 'pro' ? (
                        <Button
                          onClick={() => void openCheckout('75')}
                          disabled={checkoutLoading}
                          className="rounded-[14px] bg-gradient-to-r from-emerald-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.18)] hover:from-emerald-300 hover:to-cyan-200"
                        >
                          {checkoutLoading ? 'Préparation...' : 'Choisir'}
                        </Button>
                      ) : plan.id === 'starter' ? (
                        <Button
                          onClick={() => void openCheckout('29')}
                          disabled={checkoutLoading}
                          className="inline-flex items-center rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          {checkoutLoading ? 'Préparation...' : plan.cta}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => void openCheckout('149')}
                          disabled={checkoutLoading}
                          className="inline-flex items-center rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          {checkoutLoading ? 'Préparation...' : plan.cta}
                        </Button>
                      )}
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#020617] text-slate-100"><div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">Chargement du paiement...</div></main>}>
      <PaymentPageContent />
    </Suspense>
  )
}
