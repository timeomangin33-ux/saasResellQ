'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

type Manquante = { nom: string; consequence: string }

/**
 * Prévient quand une fonction de la page ne peut pas s'exécuter faute de clé.
 *
 * Une alerte qui se crée sans jamais envoyer d'e-mail est pire qu'une alerte
 * refusée : l'utilisateur compte dessus. Tant que la clé n'est pas posée, on
 * le dit ici plutôt que de le laisser découvrir en ne recevant rien.
 */
export function IntegrationsNotice({ cles }: { cles: string[] }) {
  const [manquantes, setManquantes] = useState<Manquante[]>([])

  useEffect(() => {
    let vivant = true
    fetch('/api/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivant || !d?.manquantes) return
        setManquantes(d.manquantes.filter((m: Manquante) => cles.includes(m.nom)))
      })
      .catch(() => {
        // Un avertissement absent ne doit pas casser la page.
      })
    return () => {
      vivant = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cles.join('|')])

  if (manquantes.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
      {manquantes.map((m) => (
        <div key={m.nom} className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
          <p className="text-sm leading-6 text-amber-100/90">
            <span className="font-semibold">{m.nom} — indisponible.</span> {m.consequence}
          </p>
        </div>
      ))}
    </div>
  )
}
