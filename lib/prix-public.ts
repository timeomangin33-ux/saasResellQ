import { Prisma } from '@prisma/client'
import { prisma } from '@/prisma'

/**
 * Les prix publics, par marque.
 *
 * C'est la seule chose que ResellQ possède et que personne d'autre ne publie :
 * ce que les vendeurs demandent réellement, aujourd'hui, sur le Vinted
 * français. Le robot le mesure déjà pour l'application ; ces pages le rendent
 * consultable sans compte, parce qu'un chiffre utile et gratuit fait venir plus
 * de monde qu'une page de vente.
 *
 * Une précision qui doit apparaître partout où ces chiffres s'affichent : ce
 * sont des **prix demandés**, relevés sur des annonces en ligne, pas des prix
 * de vente conclus. Vinted ne publie pas ses transactions. Confondre les deux
 * ferait dire à ces pages quelque chose de faux.
 */

/** En dessous, une médiane ne veut rien dire et la page ne se génère pas. */
export const ANNONCES_MINIMUM = 25

/**
 * Fenêtre de fraîcheur des annonces retenues, en jours.
 *
 * Sans elle, la médiane d'une marque est celle de tout ce que le robot a
 * accumulé depuis qu'il tourne, et sa composition dépend de la façon dont il a
 * collecté — pas du marché. Le défaut a été constaté sur les catégories : un
 * passage lisant les annonces les moins chères d'abord avait fait tomber toutes
 * les médianes à 2 €, un chiffre parfaitement calculé sur un échantillon qui ne
 * représentait rien.
 *
 * En ne gardant que les annonces publiées récemment, on mesure un flux plutôt
 * qu'un stock : c'est bien défini, comparable d'une semaine à l'autre, et c'est
 * la question qu'un revendeur se pose — « à combien ça se demande en ce
 * moment », pas « à combien ça se demandait en moyenne depuis six mois ».
 */
export const FENETRE_FRAICHEUR_JOURS = 45

/** Filtre commun à tous les relevés publics : actif, prix réel, récent. */
const FRAICHEUR = Prisma.sql`
  status = 'active'
  AND price > 0
  AND ("listedAt" IS NULL OR "listedAt" >= NOW() - (${FENETRE_FRAICHEUR_JOURS} * INTERVAL '1 day'))
`

/**
 * Ce que Vinted range dans le champ « marque » sans que ce soit une marque.
 * Les laisser produirait des pages « Prix moyen des Sans marque sur Vinted »,
 * qui n'aident personne et abîment la crédibilité du reste.
 */
const PAS_DES_MARQUES = new Set([
  'sans marque',
  'inconnu',
  'accessoires',
  'accessories',
  'autre',
  'autres',
  'divers',
  'vintage dressing',
  'sante',
  'santé',
  'quartz',
  'no brand',
  'unbranded',
  // Vinted accepte du texte libre dans ce champ : on y trouve des styles et
  // des types d'objet, qui ne se comparent a rien.
  'fait main',
  'fait-main',
  'flechettes',
  'fléchettes',
  'japan style',
  'handmade',
  'vintage',
  'retro',
  'rétro',
])

export interface StatistiquesMarque {
  marque: string
  slug: string
  annonces: number
  prixMedian: number
  prixMoyen: number
  /** Premier et dernier décile : la fourchette dans laquelle se situe l'essentiel. */
  prixBas: number
  prixHaut: number
  /** Répartition par état, du neuf au satisfaisant. */
  parEtat: { etat: string; annonces: number; prixMedian: number }[]
  /** Les catégories où cette marque apparaît le plus. */
  parCategorie: { categorie: string; annonces: number; prixMedian: number }[]
  /** Part des annonces qui ont au moins un favori : le seul signal de demande publié. */
  partAvecFavori: number | null
  misAJourLe: Date | null
}

export function slugifier(valeur: string) {
  return valeur
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface LigneMarque {
  marque: string
  annonces: bigint
  prix_median: number | null
  prix_moyen: number | null
  prix_bas: number | null
  prix_haut: number | null
}

/**
 * Les marques qui méritent une page.
 *
 * Le regroupement se fait sur la marque en minuscules : Vinted écrit « adidas »
 * et « Adidas » selon l'annonce, et deux pages pour la même marque se
 * cannibaliseraient dans les résultats de recherche.
 */
export async function marquesPubliables(): Promise<StatistiquesMarque[]> {
  const lignes = await prisma.$queryRaw<LigneMarque[]>`
    SELECT
      MIN(brand) AS marque,
      COUNT(*) AS annonces,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS prix_median,
      AVG(price)::float8 AS prix_moyen,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY price)::float8 AS prix_bas,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY price)::float8 AS prix_haut
    FROM products
    WHERE ${FRAICHEUR} AND brand IS NOT NULL
    GROUP BY LOWER(brand)
    HAVING COUNT(*) >= ${ANNONCES_MINIMUM}
    ORDER BY COUNT(*) DESC
  `

  return lignes
    .filter((l) => l.marque && !PAS_DES_MARQUES.has(l.marque.toLowerCase().trim()))
    .map((l) => ({
      marque: l.marque,
      slug: slugifier(l.marque),
      annonces: Number(l.annonces),
      prixMedian: arrondi(l.prix_median),
      prixMoyen: arrondi(l.prix_moyen),
      prixBas: arrondi(l.prix_bas),
      prixHaut: arrondi(l.prix_haut),
      parEtat: [],
      parCategorie: [],
      partAvecFavori: null,
      misAJourLe: null,
    }))
}

const ETATS_LISIBLES: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Très bon état',
  good: 'Bon état',
  fair: 'Satisfaisant',
}

