'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  BarChart3,
  Search,
  Bot,
  Zap,
  Shield,
  ArrowRight,
  Check,
  X,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PRICING_PLANS } from '@/lib/constants'

const features = [
  {
    icon: TrendingUp,
    title: 'Deals à revente rapide',
    description: 'Des opportunités qui méritent d&apos;être vues avant l&apos;ouverture des autres.',
  },
  {
    icon: BarChart3,
    title: 'Marge réelle avant achat',
    description: 'Le vrai profit net, après frais, commission et marge de sécurité.',
  },
  {
    icon: Search,
    title: 'Recherche par opportunité',
    description: 'Le bon produit au bon moment, selon ton budget et ta stratégie.',
  },
  {
    icon: Bot,
    title: 'Assistant IA actionnable',
    description: 'Un briefing clair et des recommandations concrètes sans bruit.',
  },
  {
    icon: Zap,
    title: 'Alertes opportunités',
    description: 'Réagis dès qu&apos;un produit sous-coté apparaît sur le marché.',
  },
  {
    icon: Shield,
    title: 'Données business',
    description: 'Une vision simple des marges, du ROI et de la valeur de chaque deal.',
  },
]

const stats = [
  { value: 'Données Vinted', label: 'Flux de marché direct' },
  { value: 'Alertes dédiées', label: 'Signaux priorisés pour la revente' },
  { value: 'Marge claire', label: 'Outils de pricing et ROI' },
  { value: 'Analyse instantanée', label: 'Décisions plus rapides' },
]

const heroHighlights = [
  { label: 'Données Vinted', value: 'En direct' },
  { label: 'Veilles opérationnelles', value: 'Automatisées' },
  { label: 'Décisions plus rapides', value: 'Instantané' },
]

const dealCards = [
  { title: 'Sneakers populaires', buy: 'Prix repéré', profit: 'Marge projetée' },
  { title: 'Veste streetwear', buy: 'Prix repéré', profit: 'Marge projetée' },
  { title: 'Jeans premium', buy: 'Prix repéré', profit: 'Marge projetée' },
]


