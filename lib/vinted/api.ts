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

/**
 * Plafond de résultats par recherche, imposé par Vinted.
 *
 * Mesuré, pas supposé : la page 10 répond normalement, la page 11 répond
 * HTTP 400, et `total_entries` vaut 960 quelle que soit la recherche — y
 * compris sur « Sneakers », qui compte évidemment des centaines de milliers
 * d'annonces. `total_entries` n'est donc pas un compte, c'est le plafond
 * lui-même. Deux conséquences qu'on ne peut pas contourner :
 *
 *  - personne ne peut connaître la taille réelle d'une catégorie Vinted, nous
 *    pas plus qu'un autre. Ce que l'application appelle « annonces suivies »
 *    est son propre échantillon, et jamais la taille du marché ;
 *  - une recherche large ne peut pas être parcourue en entier. Pour voir
 *    au-delà des 960 premières, il faut découper par tranches de prix, chaque
 *    tranche ayant son propre plafond de 960.
 */
export const PLAFOND_RESULTATS = 960
export const PLAFOND_PAGES = 10

/**
 * Balayage complet d'une recherche.
 *
 * `collecter` s'arrête à un nombre d'annonces voulu ; ici on cherche l'inverse :
 * parcourir *tout* le catalogue actif de la catégorie, jusqu'à la vraie fin de
 * la pagination. C'est la seule façon d'obtenir deux choses qu'une seule page
 * ne donnera jamais :
 *
 *  - des médianes calculées sur le marché entier, et pas sur les 96 dernières
 *    mises en ligne, qui sont un échantillon biaisé vers la nouveauté ;
 *  - la disparition d'une annonce. Vinted ne signale pas une vente : l'annonce
 *    cesse simplement d'apparaître. Tant qu'on ne lit qu'une page, une annonce
 *    absente peut aussi bien avoir été vendue qu'avoir glissé en page 4. Après
 *    un balayage qui va au bout, l'absence veut dire quelque chose.
 *
 * L'ordre est `price_low_to_high` et non `newest_first`, et ce n'est pas un
 * détail. Avec le tri par date, chaque annonce publiée pendant le balayage
 * décale toutes les pages suivantes d'un cran : on relit des doublons et on
 * saute des annonces, systématiquement, dans le même sens. Le prix, lui, ne
 * bouge presque jamais — la pagination reste stable du début à la fin. Effet
 * de bord utile : si le plafond de pages coupe le balayage, ce qui a été lu
 * est la partie basse des prix, exactement celle qui intéresse un revendeur.
 */
