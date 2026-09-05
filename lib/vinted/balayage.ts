/**
 * Le balayage d'une catégorie, par tranches de prix.
 *
 * Deux modes de lecture cohabitent dans le collecteur, parce qu'ils répondent à
 * deux questions différentes :
 *
 *  - le rafraîchissement (une page, tri par date) répond à « qu'est-ce qui
 *    vient d'être mis en ligne ? ». Rapide, il tourne toutes les heures ;
 *  - le balayage (tranche de prix par tranche de prix) répond à « à quoi
 *    ressemble ce marché, et qu'est-ce qui en est parti ? ». Il coûte des
 *    dizaines de requêtes, donc il tourne deux fois par jour.
 *
 * Le découpage par prix n'est pas une optimisation, c'est une obligation.
 * Vinted plafonne toute recherche à 960 résultats — la page 11 répond
 * HTTP 400 — et renvoie `total_entries: 960` même sur « Sneakers ». Une
 * catégorie ne peut donc pas être parcourue d'un bloc. Sans découpage, deux
 * défauts en découlent, et ce sont exactement ceux qu'on corrige :
 *
 *  - en triant par date, on ne voyait que les 96 dernières mises en ligne. Les
 *    médianes décrivaient la nouveauté et pas le marché, d'où des chiffres qui
 *    sautaient d'un jour à l'autre ; et les annonces plus anciennes, jamais
 *    revues, étaient déclarées périmées au bout de sept jours alors qu'elles
 *    étaient toujours en vente ;
 *  - en triant par prix sans découper, on ne voyait que les 960 annonces les
 *    moins chères, c'est-à-dire des chaussons à 2 € — le fond de panier qui
 *    remontait en tête des « opportunités ».
 *
 * Découpée en tranches, chaque tranche a son propre plafond de 960. Une tranche
 * qui rend moins que ça a été vue en entier : dans cet intervalle de prix, une
 * annonce absente est réellement partie. C'est ce qui rend la rotation
 * mesurable, et c'est la seule chose que Vinted laisse mesurer — le site ne
 * publie aucune transaction.
 */

import { balayerParTranches, VintedAuthError, VintedBlockedError, type ZoneCouverte } from './api'
import { persistVintedScanResults } from '@/lib/market-sync'
import type { CauseEchec } from '@/lib/vinted-bot'

export interface BilanBalayage {
  categorie: string
  statut: 'ok' | 'partiel' | CauseEchec
  pagesLues: number
  annoncesVues: number
  annoncesEcrites: number
  /** Tranches de prix parcourues, et lesquelles l'ont été en entier. */
  zones: ZoneCouverte[]
  /** Nombre de tranches vues en entier. */
  zonesFiables: number
  /** Index de tranche par lequel commencer au prochain balayage. */
  prochainDepart: number
  absentes: number
  disparues: number
  dureeMs: number
  erreur?: string
}

function classer(erreur: unknown): { cause: CauseEchec; detail: string } {
  if (erreur instanceof VintedBlockedError) return { cause: 'blocked', detail: erreur.message }
  if (erreur instanceof VintedAuthError) return { cause: 'auth', detail: erreur.message }
  const message = erreur instanceof Error ? erreur.message : String(erreur)
  if (/budget de temps/i.test(message)) return { cause: 'timeout', detail: message }
  if (/items|format|JSON/i.test(message)) return { cause: 'format', detail: message }
  return { cause: 'network', detail: message }
}

export async function balayerCategorie(options: {
  query: string
  category?: string
  budgetPages?: number
  depart?: number
  deadline?: number
}): Promise<BilanBalayage> {
  const debut = Date.now()
  const categorie = options.category || options.query
  const vide = {
    categorie,
    pagesLues: 0,
    annoncesVues: 0,
    annoncesEcrites: 0,
    zones: [] as ZoneCouverte[],
    zonesFiables: 0,
    prochainDepart: options.depart ?? 0,
    absentes: 0,
    disparues: 0,
  }

  let resultat: Awaited<ReturnType<typeof balayerParTranches>>
  try {
    resultat = await balayerParTranches({
      searchText: options.query,
      budgetPages: options.budgetPages ?? 70,
      depart: options.depart ?? 0,
      deadline: options.deadline,
    })
  } catch (erreur) {
    const { cause, detail } = classer(erreur)
    return { ...vide, statut: cause, erreur: detail, dureeMs: Date.now() - debut }
  }

  const annonces = resultat.items.map((a) => ({ ...a, category: categorie }))
  const fiables = resultat.zones.filter((z) => z.exhaustive)

  if (annonces.length === 0) {
    return {
      ...vide,
      statut: resultat.interrompuPar ? classer(resultat.interrompuPar).cause : 'format',
      pagesLues: resultat.pagesLues,
      zones: resultat.zones,
      prochainDepart: resultat.prochainDepart,
      erreur: resultat.interrompuPar?.message ?? "Le balayage n'a ramené aucune annonce.",
      dureeMs: Date.now() - debut,
    }
  }

  const bilan = await persistVintedScanResults(
    annonces,
    categorie,
    // On ne transmet que les tranches vues en entier. Les autres ont bien
    // alimenté la base — c'est toujours ça de pris — mais rien n'y sera conclu
    // sur une absence, puisqu'on sait qu'on n'a pas tout regardé.
    fiables.length > 0 ? { zones: fiables.map((z) => ({ from: z.from, to: z.to })) } : undefined,
  )

  return {
    categorie,
    statut: resultat.interrompuPar ? 'partiel' : 'ok',
    pagesLues: resultat.pagesLues,
    annoncesVues: annonces.length,
    annoncesEcrites: bilan.annoncesEcrites,
    zones: resultat.zones,
    zonesFiables: fiables.length,
    prochainDepart: resultat.prochainDepart,
    absentes: bilan.absentes,
    disparues: bilan.disparues,
    dureeMs: Date.now() - debut,
    erreur: resultat.interrompuPar?.message,
  }
}