export default function LandingPage() {
  const [monthlyItems, setMonthlyItems] = useState(12)
  const opportunityScore = Math.round(monthlyItems * 5 + 30)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),radial-gradient(circle_at_90%_10%,_rgba(14,165,233,0.13),_transparent_28%),linear-gradient(180deg,_#060b12_0%,_#0a111b_100%)] text-foreground">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-8%] top-16 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Connexion
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">S&apos;inscrire</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Analyse Vinted mise à jour pour revendeurs professionnels, sans promesse de chiffres inventés.
            </div>

            <h1 className="mb-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Sachez quoi acheter ce matin
              <br />
              pour revendre <span className="text-primary">plus vite, plus proprement.</span>
            </h1>

            <p className="mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">
              ResellQ transforme les annonces Vinted en décisions simples : prix d&apos;achat, marge, risque et opportunité, le tout dans un tableau de bord sobre et efficace.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Commencer maintenant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg">
                  Voir la démo
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroHighlights.map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-lg font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}>
            <div className="rounded-[32px] border border-white/10 bg-background/80 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur">
              <div className="rounded-[24px] border border-white/10 bg-card/90 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">Mini-démo</p>
                    <h2 className="text-lg font-semibold">Deals chauds détectés</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                    Live
                  </span>
                </div>

                <div className="space-y-3">
                  {dealCards.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.1 + index * 0.08 }}
                      className="rounded-2xl border border-white/10 bg-background/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Potentiel de marge • {item.profit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Achat</p>
                          <p className="font-semibold text-foreground">{item.buy}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Synthèse</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">Opportunités structurées en temps réel</p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 p-2 text-primary">
                      <TimerReset className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    {[28, 48, 36, 58, 72, 44].map((height, index) => (
                      <motion.div
                        key={height}
                        initial={{ height: 12 }}
                        animate={{ height }}
                        transition={{ duration: 0.7, delay: 0.2 + index * 0.05 }}
                        className="flex-1 rounded-full bg-gradient-to-t from-primary to-sky-300"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Visualisation d&apos;activité</p>
              <h2 className="text-xl font-semibold">Suivez votre volume et priorisez vos actions</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-right">
              <p className="text-xs text-muted-foreground">Score d&apos;opportunité</p>
              <p className="text-2xl font-semibold text-accent">{opportunityScore}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Estimation indicative selon votre activité.</p>
            </div>
          </div>

          <div className="grid items-center gap-5 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-sm font-medium">Articles vendus par mois</p>
              <p className="mt-1 text-xs text-muted-foreground">Plus votre volume monte, plus votre base d&apos;analyse se renforce.</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{monthlyItems} articles</p>
              <p className="mt-1 text-xs text-muted-foreground">Niveau de priorité : {opportunityScore}.</p>
            </div>
          </div>

          <input
            type="range"
            min={2}
            max={40}
            value={monthlyItems}
            onChange={e => setMonthlyItems(Number(e.target.value))}
            className="mt-5 w-full accent-primary"
          />
        </div>
      </section>

      <section className="border-y border-white/10 bg-background/40 px-6 py-12 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
              Un workflow clair, de la découverte au choix final
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Tout est pensé pour limiter le bruit et vous aider à agir vite sur ce qui compte vraiment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(feature => {
              const Icon = feature.icon
              return (
                <motion.div key={feature.title} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.2 }}>
                  <Card className="h-full border-white/10 bg-card/80 backdrop-blur">
                    <CardContent className="pt-5">
                      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="mb-1.5 text-sm font-medium text-foreground">{feature.title}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-card/30 px-6 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-primary">Pourquoi ResellQ</p>
            <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
              Conçu pour les revendeurs qui veulent des résultats concrets
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { stat: 'Flux clair', label: 'Priorisez les deals valables' },
                { stat: 'Temps réduit', label: 'Décisions plus rapides' },
                { stat: 'Marge nette', label: 'Pilotez votre pricing' },
                { stat: 'Analyse instantanée', label: 'IA sur vos signaux' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-background/70 p-4">
                  <p className="text-xl font-semibold text-primary tabular-nums">{item.stat}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-white/10 bg-background/70">
            <CardContent className="pt-5">
              <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">Témoignage</p>
              <p className="mb-6 text-base leading-relaxed text-foreground">
              &quot;Grâce à ResellQ, j&apos;ai amélioré ma sélection produit et je trouve des bons deals beaucoup plus vite.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm font-medium text-foreground">
                  M
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Marie L.</p>
                  <p className="text-xs text-muted-foreground">Revendeuse pro · Paris</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-24 h-[260px] w-[260px] rounded-full bg-violet-500/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.08),_transparent_25%)] opacity-40" />

          <div className="relative mb-14 text-center">
            <p className="text-sm uppercase tracking-[0.36em] text-slate-400">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Plans premium pour revendeurs Vinted</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Trois offres alignées, une hiérarchie claire et un design qui donne envie d&apos;acheter immédiatement.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING_PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="h-full w-full"
              >
                <div
                  className={`relative w-full overflow-hidden rounded-[24px] border p-7 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-500 flex flex-col h-full ${plan.highlight ? 'border-emerald-400/30 bg-[#0F171A] shadow-[0_25px_70px_rgba(16,185,129,0.15)]' : plan.id === 'business' ? 'border-violet-500/20 bg-[#0F131A] shadow-[0_20px_60px_rgba(124,58,237,0.15)]' : 'border-white/10 bg-[#0F131A]'}`}
                >
                  {plan.highlight ? (
                    <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_28%)] opacity-80" />
                  ) : plan.id === 'business' ? (
                    <div className="pointer-events-none absolute top-6 right-6 h-24 w-24 rounded-full bg-violet-500/8 blur-2xl" />
                  ) : null}

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">{plan.name}</p>
                        <p className="mt-1.5 text-xs leading-5 text-slate-400">{plan.description}</p>
                      </div>
                      <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] whitespace-nowrap flex-shrink-0 ${plan.id === 'starter' ? 'bg-white/10 text-slate-200' : plan.highlight ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-200'}`}>
                        {plan.badge}
                      </span>
                    </div>

                    <div className="mb-6 pb-6 border-b border-white/10">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-extrabold tracking-tight ${plan.highlight ? 'text-emerald-300' : plan.id === 'business' ? 'text-violet-300' : 'text-white'}`}>{plan.price}</span>
                        <span className="text-sm text-slate-500">{plan.currency}/{plan.period}</span>
                      </div>
                      <p className={`mt-3 text-xs font-semibold ${plan.highlight ? 'text-emerald-300/80' : plan.id === 'business' ? 'text-violet-300/80' : 'text-slate-400'}`}>
                        {plan.tokenLabel}
                      </p>
                    </div>

                    <div className="mb-6 flex-1">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Ce qui est inclus</p>
                      <div className="space-y-2.5">
                        {plan.features.slice(0, 5).map(feature => (
                          <div key={feature} className="flex items-start gap-2.5">
                            <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-emerald-300' : plan.id === 'business' ? 'text-violet-300' : 'text-emerald-400'}`} />
                            <span className="text-sm text-slate-200 leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {plan.businessExtras?.length ? (
                      <div className="mb-6 rounded-[18px] border border-violet-500/20 bg-violet-500/8 p-4">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-violet-200">Bonus Business</p>
                        <div className="space-y-2">
                          {plan.businessExtras.slice(0, 2).map(extra => (
                            <div key={extra} className="flex items-start gap-2 text-sm text-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 mt-1.5 flex-shrink-0" />
                              <span>{extra}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <Link href="/auth/signup" className="block mt-auto">
                      <Button
                        className={`w-full rounded-[14px] py-3 text-sm font-semibold transition-transform duration-300 ${plan.highlight ? 'bg-emerald-400 text-slate-950 shadow-[0_12px_24px_rgba(16,185,129,0.18)] hover:-translate-y-0.5' : plan.id === 'business' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_12px_24px_rgba(124,58,237,0.2)] hover:-translate-y-0.5' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:-translate-y-0.5'}`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size="sm" href="/" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ResellQ. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/cgv" className="transition-colors hover:text-foreground">CGV</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-foreground">Confidentialité</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-foreground">Mentions légales</Link>
            <Link href="/auth/signin" className="transition-colors hover:text-foreground">Connexion</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