const ORDRE_ETATS = ['new', 'like_new', 'good', 'fair']

/** Le détail d'une marque, à partir de son slug. */
export async function statistiquesMarque(slug: string): Promise<StatistiquesMarque | null> {
  const toutes = await marquesPubliables()
  const base = toutes.find((m) => m.slug === slug)
  if (!base) return null

  const nom = base.marque

  const [etats, categories, demande, derniere] = await Promise.all([
    prisma.$queryRaw<{ condition: string; annonces: bigint; prix_median: number | null }[]>`
      SELECT condition,
             COUNT(*) AS annonces,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS prix_median
      FROM products
      WHERE ${FRAICHEUR} AND LOWER(brand) = LOWER(${nom})
      GROUP BY condition
    `,
    prisma.$queryRaw<{ category: string; annonces: bigint; prix_median: number | null }[]>`
      SELECT category,
             COUNT(*) AS annonces,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS prix_median
      FROM products
      WHERE ${FRAICHEUR} AND LOWER(brand) = LOWER(${nom})
      GROUP BY category
      ORDER BY COUNT(*) DESC
      LIMIT 6
    `,
    prisma.$queryRaw<{ avec_favori: bigint; total: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE "favouriteCount" > 0) AS avec_favori,
             COUNT(*) FILTER (WHERE "favouriteCount" IS NOT NULL) AS total
      FROM products
      WHERE ${FRAICHEUR} AND LOWER(brand) = LOWER(${nom})
    `,
    prisma.product.findFirst({
      where: { status: 'active', brand: { equals: nom, mode: 'insensitive' }, lastSeenAt: { not: null } },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenAt: true },
    }),
  ])

  const total = Number(demande[0]?.total ?? 0)
  const avecFavori = Number(demande[0]?.avec_favori ?? 0)

  return {
    ...base,
    parEtat: etats
      .map((e) => ({
        etat: ETATS_LISIBLES[e.condition] ?? e.condition,
        cle: e.condition,
        annonces: Number(e.annonces),
        prixMedian: arrondi(e.prix_median),
      }))
      .sort((a, b) => ORDRE_ETATS.indexOf(a.cle) - ORDRE_ETATS.indexOf(b.cle))
      .map(({ etat, annonces, prixMedian }) => ({ etat, annonces, prixMedian })),
    parCategorie: categories.map((c) => ({
      categorie: c.category,
      annonces: Number(c.annonces),
      prixMedian: arrondi(c.prix_median),
    })),
    // Sans aucune annonce dont on connaisse les favoris, on ne prétend pas
    // mesurer la demande : `null`, que la page affiche comme « pas encore
    // mesuré » et non comme 0 %.
    partAvecFavori: total > 0 ? Math.round((avecFavori / total) * 100) : null,
    misAJourLe: derniere?.lastSeenAt ?? null,
  }
}

function arrondi(valeur: number | null) {
  return valeur === null ? 0 : Math.round(valeur * 100) / 100
}

/** Le total affiché en haut des pages, pour situer l'échantillon. */
export async function ampleurDuReleve() {
  const [annonces, marches, derniere] = await Promise.all([
    // Le même filtre que les médianes : afficher « 230 000 annonces » en haut
    // d'une page dont les chiffres portent sur 90 000 ferait du total un
    // argument publicitaire plutôt qu'une indication de taille d'échantillon.
    prisma.product.count({
      where: {
        status: 'active',
        price: { gt: 0 },
        OR: [
          { listedAt: null },
          { listedAt: { gte: new Date(Date.now() - FENETRE_FRAICHEUR_JOURS * 86_400_000) } },
        ],
      },
    }),
    prisma.categoryMarket.count(),
    prisma.product.findFirst({
      where: { lastSeenAt: { not: null } },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenAt: true },
    }),
  ])
  return { annonces, categories: marches, misAJourLe: derniere?.lastSeenAt ?? null }
}
