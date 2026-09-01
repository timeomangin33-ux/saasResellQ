import { prisma } from '@/prisma'
import type { AnnonceVinted } from '@/lib/vinted/api'
import { noterCategorie } from '@/lib/vinted/scoring-marche'

/**
 * Vinted affiche l'état en clair. On le range dans le vocabulaire interne
 * (`new`, `like_new`, `good`, `fair`), qui est ce que le reste de
 * l'application interroge. La normalisation se fait sans accents ni casse :
 * selon la page, Vinted écrit « Très bon état » ou « Tres bon etat ».
 */
const ETATS: Record<string, string> = {
  'neuf avec etiquette': 'new',
  'neuf sans etiquette': 'new',
  neuf: 'new',
  'tres bon etat': 'like_new',
  'bon etat': 'good',
  satisfaisant: 'fair',
}

function sansAccents(valeur: string) {
  return valeur.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function normaliserEtat(brut: string) {
  return ETATS[sansAccents(brut)] ?? 'good'
}

function variation(nouveau: number, ancien: number | null | undefined) {
  if (ancien === null || ancien === undefined || ancien === 0) return null
  return ((nouveau - ancien) / ancien) * 100
}

/**
 * Une annonce non revue depuis ce délai sort des agrégats.
 *
 * Une annonce vendue ou retirée disparaît simplement des résultats Vinted :
 * rien ne vient nous le dire. Sans péremption, la table accumule des fantômes
 * et les médianes finissent par décrire un marché qui n'existe plus.
 */
export const JOURS_AVANT_PEREMPTION = 7

export interface BilanPersistance {
  annoncesEcrites: number
  perimees: number
  volumeActif: number
  prixMoyen: number | null
  prixMedian: number | null
  /** Annonces dont la note d'opportunité a été recalculée sur ce passage. */
  notees: number
}

/**
 * Écrit les annonces lues et rafraîchit les agrégats de la catégorie.
 *
 * Ce que le robot ne fait plus : écrire des annonces qu'il n'a pas lues. La
 * fonction n'est appelée qu'avec des annonces réelles, et les colonnes sans
 * valeur restent nulles plutôt que de recevoir un chiffre plausible mais
 * inventé.
 */
export async function persistVintedScanResults(
  items: AnnonceVinted[],
  category: string,
): Promise<BilanPersistance> {
  const maintenant = new Date()

  if (items.length === 0) {
    return { annoncesEcrites: 0, perimees: 0, volumeActif: 0, prixMoyen: null, prixMedian: null, notees: 0 }
  }

  // Cent upserts à la file, c'est cent allers-retours vers Neon, soit une
  // dizaine de secondes par catégorie — assez pour que le cron se fasse couper
  // avant d'avoir tout traité. Par lots parallèles, on tombe sous la seconde,
  // sans saturer le pool de connexions.
  const TAILLE_LOT = 25
  let ecrites = 0

  for (let i = 0; i < items.length; i += TAILLE_LOT) {
    const lot = items.slice(i, i + TAILLE_LOT)
    const resultats = await Promise.allSettled(
      lot.map((item) => {
        const commun = {
          title: item.title,
          description: item.description || null,
          price: item.price,
          totalPrice: item.totalPrice || null,
          currency: item.currency || 'EUR',
          category,
          brand: item.brand || null,
          size: item.size || null,
          condition: normaliserEtat(item.condition),
          seller: item.sellerLogin,
          imageUrl: item.image || null,
          url: item.url,
          favouriteCount: item.favouriteCount,
          viewCount: item.viewCount,
          listedAt: item.listedAt,
          lastSeenAt: maintenant,
          status: 'active',
        }
        return prisma.product.upsert({
          where: { vintedId: item.id },
          update: { ...commun, updatedAt: maintenant },
          create: { vintedId: item.id, ...commun },
        })
      }),
    )

    for (const r of resultats) {
      if (r.status === 'fulfilled') ecrites += 1
      else console.error('market-sync: annonce non écrite', r.reason)
    }
  }

  // Le délai est large exprès : les catégories passent à tour de rôle et pas
  // forcément toutes les heures.
  const limite = new Date(Date.now() - JOURS_AVANT_PEREMPTION * 86_400_000)
  const { count: perimees } = await prisma.product.updateMany({
    where: {
      category,
      status: 'active',
      OR: [{ lastSeenAt: { lt: limite } }, { lastSeenAt: null, updatedAt: { lt: limite } }],
    },
    data: { status: 'stale' },
  })

  // Moyenne et médiane calculées par Postgres plutôt qu'en rapatriant toutes
  // les lignes : un aller-retour au lieu d'un transfert qui grossit chaque
  // jour. percentile_cont donne la vraie médiane, y compris sur un nombre pair
  // de valeurs.
  const [agregat] = await prisma.$queryRaw<
    { avg_price: number | null; median_price: number | null; volume: bigint }[]
  >`
    SELECT AVG(price)::float8 AS avg_price,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS median_price,
           COUNT(*) AS volume
    FROM "products"
    WHERE category = ${category} AND status = 'active'
  `

  const volumeActif = Number(agregat?.volume ?? 0)
  const prixMoyen = agregat?.avg_price ?? null
  const prixMedian = agregat?.median_price ?? null

  if (volumeActif > 0 && prixMoyen !== null && prixMedian !== null) {
    const precedent = await prisma.categoryMarket.findUnique({ where: { category } })
    const priceChangePercent = variation(prixMoyen, precedent?.avgPrice)
    const volumeChangePercent = variation(volumeActif, precedent?.volumeActive)
    const trendDirection =
      priceChangePercent === null
        ? 'stable'
        : priceChangePercent > 2
          ? 'up'
          : priceChangePercent < -2
            ? 'down'
            : 'stable'

    const instantane = {
      avgPrice: prixMoyen,
      medianPrice: prixMedian,
      volumeActive: volumeActif,
      trendDirection,
      priceChangePercent,
      volumeChangePercent,
      lastAnalyzedAt: maintenant,
    }

    await prisma.categoryMarket.upsert({
      where: { category },
      update: instantane,
      create: { category, ...instantane },
    })

    // Et un point figé pour la journée, qui lui n'est jamais écrasé : c'est ce
    // qui rend les courbes dans le temps possibles. Le jour sert de clé, donc
    // plusieurs passages le même jour affinent le point au lieu d'en créer un
    // second.
    const jour = new Date()
    jour.setUTCHours(0, 0, 0, 0)
    const pointDuJour = {
      avgPrice: prixMoyen,
      medianPrice: prixMedian,
      volumeActive: volumeActif,
      sampleSize: volumeActif,
    }
    await prisma.categoryMarketDaily.upsert({
      where: { category_day: { category, day: jour } },
      update: pointDuJour,
      create: { category, day: jour, ...pointDuJour },
    })
  }

  // La note d'opportunité se recalcule ici, une fois la médiane de la catégorie
  // connue : c'est elle qui sert de référence de revente. Le faire à chaque
  // passage, plutôt qu'une fois à l'écriture, garantit que la note d'une
  // annonce suit le marché — une bonne affaire d'hier ne l'est plus quand toute
  // la catégorie a baissé.
  let notees = 0
  try {
    const bilan = await noterCategorie(category, prixMedian, volumeActif)
    notees = bilan.notes
  } catch (err) {
    // Une notation ratée ne doit pas perdre la collecte : les annonces sont
    // déjà écrites, et la note sera recalculée au passage suivant.
    console.error(`market-sync: notation impossible pour ${category}`, err)
  }

  return { annoncesEcrites: ecrites, perimees, volumeActif, prixMoyen, prixMedian, notees }
}
