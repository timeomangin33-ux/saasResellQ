'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3 } from 'lucide-react'

/**
 * Le bandeau de fraîcheur des données.
 *
 * Il existe parce que la collecte s'est arrêtée cinq jours sans que rien ne
 * le montre : les pages affichaient des médianes, des tendances et des
 * « opportunités » qui décrivaient un marché disparu, avec exactement la même
 * assurance que la veille.
 *
 * Il ne s'affiche que lorsqu'il a quelque chose à dire. Un bandeau vert
 * permanent « tout va bien » finirait par ne plus être lu, et prendrait de la
 * place sur toutes les pages pour ne rien apprendre.
 */

interface Sante {
  statut: 'ok' | 'ralentie' | 'arretee' | 'jamais-demarree'
  ageMinutes: number | null
  message: string
  ciblesEnEchec: { query: string; statut: string }[]
}

export function EtatCollecte() {
  const [sante, setSante] = useState<Sante | null>(null)

  useEffect(() => {
    let vivant = true

    async function lire() {
      try {
        const res = await fetch('/api/collecte/sante')
        if (!res.ok) return
        const data = (await res.json()) as Sante
        if (vivant) setSante(data)
      } catch {
        // Le bandeau est une information de confort : s'il ne se charge pas,
        // il ne doit rien casser ni rien afficher de faux.
      }
    }

    void lire()
    // Une relecture toutes les cinq minutes suffit : la fraîcheur se mesure en
    // heures, pas en secondes.
    const id = window.setInterval(lire, 5 * 60_000)
    return () => {
      vivant = false
      window.clearInterval(id)
    }
  }, [])

  if (!sante || sante.statut === 'ok') return null

  const grave = sante.statut === 'arretee' || sante.statut === 'jamais-demarree'
  const Icone = grave ? AlertTriangle : Clock3

  return (
    <div
      role="status"
      className={`mx-4 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm lg:mx-8 ${
        grave
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      }`}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">
          {grave ? 'Les chiffres affichés ne sont plus à jour' : 'La collecte a pris du retard'}
        </p>
        <p className="mt-0.5 opacity-90">{sante.message}</p>
        {sante.ciblesEnEchec.length > 0 && (
          <p className="mt-1 truncate text-xs opacity-75">
            En échec : {sante.ciblesEnEchec.map((c) => `${c.query} (${c.statut})`).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
