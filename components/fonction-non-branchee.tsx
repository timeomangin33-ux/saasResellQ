'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, PlugZap } from 'lucide-react'
import DashboardLayout from '@/app/dashboard-layout'

/**
 * Ce qu'on affiche à la place d'une fonction qui ne peut pas répondre.
 *
 * Le menu masque déjà ces entrées quand leur service n'est pas branché. Mais
 * masquer une entrée ne ferme pas la page : un favori, un lien dans un ancien
 * e-mail, une adresse retapée y mènent encore. On y voyait alors un écran de
 * chargement, puis « La génération du rapport a échoué » — un message qui
 * accuse la requête, laisse croire à un incident passager, et se termine en
 * demande de support.
 *
 * Dire que la fonction n'est pas branchée est plus court, plus vrai, et
 * n'invite pas à réessayer dix fois.
 */

type Etat = 'chargement' | 'branchee' | 'non-branchee'

/**
 * Interroge une seule fois `/api/integrations`.
 *
 * On part de « chargement » et jamais de « branchée » : afficher la page puis
 * la remplacer par un refus, le temps d'un aller-retour, est pire que
 * d'attendre.
 */
export function useFonction(nom: string): Etat {
  const [etat, setEtat] = useState<Etat>('chargement')

  useEffect(() => {
    let actif = true
    fetch('/api/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!actif) return
        // Une réponse illisible ne doit pas condamner la page : on la laisse
        // s'afficher et échouer normalement, plutôt que d'annoncer à tort
        // qu'une fonction est débranchée.
        setEtat(d?.fonctions?.[nom] === false ? 'non-branchee' : 'branchee')
      })
      .catch(() => { if (actif) setEtat('branchee') })
    return () => { actif = false }
  }, [nom])

  return etat
}

export function FonctionNonBranchee({ titre, detail }: { titre: string; detail: string }) {
  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-2xl flex-col px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-card/60 p-8 backdrop-blur">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">
            <PlugZap className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{titre}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{detail}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Rien n'a été débité : cette page n'a lancé aucun traitement. Vos autres fonctions, elles, répondent
            normalement.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}

/** L'écran d'attente, le temps de savoir. Volontairement nu. */
export function FonctionEnCoursDeVerification() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-card/40" />
      </div>
    </DashboardLayout>
  )
}
