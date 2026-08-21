'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lock, TrendingDown, TrendingUp } from 'lucide-react'

type Point = {
  day: string
  avgPrice: number | null
  medianPrice: number | null
  volumeActive: number | null
}

type Reponse = {
  points: Point[]
  ready: boolean
  medianChangePercent: number | null
}

/**
 * La courbe des prix d'une catégorie.
 *
 * C'est la seule chose que le produit sait faire et qu'un relevé ponctuel ne
 * remplace pas — d'où sa place dans le forfait Business. Les trois états
 * possibles sont explicites : pas le bon forfait, pas encore assez de
 * relevés, ou la courbe.
 */
export function CategoryHistory({ category }: { category: string }) {
  const [data, setData] = useState<Reponse | null>(null)
  const [verrouille, setVerrouille] = useState(false)
  const [charge, setCharge] = useState(false)

  useEffect(() => {
    let vivant = true
    ;(async () => {
      try {
        const res = await fetch(`/api/vinted/category-history?category=${encodeURIComponent(category)}&days=30`)
        if (!vivant) return
        if (res.status === 402 || res.status === 403) {
          setVerrouille(true)
          return
        }
        if (res.ok) setData(await res.json())
      } catch {
        // Une courbe absente ne doit pas casser la page.
      } finally {
        if (vivant) setCharge(true)
      }
    })()
    return () => {
      vivant = false
    }
  }, [category])

  if (!charge) return null

  if (verrouille) {
    return (
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300/80" />
          <div>
            <h2 className="text-base font-semibold text-white">Évolution des prix</h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Le marché du jour est ouvert à tous les abonnés. Savoir si cette catégorie monte ou
              descend depuis un mois demande le forfait Business.
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-sm font-medium text-emerald-300 underline-offset-4 hover:underline"
            >
              Voir les forfaits
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (!data?.ready) {
    return (
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-base font-semibold text-white">Évolution des prix</h2>
        <p className="mt-1 max-w-xl text-sm text-zinc-400">
          Le robot enregistre un point par jour. La courbe apparaîtra dès le deuxième relevé —
          {data?.points?.length === 1 ? ' un seul est disponible pour l’instant.' : ' aucun n’a encore été enregistré pour cette catégorie.'}
        </p>
      </section>
    )
  }

  const serie = data.points.map(p => ({
    jour: new Date(p.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    median: p.medianPrice,
    moyenne: p.avgPrice,
  }))
  const variation = data.medianChangePercent
  const hausse = (variation ?? 0) >= 0

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Évolution des prix</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Prix médian relevé chaque jour, sur {data.points.length} relevés.
          </p>
        </div>
        {variation !== null ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              hausse ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
            }`}
          >
            {hausse ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {hausse ? '+' : ''}
            {variation.toString().replace('.', ',')} %
          </span>
        ) : null}
      </div>

      <div className="mt-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <XAxis dataKey="jour" stroke="#52605b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#52605b" fontSize={11} tickLine={false} axisLine={false} unit=" €" width={54} />
            <Tooltip
              contentStyle={{
                background: '#0b1210',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 13,
              }}
              labelStyle={{ color: '#8fa39c' }}
              formatter={(v: number, n: string) => [`${v?.toFixed(2)} €`, n === 'median' ? 'Médian' : 'Moyen']}
            />
            <Line type="monotone" dataKey="median" stroke="#34d399" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="moyenne" stroke="#8fa39c" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Trait plein : prix médian. Pointillés : prix moyen. L&apos;écart entre les deux dit à quel
        point quelques pièces chères tirent la catégorie vers le haut.
      </p>
    </section>
  )
}
