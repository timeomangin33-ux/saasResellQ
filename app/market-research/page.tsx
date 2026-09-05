'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DashboardLayout from '@/app/dashboard-layout'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { VINTED_CATEGORIES } from '@/vinted'
import { Search, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react'

interface CategoryItem {
  name: string
  median_price?: number | null
  p25_price?: number | null
  p75_price?: number | null
  price_sample?: number | null
  volume_active?: number | null
  product_count?: number | null
  history_days?: number | null
  confidence?: 'confirme' | 'en-mesure' | 'insuffisant' | string
  publishable?: boolean
  quality_note?: string | null
  topItems?: Array<{ title: string; brand: string | null; price: number }>
}

/**
 * Même repère de fiabilité que sur /categories, et surtout le même vocabulaire :
 * la page affichait auparavant une pastille verte « Live » sur chaque ligne, y
 * compris sur des catégories suivies depuis zéro jour (confidence
 * « insuffisant »), ce qui donnait à une absence de mesure l'apparence d'une
 * donnée temps réel.
 */
const CONFIANCE: Record<string, { texte: string; classe: string }> = {
  confirme: { texte: 'Mesure confirmée', classe: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' },
  'en-mesure': { texte: 'Mesure en cours', classe: 'border-amber-400/20 bg-amber-500/10 text-amber-200' },
  insuffisant: { texte: 'Trop peu de recul', classe: 'border-white/10 bg-white/[0.03] text-slate-400' },
}

const TRIS = [
  { value: 'volume', label: "Volume d'annonces" },
  { value: 'prix', label: 'Prix demandé médian' },
  { value: 'nom', label: 'Ordre alphabétique' },
] as const

type Tri = (typeof TRIS)[number]['value']

function normaliser(valeur: string) {
  return valeur.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/**
 * Le bouton « Détails » pointait vers /categories/<nom affiché>, alors que
 * app/categories/[slug]/page.tsx cherche `c.slug` dans VINTED_CATEGORIES :
 * chaque lien tombait sur « Catégorie non trouvée ». On résout donc le nom vers
 * son slug, et on n'affiche pas de lien quand la catégorie n'a pas de fiche.
 */
function slugDeCategorie(nom: string): string | null {
  const cible = normaliser(nom)
  const trouvee = VINTED_CATEGORIES.find(
    (c) => normaliser(c.name) === cible || normaliser(c.slug) === cible
  )
  return trouvee?.slug ?? null
}

function nombreOuNull(valeur: number | null | undefined): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

function volume(item: CategoryItem): number {
  return nombreOuNull(item.product_count) ?? nombreOuNull(item.volume_active) ?? 0
}

export default function MarketResearchPage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Toutes')
  const [tri, setTri] = useState<Tri>('volume')
  const [masquerNonMesurees, setMasquerNonMesurees] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/vinted/top-categories')
        const data = await res.json()
        setCategories(Array.isArray(data.categories) ? data.categories : [])
      } catch {
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const resultats = categories.filter((item) => {
      const matchesCategory = selectedCategory === 'Toutes' || item.name === selectedCategory
      const matchesQuery = !query.trim() || item.name.toLowerCase().includes(query.toLowerCase())
      const matchesMesure = !masquerNonMesurees || item.confidence !== 'insuffisant'
      return matchesCategory && matchesQuery && matchesMesure
    })

    return [...resultats].sort((a, b) => {
      if (tri === 'nom') return a.name.localeCompare(b.name, 'fr')
      if (tri === 'prix') {
        // Une catégorie sans relevé de prix passe derrière plutôt que d'être
        // traitée comme valant 0 €.
        const prixA = nombreOuNull(a.median_price)
        const prixB = nombreOuNull(b.median_price)
        if (prixA === null && prixB === null) return volume(b) - volume(a)
        if (prixA === null) return 1
        if (prixB === null) return -1
        return prixB - prixA
      }
      return volume(b) - volume(a)
    })
  }, [categories, query, selectedCategory, tri, masquerNonMesurees])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_#0d100e_0%,_#09090b_100%)] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="kicker">Explorateur de marché</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Un moteur de recherche premium, pensé pour l'action.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Recherchez une catégorie, triez par volume d'annonces ou par prix demandé médian. Chaque ligne indique ce que vaut la mesure derrière elle.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 text-white">
                <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                </motion.span>
                Recherche instantanée
              </div>
              <p className="mt-2 max-w-xs text-sm leading-5">Prix demandés uniquement : Vinted ne publie aucune transaction.</p>
            </div>
          </div>
        </motion.section>

        <Reveal delay={0.05} className="mt-6">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="panel panel-hover p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 transition-colors focus-within:border-emerald-400/40">
                <Search className="h-4 w-4 text-emerald-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une catégorie"
                  className="w-full bg-transparent outline-none placeholder:text-zinc-500"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Magnetic strength={0.1}>
                  <button onClick={() => setSelectedCategory('Toutes')} className={`rounded-full border px-3 py-2 text-sm transition-colors ${selectedCategory === 'Toutes' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>Toutes</button>
                </Magnetic>
                {categories.slice(0, 6).map((item) => (
                  <Magnetic key={item.name} strength={0.1}>
                    <button onClick={() => setSelectedCategory(item.name)} className={`rounded-full border px-3 py-2 text-sm transition-colors ${selectedCategory === item.name ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'}`}>{item.name}</button>
                  </Magnetic>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </Reveal>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Cette carte listait « Prix • Marque • Catégorie • État », « Popularité •
              Demande • ROI • Marge » et « Tri intelligent » dans de simples <div> :
              rien n'était cliquable, rien ne filtrait. Ne restent que les deux
              réglages qui agissent réellement sur la liste. */}
          <Reveal className="panel panel-hover p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
              Tri &amp; filtres
            </div>
            <div className="mt-4 space-y-4 text-sm text-zinc-400">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">Trier par</p>
                <div className="space-y-2">
                  {TRIS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTri(option.value)}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        tri === option.value
                          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <input
                  type="checkbox"
                  checked={masquerNonMesurees}
                  onChange={(event) => setMasquerNonMesurees(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-emerald-400"
                />
                <span>
                  Masquer les catégories sans recul suffisant
                  <span className="mt-1 block text-[11px] text-zinc-500">Écarte celles dont la mesure n'est pas encore exploitable.</span>
                </span>
              </label>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="panel panel-hover lg:col-span-2 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Résultats</p>
                <p className="mt-1 text-sm text-zinc-500">{filtered.length > 0 ? `${filtered.length} catégorie${filtered.length > 1 ? 's' : ''} correspondante${filtered.length > 1 ? 's' : ''}` : 'Aucun résultat'}</p>
              </div>
            </div>

            <StaggerGroup className="mt-5 space-y-3">
              {loading ? (
                [...Array(3)].map((_, index) => (
                  <div key={index} className="h-20 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <motion.div
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '400%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: index * 0.1 }}
                    />
                  </div>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((item) => {
                  const confiance = CONFIANCE[item.confidence ?? 'insuffisant'] ?? CONFIANCE.insuffisant
                  const median = nombreOuNull(item.median_price)
                  const p25 = nombreOuNull(item.p25_price)
                  const p75 = nombreOuNull(item.p75_price)
                  const slug = slugDeCategorie(item.name)
                  return (
                    <motion.div
                      key={item.name}
                      variants={staggerItem}
                      whileHover={{ x: 4 }}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-emerald-400/25 hover:bg-emerald-500/[0.04] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] ${confiance.classe}`}
                            title={item.quality_note ?? undefined}
                          >
                            {confiance.texte}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            {volume(item)} annonces
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400 tabular-nums">
                          Prix demandé médian {median === null ? '—' : `${Math.round(median)} €`}
                          {p25 !== null && p75 !== null
                            ? ` • la moitié des annonces entre ${Math.round(p25)} € et ${Math.round(p75)} €`
                            : ''}
                        </p>
                        <p className="mt-1 text-[12px] text-zinc-500">
                          {median === null
                            ? 'Relevé de prix en cours sur cette catégorie.'
                            : item.price_sample
                              ? `sur ${item.price_sample} annonces récentes • ${item.history_days ?? 0} jour${(item.history_days ?? 0) > 1 ? 's' : ''} de relevés`
                              : `${item.history_days ?? 0} jour${(item.history_days ?? 0) > 1 ? 's' : ''} de relevés`}
                        </p>
                      </div>
                      {slug ? (
                        <Magnetic strength={0.15}>
                          <Link href={`/categories/${slug}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-200">
                            Détails
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Magnetic>
                      ) : (
                        <span className="text-[12px] text-zinc-600">Pas de fiche détaillée</span>
                      )}
                    </motion.div>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-zinc-500">
                  Aucune donnée disponible pour cette combinaison de filtres.
                </div>
              )}
            </StaggerGroup>
          </Reveal>
        </section>
      </div>
    </DashboardLayout>
  )
}
