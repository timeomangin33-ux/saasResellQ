'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { Magnetic } from '@/components/ui/magnetic'
import Link from 'next/link'

const plans = [
  {
    level: '29',
    name: 'Starter',
    price: 29,
    description: 'Pour débuter proprement.',
    tagline: 'Une base solide pour analyser, suivre et agir.',
    image: '/pricing-images/plan-29.png',
    features: [
      '250 crédits IA par mois',
      'Analyses de marché essentielles',
      'Alertes de prix jusqu\'à 5',
      'Rapports hebdomadaires',
      'Support par email',
    ],
    cta: 'Choisir Starter',
    highlighted: false,
    badge: 'Essentiel',
  },
  {
    level: '75',
    name: 'Pro',
    price: 75,
    description: 'Le meilleur équilibre pour une activité sérieuse.',
    tagline: 'Le forfait le plus utilisé pour gagner du temps et augmenter sa marge.',
    image: '/pricing-images/plan-75.png',
    features: [
      '2 000 crédits IA par mois',
      'Analyses avancées',
      'Alertes illimitées',
      'Rapports quotidiens',
      'Support prioritaire',
      'Watchlists intelligentes',
    ],
    cta: 'Choisir Pro',
    highlighted: true,
    badge: 'Le plus populaire',
  },
  {
    level: '149',
    name: 'Business',
    price: 149,
    description: 'Pour piloter une activité structurée.',
    tagline: 'L\'espace complet pour automatiser, analyser et administrer vos environnements de test.',
    image: '/pricing-images/plan-149.png',
    features: [
      '6 000 crédits IA par mois',
      'Tout du forfait Pro',
      'Multi-comptes Vinted',
      'Intégrations API et webhooks',
      'Automations avancées',
      'Accès Device Lab',
      'Support 24/7 prioritaire',
    ],
    cta: 'Choisir Business',
    highlighted: false,
    badge: 'Business',
  },
]

const proofPoints = [
  'Paiement sécurisé',
  'Annulation à tout moment',
  'Essai disponible',
  'Support réactif',
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const planDescriptions = {
    Starter: 'Idéal pour démarrer proprement avec les bases de l’analyse.',
    Pro: 'Pour une activité sérieuse avec plus de volume et d’automatisation.',
    Business: 'Pour piloter une activité structurée avec API, exports et Device Lab.',
  }

  const handleSubscribe = async (level: string) => {
    if (status === 'loading') {
      return
    }

    if (!isAuthenticated) {
      router.push(`/payment?plan=${encodeURIComponent(level)}`)
      return
    }

    try {
      setLoading(level)
      setError(null)

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: level,
          returnUrl: `${window.location.origin}/dashboard/billing`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session')
      }

      const { url } = data
      if (!url) {
        throw new Error('URL de paiement introuvable')
      }

      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="relative mx-auto max-w-7xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden">
          <motion.div
            className="h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#08101f]/95 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <div>
              <p className="flex items-center gap-1.5 text-sm uppercase tracking-[0.32em] text-emerald-300/70">
                <Sparkles className="h-3.5 w-3.5" />
                Abonnements
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Plans premium pour revendeurs Vinted</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">Choisissez la profondeur d'analyse dont vous avez besoin. Changez de forfait ou annulez à tout moment, sans engagement.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic strength={0.2}>
                  <Button
                    onClick={() => handleSubscribe('75')}
                    disabled={loading !== null}
                    className="btn-shine rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_80px_rgba(16,185,129,0.2)] hover:from-emerald-300 hover:to-cyan-200"
                  >
                    {loading === '75' ? 'Redirection...' : 'Activer Pro'}
                  </Button>
                </Magnetic>
                <Magnetic strength={0.2}>
                  <a href="#plans">
                    <Button
                      variant="outline"
                      className="rounded-full border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Comparer les offres
                    </Button>
                  </a>
                </Magnetic>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {proofPoints.map((point) => (
                  <span key={point} className="chip">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" />
                    {point}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm text-slate-400">Starter, Pro et Business offrent des niveaux de profondeur distincts : veille, automatisation, exports et IA.</p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#0B1220] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Pourquoi c'est utile</p>
              <div className="mt-6 space-y-4">
                {[
                  'Identifier les opportunités les plus pertinentes.',
                  'Gagner du temps sur l\'analyse de marché.',
                  'Prendre des décisions plus sûres.',
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 + index * 0.08 }}
                    className="rounded-2xl border border-white/10 bg-[#08101f] p-4 text-sm leading-6 text-slate-300 transition-colors hover:border-emerald-400/20"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section id="plans" className="mt-8 grid gap-6 scroll-mt-24 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.level}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition-all duration-300 ${
                plan.highlighted
                  ? 'border-emerald-400/20 bg-[#08181F] text-white'
                  : 'border-white/10 bg-[#08101f] text-slate-200 hover:border-emerald-400/20'
              }`}
            >
              {plan.highlighted && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_28%)]" />
              )}
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-[0.28em] ${plan.highlighted ? 'text-emerald-300/80' : 'text-slate-400'}`}>
                    {plan.description}
                  </p>
                  <h2 className={`mt-4 text-3xl font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-100'}`}>
                    {plan.name}
                  </h2>
                  <p className={`mt-3 text-sm leading-6 ${plan.highlighted ? 'text-slate-300' : 'text-slate-400'}`}>
                    {plan.tagline}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    {planDescriptions[plan.name as keyof typeof planDescriptions]}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${plan.highlighted ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-200'}`}>
                  {plan.badge}
                </span>
              </div>

              <div className="relative mt-8 flex items-end gap-2">
                <span className={`text-5xl font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-100'}`}>€{plan.price}</span>
                <span className="pb-1 text-sm text-slate-400">/mois</span>
              </div>

              <Magnetic strength={0.2} className="mt-6 block w-full">
                <Button
                  onClick={() => handleSubscribe(plan.level)}
                  disabled={loading !== null}
                  className={`btn-shine relative w-full rounded-full px-5 py-4 text-base font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.18)] hover:from-emerald-300 hover:to-cyan-200'
                      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {loading === plan.level ? 'Redirection...' : plan.cta}
                </Button>
              </Magnetic>

              <ul className="relative mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </section>

        <Reveal className="mt-8 rounded-[28px] border border-white/10 bg-[#0B1220] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <h3 className="text-2xl font-semibold text-white">Questions fréquentes</h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[
              {
                q: 'Puis-je changer de forfait ?',
                a: 'Oui, vous pouvez évoluer à tout moment depuis votre espace billing.',
              },
              {
                q: 'Y a-t-il une période d\'essai ?',
                a: 'Oui, les nouveaux comptes peuvent tester les fonctionnalités principales rapidement.',
              },
              {
                q: 'Comment fonctionne le paiement ?',
                a: 'Le paiement est sécurisé via Stripe et vous pouvez annuler à tout moment.',
              },
              {
                q: 'Est-ce adapté pour une petite activité ?',
                a: 'Absolument. Starter est fait pour démarrer proprement sans surcharge.',
              },
            ].map((item, index) => (
              <Reveal key={item.q} delay={index * 0.05} className="rounded-2xl border border-white/10 bg-[#08101f] p-5 transition-colors hover:border-emerald-400/20">
                <p className="font-semibold text-white">{item.q}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.a}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <div className="mt-8 text-center text-sm text-slate-400">
          Besoin d'un accompagnement ?{' '}
          <Link href="/dashboard" className="font-semibold text-emerald-300 hover:text-emerald-200">
            Ouvrez votre tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