export async function balayer(
  options: OptionsRecherche & { maxPages?: number; pauseMs?: number } = {},
): Promise<{
  items: AnnonceVinted[]
  totalEntries: number
  pagesLues: number
  /** Vrai si la pagination a été parcourue jusqu'à sa vraie fin. */
  complet: boolean
  /**
   * Vrai quand la recherche a buté sur le plafond des 960 résultats.
   *
   * C'est la distinction qui décide de tout le reste : un balayage `complet`
   * a vu la totalité de ce qui correspond à la recherche, donc une annonce
   * absente a bel et bien disparu. Un balayage `sature` a vu les 960 moins
   * chères et rien d'autre — l'absence n'y prouve rien, il faut redécouper.
   */
  sature: boolean
  /** Prix le plus élevé effectivement observé. Sert de borne de couverture. */
  prixMax: number | null
  /** Renseignée si le balayage s'est arrêté sur une erreur. */
  interrompuPar?: Error
}> {
  // Au-delà de dix pages Vinted répond 400 : demander plus ne ramène rien et
  // ajoute une erreur à traiter.
  const maxPages = Math.max(1, Math.min(PLAFOND_PAGES, options.maxPages ?? PLAFOND_PAGES))
  const pause = options.pauseMs ?? 700
  const SIMULTANEES = 2

  const vues = new Set<string>()
  const items: AnnonceVinted[] = []
  let totalEntries = 0
  let totalPages = maxPages
  let pagesLues = 0
  let prixMax: number | null = null
  let complet = false
  let interrompuPar: Error | undefined

  for (let debut = 1; debut <= maxPages; debut += SIMULTANEES) {
    if (debut > totalPages) {
      // On a dépassé la dernière page annoncée par Vinted : la pagination est
      // épuisée, donc le balayage est allé au bout.
      complet = true
      break
    }
    if (options.deadline && Date.now() > options.deadline) break

    const numeros: number[] = []
    for (let p = debut; p < debut + SIMULTANEES && p <= maxPages && p <= totalPages; p++) numeros.push(p)

    const resultats = await Promise.allSettled(
      numeros.map((p) =>
        chercherPage({ ...options, page: p, perPage: ANNONCES_PAR_PAGE, order: options.order ?? 'price_low_to_high' }),
      ),
    )

    let vide = false
    for (const resultat of resultats) {
      if (resultat.status === 'rejected') {
        const erreur = resultat.reason instanceof Error ? resultat.reason : new Error(String(resultat.reason))
        // Un blocage vaut pour tout le reste du balayage : insister aggrave le
        // filtrage sans rien ramener.
        if (erreur instanceof VintedBlockedError || erreur instanceof VintedAuthError) throw erreur
        interrompuPar ??= erreur
        continue
      }
      pagesLues += 1
      totalEntries = Math.max(totalEntries, resultat.value.totalEntries)
      if (resultat.value.totalPages > 0) totalPages = Math.min(resultat.value.totalPages, 500)
      if (resultat.value.items.length === 0) vide = true
      for (const annonce of resultat.value.items) {
        if (annonce.price > (prixMax ?? -1)) prixMax = annonce.price
        if (vues.has(annonce.id)) continue
        vues.add(annonce.id)
        items.push(annonce)
      }
    }

    // Une erreur au milieu d'un balayage laisse un trou : les annonces de la
    // page manquante seraient comptées absentes alors qu'elles sont bien là.
    // On préfère un balayage incomplet, qui ne conclura rien, à un balayage
    // troué qui conclurait faux.
    if (interrompuPar) break

    // Page renvoyée vide avant le plafond : Vinted n'a plus rien à donner.
    if (vide) {
      complet = true
      break
    }

    if (debut + SIMULTANEES > totalPages) {
      complet = true
      break
    }
    if (debut + SIMULTANEES > maxPages) break

    await attendre(pause)
  }

  // Saturée : dix pages pleines, c'est-à-dire le plafond de Vinted atteint. On
  // n'a alors vu que la tranche basse de ce que la recherche recouvre.
  const sature = items.length >= PLAFOND_RESULTATS - ANNONCES_PAR_PAGE && pagesLues >= PLAFOND_PAGES

  return { items, totalEntries, pagesLues, complet: complet && !sature, sature, prixMax, interrompuPar }
}

export interface Tranche {
  from: number
  to: number
}

export interface ZoneCouverte extends Tranche {
  /**
   * Vrai si tout ce que Vinted expose dans cette tranche a été lu. C'est la
   * seule condition sous laquelle l'absence d'une annonce veut dire quelque
   * chose.
   */
  exhaustive: boolean
  annonces: number
}

/**
 * Découpage de départ, en euros.
 *
 * Resserré là où se trouvent les annonces et large ensuite : sur Vinted, la
 * moitié du catalogue tient sous 15 €, et une tranche 0-50 € serait saturée
 * dès la première requête pendant qu'une tranche 200-300 € reviendrait presque
 * vide. Les tranches trop peuplées sont de toute façon redécoupées toutes
 * seules par `balayerParTranches`.
 */
export const TRANCHES_PAR_DEFAUT: Tranche[] = [
  { from: 0, to: 5 },
  { from: 5, to: 10 },
  { from: 10, to: 15 },
  { from: 15, to: 22 },
  { from: 22, to: 32 },
  { from: 32, to: 50 },
  { from: 50, to: 80 },
  { from: 80, to: 140 },
  { from: 140, to: 300 },
  { from: 300, to: 5000 },
]

/**
 * Nombre de pages lues au maximum par tranche.
 *
 * Sept pages sur les dix autorisées, et pas dix : le but n'est pas de vider une
 * tranche mais de répartir un budget fixe sur toute l'échelle des prix. Mesuré
 * sur « Sneakers » : en laissant le découpage s'enfoncer là où il y avait le
 * plus d'annonces, les soixante-dix pages du budget sont parties dans les
 * tranches 0-1 €, 1-2 € et 2-3 € — 3 707 annonces à moins de 3 €, et rien
 * au-dessus. Techniquement un succès, pratiquement inutile : on avait un
 * relevé très précis du fond de panier.
 */
const PAGES_PAR_TRANCHE = 7

