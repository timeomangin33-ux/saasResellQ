/**
 * Est-ce que ça se vend ?
 *
 * C'est la question qui décide d'un achat, et c'est aussi celle à laquelle
 * Vinted refuse de répondre : le site ne publie aucune transaction. Personne ne
 * peut lire un prix de vente sur Vinted, ni nous ni un concurrent — d'où le
 * vocabulaire tenu partout dans l'application, « prix demandés », jamais « prix
 * de vente ».
 *
 * Ce qui est observable, c'est le sort d'une annonce précise. `verification.ts`
 * lit sa page publique sept jours après l'avoir vue pour la première fois, et
 * y trouve une réponse franche : supprimée, clôturée, retirée du catalogue, ou
 * toujours en ligne. Vendue ou retirée : impossible de trancher entre les deux,
 * et on ne tranche pas — le libellé affiché dit « plus en vente (vendue ou
 * retirée) ». Même avec cette réserve, le chiffre est utile : une catégorie
 * dont 40 % du stock part en une semaine tourne, une à 5 % est un cimetière, et
 * c'est exactement ce qu'un revendeur a besoin de savoir avant d'acheter.
 *
 * Ce fichier ne fait qu'agréger ces vérifications. Deux précautions y sont
 * prises, et elles portent tout le sens du chiffre.
 *
 * D'abord, le calcul se fait par cohorte et non sur le stock courant. « Quelle
 * part des annonces actives a disparu » n'a aucun sens : une annonce active est
 * par définition une annonce qui n'est pas partie. Chaque annonce vérifiée a eu
 * exactement la même fenêtre de sept jours, donc les proportions se comparent
 * d'une catégorie à l'autre et d'une semaine à l'autre.
 *
 * Ensuite, les vérifications sans réponse claire — page illisible, réponse
 * inattendue — sont écartées du dénominateur au lieu d'être comptées comme
 * « toujours en ligne ». Les compter ferait baisser le taux à chaque incident
 * réseau, et un marché paraîtrait mou pour une raison qui n'aurait rien à voir
 * avec le marché.
 */

import { prisma } from '@/prisma'

/** Fenêtre d'observation accordée à chaque annonce de la cohorte. */
export const FENETRE_JOURS = 7
/** Ancienneté maximale d'une vérification retenue : au-delà, le marché a changé. */
const COHORTE_JOURS = 30
/** En dessous, le taux est trop bruité pour être publié. */
export const COHORTE_MINIMUM = 30

export interface Rotation {
  /** Part de la cohorte qui n'était plus en vente à 7 jours. `null` si pas mesurable. */
  taux: number | null
  /** Nombre de vérifications concluantes retenues. */
  cohorte: number
  /** Annonces vérifiées qui n'étaient plus en vente. */
  disparues: number
  /** Délai médian observé avant disparition, en jours. */
  joursMedian: number | null
  /** Phrase courte, affichable telle quelle. */
  explication: string
}

export async function mesurerRotation(category: string): Promise<Rotation> {
  const [ligne] = await prisma.$queryRaw<
    { cohorte: bigint; parties: bigint; indeterminees: bigint; jours_median: number | null }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE "finalState" <> 'unknown') AS cohorte,
      COUNT(*) FILTER (WHERE "finalState" IN ('closed', 'hidden', 'deleted')) AS parties,
      COUNT(*) FILTER (WHERE "finalState" = 'unknown') AS indeterminees,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM ("disappearedAt" - "createdAt")) / 86400.0
      ) FILTER (WHERE "disappearedAt" IS NOT NULL)::float8 AS jours_median
    FROM "products"
    WHERE category = ${category}
      AND "checkedAt" IS NOT NULL
      AND "checkedAt" >= NOW() - (${COHORTE_JOURS} * INTERVAL '1 day')
  `

  const cohorte = Number(ligne?.cohorte ?? 0)
  const disparues = Number(ligne?.parties ?? 0)
  const joursMedian = ligne?.jours_median ?? null

  if (cohorte < COHORTE_MINIMUM) {
    return {
      taux: null,
      cohorte,
      disparues,
      joursMedian: null,
      explication:
        `Rotation pas encore mesurable : ${cohorte} annonce${cohorte > 1 ? 's' : ''} vérifiée${cohorte > 1 ? 's' : ''} ` +
        `sur ${COHORTE_MINIMUM} nécessaires. Chaque annonce est vérifiée une fois, ${FENETRE_JOURS} jours après sa ` +
        `première vue : la mesure démarre donc une semaine après le suivi de la catégorie.`,
    }
  }

  const taux = disparues / cohorte
  const pourcent = Math.round(taux * 100)

  return {
    taux,
    cohorte,
    disparues,
    joursMedian,
    explication:
      `${pourcent} % des annonces vérifiées n'étaient plus en vente ${FENETRE_JOURS} jours après leur mise en ligne ` +
      `(${disparues} sur ${cohorte})` +
      (joursMedian !== null ? `, délai médian ${joursMedian.toFixed(1)} jour${joursMedian >= 2 ? 's' : ''}` : '') +
      `. Vérifié annonce par annonce sur Vinted. « Plus en vente » veut dire vendue ou retirée : ` +
      `Vinted ne publie pas les transactions, donc personne ne peut affirmer laquelle des deux.`,
  }
}

/** Repère de lecture, calé sur ce qui est observable et non sur une promesse. */
export function qualifierRotation(taux: number | null): 'rapide' | 'normale' | 'lente' | 'inconnue' {
  if (taux === null) return 'inconnue'
  if (taux >= 0.35) return 'rapide'
  if (taux >= 0.15) return 'normale'
  return 'lente'
}
