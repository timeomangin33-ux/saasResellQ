/**
 * Client de l'API catalogue de Vinted.
 *
 * Le robot lisait jusqu'ici le HTML de la page catalogue avec des expressions
 * régulières sur `data-testid` et sur le texte de l'attribut `alt`. Trois
 * problèmes, tous vérifiés sur le site :
 *
 *  1. Le moindre changement de balisage rend zéro annonce. Aucune alerte : la
 *     fonction basculait sur un jeu d'annonces inventées et renvoyait 200.
 *  2. L'attribut `alt` ne contient que titre, marque, état, taille et prix.
 *     Le vendeur, le nombre de favoris, les vues, le prix protection acheteurs
 *     incluse et la date de mise en ligne étaient perdus — or ce sont
 *     exactement les signaux qui font la valeur d'un outil de revente.
 *  3. Une page HTML de catalogue pèse 7 Mo pour 96 annonces. La même page en
 *     JSON en fait environ 300 Ko : vingt fois moins de données transférées.
 *
 * L'API renvoie les mêmes annonces, structurées et complètes. Elle exige une
 * session (voir session.ts) ; c'est le seul coût.
 */

import {
  BASE_VINTED,
  VintedAuthError,
  VintedBlockedError,
  absorberCookies,
  assurerSession,
  entetesAvecSession,
  invaliderSession,
} from './session'

/** Une annonce, telle qu'on la manipule dans toute l'application. */
export interface AnnonceVinted {
  id: string
  title: string
  price: number
  /** Prix payé par l'acheteur, protection incluse. C'est le vrai coût d'achat. */
  totalPrice: number
  serviceFee: number
  currency: string
  brand: string
  size: string
  /** État en clair, tel que Vinted l'affiche : « Très bon état », « Neuf »... */
  condition: string
  category: string
  image: string
  url: string
  description: string
  sellerId: string | null
  sellerLogin: string | null
  favouriteCount: number
  viewCount: number
  /** Date de mise en ligne, déduite de l'horodatage de la photo principale. */
  listedAt: Date | null
  promoted: boolean
}

interface ReponseCatalogue {
  items?: unknown[]
  pagination?: { current_page?: number; total_pages?: number; total_entries?: number; per_page?: number }
  code?: number
  message?: string
  message_code?: string
}

/** Vinted plafonne à 96 annonces par page, quoi qu'on demande. Vérifié. */
export const ANNONCES_PAR_PAGE = 96

