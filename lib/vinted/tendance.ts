/**
 * La tendance d'une catégorie.
 *
 * Le problème que ce fichier corrige, mot pour mot tel qu'il a été constaté :
 * « les catégories, un jour ça monte, l'autre ça baisse ». Ce n'était pas le
 * marché qui bougeait, c'était la mesure.
 *
 * L'ancienne version comparait le prix moyen du passage courant à celui du
 * passage précédent — deux relevés séparés d'une heure, chacun portant sur les
 * 96 dernières annonces mises en ligne. Deux paires de sneakers chères
 * publiées dans l'intervalle suffisaient à faire +4 %, et le seuil était à
 * 2 %. La flèche changeait donc de sens presque à chaque passage, sans que
 * rien n'ait bougé chez les vendeurs. Une flèche qui s'inverse tous les jours
 * ne dit pas quoi acheter : elle dit seulement qu'on regarde du bruit.
 *
 * Trois changements, qui traitent trois causes distinctes :
 *
 *  1. On compare des *fenêtres*, pas des instants. La médiane des trois
 *     derniers jours contre la médiane de la semaine d'avant. Une journée
 *     atypique ne pèse plus qu'un tiers d'un côté au lieu de tout.
 *  2. On exige de l'historique. Sans dix jours de relevés, la tendance n'est
 *     pas « stable », elle est *inconnue*, et c'est ce mot qui doit s'afficher.
 *  3. Hystérésis. Il faut franchir 5 % pour entrer dans une tendance, mais
 *     repasser sous 2 % pour en sortir. Une valeur qui oscille autour du seuil
 *     ne fait plus battre la flèche : la zone morte l'en empêche.
 */

import { prisma } from '@/prisma'

/** Amplitude à franchir pour déclarer une tendance. */
const SEUIL_ENTREE = 5
/** Amplitude en dessous de laquelle on revient à « stable ». */
const SEUIL_SORTIE = 2
/** Points minimum dans chaque fenêtre pour que la comparaison ait un sens. */
const POINTS_MINIMUM = 2
/** Jours d'historique en dessous desquels on ne conclut rien. */
export const HISTORIQUE_MINIMUM = 10

export type Direction = 'up' | 'down' | 'stable' | 'inconnue'

export interface Tendance {
  direction: Direction
  /** Variation en pourcentage entre la fenêtre de référence et la récente. */
  variation: number | null
  /** Médiane de la fenêtre récente. */
  prixRecent: number | null
  /** Médiane de la fenêtre de référence. */
  prixReference: number | null
  /** Jours distincts de relevé disponibles. */
  historyDays: number
  /** Phrase courte, affichable telle quelle. */
  explication: string
}

function medianeDe(valeurs: number[]): number | null {
  const tries = valeurs.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
  if (tries.length === 0) return null
  const milieu = Math.floor(tries.length / 2)
  return tries.length % 2 === 1 ? tries[milieu] : (tries[milieu - 1] + tries[milieu]) / 2
}

function jourUTC(decalage: number) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - decalage)
  return d
}

/**
 * Calcule la tendance d'une catégorie à partir de son historique quotidien.
 *
 * `directionPrecedente` sert à l'hystérésis : sans elle, la zone morte n'aurait
 * pas de sens, puisqu'on ne saurait pas de quelle tendance on est en train de
 * sortir.
 */
export async function calculerTendance(
  category: string,
  directionPrecedente?: string | null,
): Promise<Tendance> {
  const points = await prisma.categoryMarketDaily.findMany({
    where: { category, day: { gte: jourUTC(21) } },
    orderBy: { day: 'asc' },
    select: { day: true, medianPrice: true, avgPrice: true },
  })

  const utilisables = points.filter((p) => (p.medianPrice ?? p.avgPrice ?? 0) > 0)
  const historyDays = utilisables.length

  const prixDe = (p: (typeof utilisables)[number]) => (p.medianPrice ?? p.avgPrice) as number

  // Fenêtre récente : aujourd'hui et les trois jours précédents.
  const debutRecent = jourUTC(3)
  // Fenêtre de référence : la semaine d'avant, sans chevauchement.
  const debutReference = jourUTC(13)
  const finReference = jourUTC(7)

  const recents = utilisables.filter((p) => p.day >= debutRecent)
  const references = utilisables.filter((p) => p.day >= debutReference && p.day <= finReference)

  const prixRecent = medianeDe(recents.map(prixDe))
  const prixReference = medianeDe(references.map(prixDe))

  if (
    historyDays < HISTORIQUE_MINIMUM ||
    recents.length < POINTS_MINIMUM ||
    references.length < POINTS_MINIMUM ||
    prixRecent === null ||
    prixReference === null ||
    prixReference === 0
  ) {
    return {
      direction: 'inconnue',
      variation: null,
      prixRecent,
      prixReference,
      historyDays,
      explication:
        `Tendance pas encore mesurable : ${historyDays} jour${historyDays > 1 ? 's' : ''} de relevés sur ` +
        `${HISTORIQUE_MINIMUM} nécessaires. Une flèche affichée maintenant serait du bruit, pas une tendance.`,
    }
  }

  const variation = ((prixRecent - prixReference) / prixReference) * 100

  // Entrer dans une tendance demande 5 % ; en sortir demande de repasser sous
  // 2 %. C'est ce décalage entre les deux seuils qui empêche la flèche de
  // s'inverser à chaque passage quand la variation flotte autour de la limite.
  let direction: Direction
  if (variation >= SEUIL_ENTREE) direction = 'up'
  else if (variation <= -SEUIL_ENTREE) direction = 'down'
  else if (directionPrecedente === 'up' && variation > SEUIL_SORTIE) direction = 'up'
  else if (directionPrecedente === 'down' && variation < -SEUIL_SORTIE) direction = 'down'
  else direction = 'stable'

  const signe = variation >= 0 ? '+' : ''
  const explication =
    direction === 'stable'
      ? `Prix stables : ${signe}${variation.toFixed(1)} % entre la semaine dernière et les 3 derniers jours, sous le seuil de ${SEUIL_ENTREE} %.`
      : `Prix médians ${direction === 'up' ? 'en hausse' : 'en baisse'} de ${signe}${variation.toFixed(1)} % ` +
        `sur ${historyDays} jours de relevés (3 derniers jours contre la semaine précédente).`

  return { direction, variation, prixRecent, prixReference, historyDays, explication }
}
