/**
 * Le robot Vinted.
 *
 * Une seule fonction publique, `runVintedBotScan`, appelée par la route du
 * tableau de bord, par le cron et par le collecteur permanent. Elle essaie
 * l'API JSON, puis la page HTML si l'API est refusée, et ne rend jamais autre
 * chose que des annonces réellement lues sur Vinted.
 *
 * Ce que faisait l'ancienne version et qu'on a retiré volontairement : quand
 * la collecte échouait, elle renvoyait deux annonces inventées (« Nike Air
 * Force 1 blanc », 69 €) avec un HTTP 200. Ces lignes partaient en base, se
 * mélangeaient aux vraies, et faussaient les moyennes de catégorie. Une panne
 * doit se voir. Ici, un échec rend zéro annonce et dit pourquoi.
 */

import { collecter, VintedAuthError, VintedBlockedError, type AnnonceVinted } from './vinted/api'
import { collecterViaHtml } from './vinted/html'
import { etatSession } from './vinted/session'

export type { AnnonceVinted } from './vinted/api'

/** Conservé pour les appelants historiques : c'est le même objet. */
export type VintedBotItem = AnnonceVinted

export type SourceScan = 'api' | 'html' | 'failed'

export type CauseEchec = 'blocked' | 'auth' | 'network' | 'format' | 'timeout'

export interface VintedBotScanResult {
  success: boolean
  source: SourceScan
  query: string
  items: AnnonceVinted[]
  message: string
  /** Renseigné seulement quand `source` vaut `failed`. */
  failure?: { cause: CauseEchec; detail: string }
  /** Combien de temps la collecte a pris, pour le suivi d'exploitation. */
  durationMs: number
}

function classer(erreur: unknown): { cause: CauseEchec; detail: string } {
  if (erreur instanceof VintedBlockedError) {
    return { cause: 'blocked', detail: erreur.message }
  }
  if (erreur instanceof VintedAuthError) {
    return { cause: 'auth', detail: erreur.message }
  }
  const message = erreur instanceof Error ? erreur.message : String(erreur)
  if (/budget de temps/i.test(message)) return { cause: 'timeout', detail: message }
  if (/items|format|JSON/i.test(message)) return { cause: 'format', detail: message }
  return { cause: 'network', detail: message }
}

export interface OptionsScan {
  query?: string
  /** Nombre d'annonces visé. Vinted rend 96 par page ; viser un multiple évite une requête pour quelques annonces. */
  perPage?: number
  category?: string
  priceFrom?: number
  priceTo?: number
  /** Horodatage au-delà duquel on rend ce qui a été collecté plutôt que de dépasser. */
  deadline?: number
}

export async function runVintedBotScan(options: OptionsScan = {}): Promise<VintedBotScanResult> {
  const debut = Date.now()
  const recherche = (options.query || '').trim() || 'nike'
  const categorie = options.category || recherche
  const cible = Math.max(4, Math.min(2000, Number(options.perPage) || 96))

  const commun = {
    searchText: recherche,
    priceFrom: options.priceFrom,
    priceTo: options.priceTo,
    deadline: options.deadline,
    cible,
  }

  // 1. L'API. C'est le chemin normal : données complètes, vingt fois moins de
  //    volume transféré, et un format qui ne casse pas au premier changement
  //    de balisage.
  let echecApi: { cause: CauseEchec; detail: string } | null = null
  try {
    const { items } = await collecter(commun)
    if (items.length > 0) {
      return {
        success: true,
        source: 'api',
        query: recherche,
        items: items.map((a) => ({ ...a, category: categorie })),
        message: `${items.length} annonce${items.length > 1 ? 's' : ''} lue${items.length > 1 ? 's' : ''} sur Vinted pour « ${recherche} ».`,
        durationMs: Date.now() - debut,
      }
    }
    echecApi = { cause: 'format', detail: "L'API Vinted a répondu, mais sans aucune annonce exploitable." }
  } catch (erreur) {
    echecApi = classer(erreur)
  }

  // 2. La page HTML publique. Elle survit parfois quand l'API refuse la
  //    session — ce n'est pas la même protection en face.
  try {
    const items = await collecterViaHtml(recherche, cible, options.deadline)
    if (items.length > 0) {
      return {
        success: true,
        source: 'html',
        query: recherche,
        items: items.map((a) => ({ ...a, category: categorie })),
        message:
          `${items.length} annonce${items.length > 1 ? 's' : ''} lue${items.length > 1 ? 's' : ''} sur la page publique. ` +
          `L'API est indisponible (${echecApi.detail}) : le vendeur, les favoris et la date de mise en ligne manquent.`,
        durationMs: Date.now() - debut,
      }
    }
  } catch {
    // On garde la cause de l'API : c'est elle qui explique le mieux la panne.
  }

  const session = etatSession()
  return {
    success: false,
    source: 'failed',
    query: recherche,
    items: [],
    message:
      `Aucune annonce n'a pu être lue sur Vinted pour « ${recherche} ». ${echecApi.detail}` +
      (session.ouverte ? '' : ' Aucune session Vinted n\'est ouverte.'),
    failure: echecApi,
    durationMs: Date.now() - debut,
  }
}

/** Diagnostic : est-ce que le robot peut lire Vinted, là, maintenant ? */
export async function diagnostiquerRobot() {
  const scan = await runVintedBotScan({ query: 'nike', perPage: 12 })
  return {
    ok: scan.success,
    source: scan.source,
    annonces: scan.items.length,
    dureeMs: scan.durationMs,
    message: scan.message,
    failure: scan.failure ?? null,
    session: etatSession(),
    // Un échantillon complet vaut mieux qu'un compteur : il montre du premier
    // coup d'œil si un champ est revenu vide après un changement chez Vinted.
    echantillon: scan.items[0] ?? null,
  }
}
