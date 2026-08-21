import { prisma } from '@/prisma'
import type { VintedBotItem } from '@/lib/vinted-bot'

const CONDITION_MAP: Record<string, string> = {
  'très bon état': 'like_new',
  'bon état': 'good',
  'satisfaisant': 'fair',
  'neuf avec étiquette': 'new',
  'neuf sans étiquette': 'new',
}

function normalizeCondition(rawState: string) {
  const key = rawState.toLowerCase().trim()
  return CONDITION_MAP[key] ?? 'good'
}

function pctChange(next: number, prev: number | null | undefined) {
  if (prev === null || prev === undefined || prev === 0) return null
  return ((next - prev) / prev) * 100
}

/**
 * Persists live-scraped Vinted items into the Product table and refreshes
 * the CategoryMarket aggregate for that category, so the rest of the app
 * (top-products, top-categories, opportunities...) reflects real scan data.
 */
/** Une annonce non revue depuis ce délai sort des agrégats. */
export const JOURS_AVANT_PEREMPTION = 7

export async function persistVintedScanResults(items: VintedBotItem[], category: string) {
  if (items.length === 0) return { productsWritten: 0 }

  // Cent upserts à la file, c'est cent allers-retours réseau vers Neon, soit
  // une dizaine de secondes par catégorie — assez pour que le cron se fasse
  // couper avant d'avoir tout traité. Par lots parallèles, on tombe à moins
  // d'une seconde, sans saturer le pool de connexions.
  const TAILLE_LOT = 25
  for (let i = 0; i < items.length; i += TAILLE_LOT) {
    await Promise.all(items.slice(i, i + TAILLE_LOT).map((item) => {
    const [state] = item.description.split(' • ')
    return prisma.product.upsert({
      where: { vintedId: item.id },
      update: {
        title: item.title,
        price: item.price,
        category,
        brand: item.brand,
        condition: normalizeCondition(state || ''),
        imageUrl: item.image,
        url: item.url,
        status: 'active',
        updatedAt: new Date(),
      },
      create: {
        vintedId: item.id,
        title: item.title,
        price: item.price,
        category,
        brand: item.brand,
        condition: normalizeCondition(state || ''),
        imageUrl: item.image,
        url: item.url,
        status: 'active',
      },
    })
    }))
  }

  // Une annonce vendue ou retirée disparaît simplement des résultats Vinted :
  // rien ne vient nous le dire. Sans péremption, la table accumule des
  // fantômes et les médianes finissent par décrire un marché qui n'existe
  // plus. Tout ce que le robot n'a pas revu depuis une semaine sort donc des
  // agrégats — le délai est large exprès, les catégories passant à tour de
  // rôle et pas forcément tous les jours.
  const perimee = new Date(Date.now() - JOURS_AVANT_PEREMPTION * 86_400_000)
  const { count: perimees } = await prisma.product.updateMany({
    where: { category, status: 'active', updatedAt: { lt: perimee } },
    data: { status: 'stale' },
  })

  // Moyenne et médiane calculées par Postgres plutôt qu'en rapatriant toutes
  // les lignes : un aller-retour au lieu d'un transfert qui grossit chaque
  // jour. percentile_cont donne la vraie médiane, y compris sur un nombre
  // pair de valeurs.
  const [agregat] = await prisma.$queryRaw<
    { avg_price: number | null; median_price: number | null; volume: bigint }[]
  >`
    SELECT AVG(price)::float8 AS avg_price,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS median_price,
           COUNT(*) AS volume
    FROM "products"
    WHERE category = ${category} AND status = 'active'
  `

  const volumeActive = Number(agregat?.volume ?? 0)

  if (volumeActive > 0 && agregat?.avg_price !== null && agregat?.median_price !== null) {
    const avgPrice = agregat.avg_price as number
    const medianPrice = agregat.median_price as number

    const previous = await prisma.categoryMarket.findUnique({ where: { category } })
    const priceChangePercent = pctChange(avgPrice, previous?.avgPrice)
    const volumeChangePercent = pctChange(volumeActive, previous?.volumeActive)
    const trendDirection = priceChangePercent === null ? 'stable' : priceChangePercent > 2 ? 'up' : priceChangePercent < -2 ? 'down' : 'stable'

    await prisma.categoryMarket.upsert({
      where: { category },
      update: {
        avgPrice,
        medianPrice,
        volumeActive,
        trendDirection,
        priceChangePercent,
        volumeChangePercent,
        lastAnalyzedAt: new Date(),
      },
      create: {
        category,
        avgPrice,
        medianPrice,
        volumeActive,
        trendDirection,
        priceChangePercent,
        volumeChangePercent,
        lastAnalyzedAt: new Date(),
      },
    })

    // Et un point figé pour la journée, qui lui n'est jamais écrasé : c'est
    // ce qui rend les courbes dans le temps possibles. Le jour sert de clé,
    // donc plusieurs passages le même jour affinent le point au lieu d'en
    // créer un deuxième.
    const jour = new Date()
    jour.setUTCHours(0, 0, 0, 0)
    const pointDuJour = {
      avgPrice,
      medianPrice,
      volumeActive,
      sampleSize: volumeActive,
    }
    await prisma.categoryMarketDaily.upsert({
      where: { category_day: { category, day: jour } },
      update: pointDuJour,
      create: { category, day: jour, ...pointDuJour },
    })
  }

  return { productsWritten: items.length, perimees }
}