/**
 * Parcourt une recherche tranche de prix par tranche de prix.
 *
 * C'est la seule façon de voir autre chose que les 960 annonces les moins
 * chères d'une catégorie. Chaque tranche a son propre plafond de 960, donc dix
 * tranches donnent dix fois plus de matière — mesuré : 3 707 annonces contre 96
 * auparavant, sur la même catégorie.
 *
 * Ce que ce balayage produit est un **échantillon stratifié**, pas un
 * inventaire, et la nuance est écrite ici parce qu'elle change ce qu'on a le
 * droit d'en dire. Vinted ne laisse pas connaître la taille réelle d'une
 * catégorie — `total_entries` vaut 960 partout, c'est le plafond et non un
 * compte. On ne peut donc pas prétendre à une médiane du marché entier. En
 * revanche, en lisant les mêmes tranches avec le même effort à chaque passage,
 * on obtient une médiane *stable* : deux relevés successifs sont comparables,
 * et c'est exactement ce qui manquait quand seules les 96 dernières mises en
 * ligne étaient lues.
 *
 * Une tranche qui rend moins que le plafond a, elle, été vue en entier : dans
 * cet intervalle de prix une annonce absente est réellement partie. Ça arrive
 * sur les catégories étroites, jamais sur les grandes — d'où la vérification
 * par échantillon dans `verification.ts`, qui ne dépend pas de cette condition.
 *
 * `depart` fait tourner le point d'entrée d'un balayage à l'autre. Sans lui, un
 * budget épuisé signifierait que les tranches hautes ne sont jamais lues : les
 * articles chers, c'est-à-dire ceux qui rapportent, seraient les seuls dont on
 * ne saurait rien.
 */
export async function balayerParTranches(
  options: OptionsRecherche & {
    tranches?: Tranche[]
    /** Plafond de pages pour l'ensemble du balayage. */
    budgetPages?: number
    /** Index de la tranche par laquelle commencer. */
    depart?: number
    pauseMs?: number
  } = {},
): Promise<{
  items: AnnonceVinted[]
  zones: ZoneCouverte[]
  pagesLues: number
  /** Index de la tranche à laquelle reprendre au prochain balayage. */
  prochainDepart: number
  interrompuPar?: Error
}> {
  const base = options.tranches ?? TRANCHES_PAR_DEFAUT
  const budgetPages = options.budgetPages ?? 70
  const depart = (((options.depart ?? 0) % base.length) + base.length) % base.length

  // On commence à `depart` et on fait le tour : chaque tranche est visitée une
  // fois par balayage, mais pas toujours dans le même ordre.
  const ordre = [...base.slice(depart), ...base.slice(0, depart)]

  const vues = new Set<string>()
  const items: AnnonceVinted[] = []
  const zones: ZoneCouverte[] = []
  let pagesLues = 0
  let traitees = 0
  let interrompuPar: Error | undefined

  for (const tranche of ordre) {
    if (pagesLues >= budgetPages) break
    if (options.deadline && Date.now() > options.deadline) break

    let resultat: Awaited<ReturnType<typeof balayer>>
    try {
      resultat = await balayer({
        ...options,
        priceFrom: tranche.from,
        priceTo: tranche.to,
        order: 'price_low_to_high',
        maxPages: Math.min(PAGES_PAR_TRANCHE, budgetPages - pagesLues),
        pauseMs: options.pauseMs,
      })
    } catch (erreur) {
      // Un blocage vaut pour toutes les tranches suivantes : insister pendant
      // qu'on est filtré ne fait qu'allonger le filtrage.
      if (erreur instanceof VintedBlockedError || erreur instanceof VintedAuthError) throw erreur
      interrompuPar ??= erreur instanceof Error ? erreur : new Error(String(erreur))
      break
    }

    pagesLues += resultat.pagesLues
    traitees += 1
    for (const annonce of resultat.items) {
      if (vues.has(annonce.id)) continue
      vues.add(annonce.id)
      items.push(annonce)
    }

    zones.push({
      from: tranche.from,
      to: tranche.to,
      // Vue en entier seulement si la tranche s'est épuisée d'elle-même, avant
      // le plafond de Vinted comme avant le nôtre.
      exhaustive: resultat.complet && !resultat.sature,
      annonces: resultat.items.length,
    })

    if (resultat.interrompuPar) {
      interrompuPar ??= resultat.interrompuPar
      break
    }
  }

  return {
    items,
    zones,
    pagesLues,
    prochainDepart: (depart + Math.max(1, traitees)) % base.length,
    interrompuPar,
  }
}

export { VintedAuthError, VintedBlockedError }
