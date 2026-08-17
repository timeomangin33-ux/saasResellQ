'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  TrendingUp,
  BarChart3,
  Search,
  Bot,
  Zap,
  Shield,
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  TimerReset,
  ShieldCheck,
  Lock,
  CreditCard,
  UserPlus,
  Radar,
  Rocket,
  Radio,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { NumberTicker } from '@/components/ui/number-ticker'
import { PRICING_PLANS } from '@/lib/constants'

const features = [
  {
    icon: TrendingUp,
    title: 'Deals à revente rapide',
    description: 'Des opportunités qui méritent d\'être vues avant l\'ouverture des autres.',
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
    description: 'Réagis dès qu\'un produit sous-coté apparaît sur le marché.',
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

const steps = [
  {
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscription en moins d\'une minute, sans engagement. Choisissez votre plan quand vous êtes prêt.',
  },
  {
    icon: Radar,
    title: 'Laissez ResellQ observer le marché',
    description: 'Les catégories que vous suivez sont analysées en continu : prix, tendance, marge potentielle.',
  },
  {
    icon: Rocket,
    title: 'Agissez sur les meilleures opportunités',
    description: 'Recevez des alertes ciblées, comparez les marges et achetez avec un temps d\'avance.',
  },
]

const trustPoints = [
  { icon: ShieldCheck, label: 'Sans engagement' },
  { icon: Lock, label: 'Résiliation en 1 clic' },
  { icon: CreditCard, label: 'Paiement sécurisé Stripe' },
]

const faqs = [
  {
    q: 'Comment fonctionne l\'analyse des données Vinted ?',
    a: 'ResellQ surveille en continu les catégories que vous suivez et transforme les annonces en indicateurs exploitables : prix repéré, marge estimée, dynamique de la catégorie. Vous gardez la main sur les décisions d\'achat.',
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui. Vous pouvez passer d\'un plan à l\'autre depuis votre espace de facturation, sans période d\'engagement. Le changement prend effet immédiatement.',
  },
  {
    q: 'Que sont les crédits IA ?',
    a: 'Chaque plan inclut un quota de crédits IA mensuels pour l\'assistant et la recherche produit. Ils se rechargent chaque mois selon votre forfait.',
  },
  {
    q: 'Est-ce que je peux résilier facilement ?',
    a: 'Oui, en un clic depuis votre facturation. Aucune démarche par email ou téléphone n\'est nécessaire.',
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: 'Les paiements sont traités par Stripe et vos données ne sont jamais revendues. Vous pouvez consulter le détail dans notre politique de confidentialité.',
  },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Reveal delay={index * 0.04} className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-foreground sm:text-base">{q}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`} />
      </button>
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0">
          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </Reveal>
  )
}

export default function LandingPage() {
  const [monthlyItems, setMonthlyItems] = useState(12)
  const opportunityScore = Math.round(monthlyItems * 5 + 30)
  const { scrollYProgress } = useScroll()
  const navOpacity = useTransform(scrollYProgress, [0, 0.03], [0.4, 0.92])
  const [liveStats, setLiveStats] = useState<{ productsTracked: number; categoriesTracked: number } | null>(null)

  useEffect(() => {
    fetch('/api/public/stats')
      .then((res) => res.json())
      .then((data) => setLiveStats(data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),radial-gradient(circle_at_90%_10%,_rgba(14,165,233,0.13),_transparent_28%),linear-gradient(180deg,_#060b12_0%,_#0a111b_100%)] text-foreground">
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-400"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          animate={{ y: [0, 24, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[-8%] top-16 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-x-0 top-0 h-[560px] bg-grid-pattern" />
      </div>

      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl"
      >
        <motion.div className="absolute inset-0 -z-10 bg-background" style={{ opacity: navOpacity }} />
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Connexion
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="btn-shine bg-gradient-to-r from-primary via-emerald-400 to-primary">S'inscrire</Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Le marché Vinted, scanné en continu, pendant que vous faites autre chose.
            </div>

            <h1 className="mb-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Repérez le bon deal
              <br />
              avant tout le monde, <span className="text-gradient">pas après.</span>
            </h1>

            <p className="mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">
              ResellQ surveille Vinted à votre place et transforme chaque annonce en décision simple : prix d'achat, marge réelle, risque, opportunité. Vous, vous achetez.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Magnetic strength={0.25}>
                <Link href="/auth/signup">
                  <Button size="lg" className="btn-shine group w-full gap-2 bg-gradient-to-r from-primary via-emerald-400 to-primary sm:w-auto">
                    Commencer gratuitement
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <Link href="/demo">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Voir la démo
                  </Button>
                </Link>
              </Magnetic>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              {trustPoints.map(point => (
                <div key={point.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <point.icon className="h-3.5 w-3.5 text-emerald-400/80" />
                  {point.label}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroHighlights.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + index * 0.06 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur transition-colors hover:border-primary/30"
                >
                  <p className="text-lg font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}>
            <div className="rounded-[32px] border border-white/10 bg-background/80 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur">
              <SpotlightCard className="rounded-[24px] border border-white/10 bg-card/90 p-5" spotlightColor="rgba(16,185,129,0.12)">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">Mini-démo</p>
                    <h2 className="text-lg font-semibold">Deals chauds détectés</h2>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
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
                        whileInView={{ height }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.2 + index * 0.05 }}
                        className="flex-1 rounded-full bg-gradient-to-t from-primary to-sky-300"
                      />
                    ))}
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <Reveal className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Visualisation d'activité</p>
              <h2 className="text-xl font-semibold">Suivez votre volume et priorisez vos actions</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-right">
              <p className="text-xs text-muted-foreground">Score d'opportunité</p>
              <motion.p key={opportunityScore} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="text-2xl font-semibold text-accent">{opportunityScore}</motion.p>
              <p className="mt-1 text-[11px] text-muted-foreground">Estimation indicative selon votre activité.</p>
            </div>
          </div>

          <div className="grid items-center gap-5 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-sm font-medium">Articles vendus par mois</p>
              <p className="mt-1 text-xs text-muted-foreground">Plus votre volume monte, plus votre base d'analyse se renforce.</p>
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
        </Reveal>
      </section>

      <section className="border-y border-white/10 bg-background/40 px-6 py-12 backdrop-blur">
        <StaggerGroup className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          <motion.div variants={staggerItem} className="text-center">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {liveStats ? <NumberTicker value={liveStats.productsTracked} className="text-foreground" /> : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Annonces suivies en ce moment</p>
          </motion.div>
          <motion.div variants={staggerItem} className="text-center">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {liveStats ? <NumberTicker value={liveStats.categoriesTracked} className="text-foreground" /> : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Catégories scannées en continu</p>
          </motion.div>
          {stats.slice(2).map(stat => (
            <motion.div key={stat.label} variants={staggerItem} className="text-center">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </StaggerGroup>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <p className="kicker mb-3 justify-center">Comment ça marche</p>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Trois étapes entre vous et votre prochain bon deal
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Pas de configuration complexe : ResellQ est pensé pour être opérationnel en quelques minutes.
            </p>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.1} className="panel panel-hover p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-semibold text-white/10">0{index + 1}</span>
                </div>
                <h3 className="mb-2 text-base font-medium text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
              Un workflow clair, de la découverte au choix final
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Tout est pensé pour limiter le bruit et vous aider à agir vite sur ce qui compte vraiment.
            </p>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Reveal key={feature.title} delay={(index % 3) * 0.06}>
                  <SpotlightCard className="panel panel-hover h-full p-5" spotlightColor="rgba(16,185,129,0.1)">
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 transition-transform duration-300 group-hover/spot:scale-110">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-medium text-foreground">{feature.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </SpotlightCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-card/30 px-6 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <Reveal>
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
                <div key={item.label} className="rounded-2xl border border-white/10 bg-background/70 p-4 transition-colors hover:border-primary/30">
                  <p className="text-xl font-semibold text-primary tabular-nums">{item.stat}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="panel p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
              <Radio className="h-3.5 w-3.5" />
              Aucune donnée inventée
            </div>
            <p className="mb-3 text-base leading-relaxed text-foreground">
              Pas de faux avis, pas de chiffres gonflés. ResellQ scanne réellement Vinted et n'affiche que ce qu'il trouve — quand la donnée manque, on vous le dit plutôt que d'inventer un résultat.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              C'est un produit jeune, en évolution rapide. Vous serez parmi les premiers à l'utiliser, avec un accès direct pour orienter ce qu'on construit ensuite.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="pricing" className="px-6 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-24 h-[260px] w-[260px] rounded-full bg-violet-500/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.08),_transparent_25%)] opacity-40" />

          <Reveal className="relative mb-14 text-center">
            <p className="text-sm uppercase tracking-[0.36em] text-slate-400">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Plans premium pour revendeurs Vinted</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Trois offres claires, sans engagement. Changez de plan ou résiliez en un clic, à tout moment.
            </p>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING_PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-10 text-center">
            <p className="kicker mb-3 justify-center">Questions fréquentes</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tout ce qu'il faut savoir</h2>
          </Reveal>
          <div className="panel px-6">
            {faqs.map((item, index) => (
              <FaqItem key={item.q} q={item.q} a={item.a} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-background to-violet-500/10 p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-60" />
          <Sparkles className="mx-auto mb-5 h-8 w-8 text-primary" />
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Prêt à trouver votre prochain bon deal ?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground sm:text-base">
            Rejoignez ResellQ et transformez chaque session de veille en décision claire, appuyée sur des données réelles.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.25}>
              <Link href="/auth/signup">
                <Button size="lg" className="btn-shine gap-2 bg-gradient-to-r from-primary via-emerald-400 to-primary">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link href="/demo">
                <Button variant="outline" size="lg">Voir la démo</Button>
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
