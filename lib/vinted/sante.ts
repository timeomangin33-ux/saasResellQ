import { prisma } from '@/prisma'

/**
 * L'état de santé de la collecte.
 *
 * Pourquoi ce fichier existe : le collecteur s'est arrêté et personne ne l'a
 * su pendant cinq jours. Le site continuait d'afficher des prix, des médianes
 * et des « opportunités » avec le même aplomb que la veille — sauf qu'ils
 * décrivaient un marché vieux de cinq jours. Rien, nulle part, ne le disait.
 *
 * Une donnée périmée présentée comme fraîche est pire qu'une absence de
 * donnée : elle se prend pour vraie. Ce module donne à toute l'application un
 * seul endroit où demander « est-ce que ce que j'affiche est encore d'actualité ? ».
 */

/** En dessous, tout va bien : le collecteur tourne. */
const SEUIL_OK_MINUTES = 3 * 60

/** Entre les deux : la collecte a pris du retard sans être arrêtée. */
const SEUIL_RALENTIE_MINUTES = 12 * 60

export type StatutCollecte = 'ok' | 'ralentie' | 'arretee' | 'jamais-demarree'

export interface SanteCollecte {
  statut: StatutCollecte
  /** Âge de la donnée la plus récente, en minutes. `null` si rien n'a jamais été collecté. */
  ageMinutes: number | null
  derniereEcriture: Date | null
  annoncesActives: number
  categoriesSuivies: number
  ciblesEnEchec: { query: string; statut: string; erreur: string | null; echecs: number }[]
  /** Une phrase, en français, à afficher telle quelle. */
  message: string
}

export async function etatDeLaCollecte(): Promise<SanteCollecte> {
  const [derniere, annoncesActives, categoriesSuivies, enEchec] = await Promise.all([
    prisma.product.findFirst({
      where: { lastSeenAt: { not: null } },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenAt: true },
    }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.categoryMarket.count(),
    prisma.collectTarget.findMany({
      where: { enabled: true, consecutiveFailures: { gt: 0 } },
      orderBy: { consecutiveFailures: 'desc' },
      take: 10,
      select: { query: true, lastStatus: true, lastError: true, consecutiveFailures: true },
    }),
  ])

  const derniereEcriture = derniere?.lastSeenAt ?? null
  const ageMinutes = derniereEcriture ? Math.round((Date.now() - derniereEcriture.getTime()) / 60_000) : null

  const ciblesEnEchec = enEchec.map((c) => ({
    query: c.query,
    statut: c.lastStatus ?? 'inconnu',
    erreur: c.lastError,
    echecs: c.consecutiveFailures,
  }))

  if (ageMinutes === null) {
    return {
      statut: 'jamais-demarree',
      ageMinutes: null,
      derniereEcriture: null,
      annoncesActives,
      categoriesSuivies,
      ciblesEnEchec,
      message: "Aucune collecte n'a encore eu lieu. Lancez `npm run collector`.",
    }
  }

  const statut: StatutCollecte =
    ageMinutes <= SEUIL_OK_MINUTES ? 'ok' : ageMinutes <= SEUIL_RALENTIE_MINUTES ? 'ralentie' : 'arretee'

  return {
    statut,
    ageMinutes,
    derniereEcriture,
    annoncesActives,
    categoriesSuivies,
    ciblesEnEchec,
    message: phrase(statut, ageMinutes, ciblesEnEchec.length),
  }
}

export function formaterAge(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 48) return `${heures} h`
  return `${Math.round(heures / 24)} j`
}

function phrase(statut: StatutCollecte, ageMinutes: number, echecs: number) {
  const age = formaterAge(ageMinutes)
  const suffixe = echecs > 0 ? ` ${echecs} cible(s) en échec.` : ''

  switch (statut) {
    case 'ok':
      return `Données à jour, dernière collecte il y a ${age}.${suffixe}`
    case 'ralentie':
      return `La collecte a pris du retard : dernière écriture il y a ${age}.${suffixe}`
    default:
      return (
        `La collecte est arrêtée depuis ${age}. Les chiffres affichés décrivent le marché ` +
        `d'il y a ${age}, pas celui d'aujourd'hui.${suffixe}`
      )
  }
}