function nombre(valeur: unknown): number {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : 0
  if (typeof valeur === 'string') {
    const n = Number(valeur.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function montant(valeur: unknown): { montant: number; devise: string } {
  if (valeur && typeof valeur === 'object') {
    const o = valeur as { amount?: unknown; currency_code?: unknown }
    return { montant: nombre(o.amount), devise: typeof o.currency_code === 'string' ? o.currency_code : 'EUR' }
  }
  return { montant: nombre(valeur), devise: 'EUR' }
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : ''
}

/** Convertit une annonce brute de l'API en annonce applicative. */
export function normaliserAnnonce(brut: unknown, categorie: string): AnnonceVinted | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>

  const id = o.id === undefined || o.id === null ? '' : String(o.id)
  const titre = texte(o.title)
  // Une annonce sans identifiant ou sans titre n'est pas exploitable : mieux
  // vaut la laisser tomber que d'écrire une ligne vide en base.
  if (!id || !titre) return null

  const prix = montant(o.price)
  const total = montant(o.total_item_price)
  const frais = montant(o.service_fee)

  const photo = (o.photo ?? null) as Record<string, unknown> | null
  const haute = (photo?.high_resolution ?? null) as Record<string, unknown> | null
  const horodatage = nombre(haute?.timestamp)

  const vendeur = (o.user ?? null) as Record<string, unknown> | null

  const chemin = texte(o.path)
  const url = texte(o.url) || (chemin ? `${BASE_VINTED}${chemin}` : `${BASE_VINTED}/items/${id}`)

  const etat = texte(o.status)
  const taille = texte(o.size_title)

  return {
    id,
    title: titre,
    price: prix.montant,
    // Si Vinted ne renvoie pas le total, le prix nu reste plus honnête que zéro.
    totalPrice: total.montant || prix.montant,
    serviceFee: frais.montant,
    currency: prix.devise,
    brand: texte(o.brand_title) || 'Sans marque',
    size: taille,
    condition: etat,
    category: categorie,
    // Pas d'image de remplacement : une photo de banque d'images à côté d'une
    // vraie annonce donnerait à croire que c'est l'article. Vide veut dire
    // « pas de photo », et l'interface affiche alors un cadre neutre.
    image: texte(photo?.url),
    url,
    description: [etat, taille ? `Taille ${taille}` : ''].filter(Boolean).join(' • '),
    sellerId: vendeur?.id === undefined || vendeur?.id === null ? null : String(vendeur.id),
    sellerLogin: texte(vendeur?.login) || null,
    favouriteCount: nombre(o.favourite_count),
    viewCount: nombre(o.view_count),
    listedAt: horodatage > 0 ? new Date(horodatage * 1000) : null,
    promoted: o.promoted === true,
  }
}

export interface OptionsRecherche {
  /** Texte cherché. Vide = tout le catalogue (utile avec catalogIds). */
  searchText?: string
  /** Identifiants de catégories Vinted, si on cible une branche précise. */
  catalogIds?: string[]
  page?: number
  perPage?: number
  priceFrom?: number
  priceTo?: number
  order?: 'relevance' | 'price_high_to_low' | 'price_low_to_high' | 'newest_first'
  /** Horodatage limite : au-delà, on rend la main sans lancer de requête. */
  deadline?: number
  signal?: AbortSignal
}

export interface PageCatalogue {
  items: AnnonceVinted[]
  page: number
  totalPages: number
  totalEntries: number
}

function construireUrl(options: OptionsRecherche) {
  const params = new URLSearchParams()
  if (options.searchText) params.set('search_text', options.searchText)
  if (options.catalogIds?.length) params.set('catalog_ids', options.catalogIds.join(','))
  params.set('page', String(Math.max(1, options.page ?? 1)))
  params.set('per_page', String(Math.min(ANNONCES_PAR_PAGE, Math.max(1, options.perPage ?? ANNONCES_PAR_PAGE))))
  params.set('order', options.order ?? 'newest_first')
  if (options.priceFrom !== undefined) params.set('price_from', String(options.priceFrom))
  if (options.priceTo !== undefined) params.set('price_to', String(options.priceTo))
  return `${BASE_VINTED}/api/v2/catalog/items?${params.toString()}`
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Une page de catalogue.
 *
 * La reprise est délibérément différenciée selon la cause :
 *  - 401 : la session a expiré. On en rouvre une et on rejoue, une seule fois.
 *    Rejouer davantage ne servirait qu'à collectionner des 401.
 *  - 429 / 403 : Vinted freine ou bloque. On patiente en doublant l'attente,
 *    puis on abandonne en le disant — un blocage n'est pas une panne passagère
 *    et le masquer ferait croire à des chiffres qui n'existent pas.
 *  - réseau : trois tentatives, puis on remonte l'erreur.
 */
export async function chercherPage(options: OptionsRecherche = {}): Promise<PageCatalogue> {
  const url = construireUrl(options)
  const MAX_TENTATIVES = 3
  let sessionRejouee = false
  let dernierEchec: Error | null = null

  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    if (options.deadline && Date.now() > options.deadline) {
      throw new Error("Budget de temps épuisé avant l'appel à Vinted")
    }

    await assurerSession()

    let reponse: Response
    try {
      reponse = await fetch(url, { headers: entetesAvecSession(), signal: options.signal })
    } catch (err) {
      dernierEchec = err instanceof Error ? err : new Error(String(err))
      await attendre(500 * 2 ** tentative)
      continue
    }

    absorberCookies(reponse)

    if (reponse.status === 401) {
      if (sessionRejouee) {
        throw new VintedAuthError(
          "Vinted refuse la session même après renouvellement. Le compte ou le cookie configuré n'est plus valable.",
        )
      }
      sessionRejouee = true
      invaliderSession()
      await assurerSession(true)
      continue
    }

    if (reponse.status === 429 || reponse.status === 403) {
      // Une dernière tentative après une pause franche : un pic de trafic se
      // résorbe, un vrai blocage non.
      if (tentative < MAX_TENTATIVES - 1) {
        await attendre(2000 * 2 ** tentative)
        continue
      }
      throw new VintedBlockedError(
        reponse.status,
        reponse.status === 429
          ? 'Vinted limite le débit (HTTP 429). Espacez les passages du robot ou répartissez-les sur plusieurs adresses IP.'
          : 'Vinted bloque les requêtes (HTTP 403, DataDome). Un cookie de navigateur connecté dans VINTED_SESSION_COOKIE lève généralement le blocage.',
      )
    }

    if (!reponse.ok) {
      dernierEchec = new Error(`Vinted a répondu HTTP ${reponse.status}`)
      await attendre(500 * 2 ** tentative)
      continue
    }

    let donnees: ReponseCatalogue
    try {
      donnees = (await reponse.json()) as ReponseCatalogue
    } catch {
      // Une réponse 200 qui n'est pas du JSON, c'est la page de défi DataDome.
      throw new VintedBlockedError(200, "Vinted a renvoyé une page de vérification au lieu du catalogue.")
    }

    if (!Array.isArray(donnees.items)) {
      throw new Error(
        `Réponse inattendue de Vinted (${donnees.message_code ?? 'format inconnu'}) : le champ « items » est absent.`,
      )
    }

    const categorie = options.searchText ?? ''
    const items = donnees.items
      .map((brut) => normaliserAnnonce(brut, categorie))
      .filter((a): a is AnnonceVinted => a !== null)

    return {
      items,
      page: donnees.pagination?.current_page ?? options.page ?? 1,
      totalPages: donnees.pagination?.total_pages ?? 1,
      totalEntries: donnees.pagination?.total_entries ?? items.length,
    }
  }

  throw dernierEchec ?? new Error('Vinted injoignable après plusieurs tentatives')
}

/**
 * Collecte `cible` annonces en paginant.
 *
 * Les pages partent en petits paquets plutôt qu'une à une : c'est ce qu'un
 * navigateur fait pour afficher la même page, et cela divise le temps par le
 * nombre de requêtes simultanées. Deux à la fois est un compromis assumé —
 * au-delà, Vinted commence à répondre 429.
 */
export async function collecter(
  options: OptionsRecherche & { cible?: number } = {},
): Promise<{ items: AnnonceVinted[]; totalEntries: number; pagesLues: number }> {
  const cible = Math.max(1, Math.min(2000, options.cible ?? ANNONCES_PAR_PAGE))
  const pagesNecessaires = Math.ceil(cible / ANNONCES_PAR_PAGE)
  const SIMULTANEES = 2

  const vues = new Set<string>()
  const items: AnnonceVinted[] = []
  let totalEntries = 0
  let pagesLues = 0
  let premiereErreur: Error | null = null

  for (let debut = 1; debut <= pagesNecessaires; debut += SIMULTANEES) {
    if (items.length >= cible) break
    if (options.deadline && Date.now() > options.deadline) break

    const lot = []
    for (let p = debut; p < debut + SIMULTANEES && p <= pagesNecessaires; p++) {
      lot.push(chercherPage({ ...options, page: p, perPage: ANNONCES_PAR_PAGE }))
    }

    const resultats = await Promise.allSettled(lot)
    for (const resultat of resultats) {
      if (resultat.status === 'rejected') {
        const erreur = resultat.reason instanceof Error ? resultat.reason : new Error(String(resultat.reason))
        // Un blocage vaut pour toutes les pages suivantes : inutile d'insister.
        if (erreur instanceof VintedBlockedError || erreur instanceof VintedAuthError) throw erreur
        premiereErreur ??= erreur
        continue
      }
      pagesLues += 1
      totalEntries = Math.max(totalEntries, resultat.value.totalEntries)
      for (const annonce of resultat.value.items) {
        // Les pages se recouvrent légèrement quand de nouvelles annonces
        // arrivent pendant la collecte : on dédoublonne sur l'identifiant.
        if (vues.has(annonce.id)) continue
        vues.add(annonce.id)
        items.push(annonce)
      }
    }

    if (items.length >= cible) break
    // Un souffle entre deux paquets : c'est ce qui distingue un lecteur d'un
    // marteau, du point de vue du filtre anti-robot.
    await attendre(400)
  }

  if (items.length === 0 && premiereErreur) throw premiereErreur

  return { items: items.slice(0, cible), totalEntries, pagesLues }
}

export { VintedAuthError, VintedBlockedError }
