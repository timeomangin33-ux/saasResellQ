import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import type { Product } from '@prisma/client'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * Recherche d'annonces.
 *
 * Cette route renvoyait `searchVintedItems()`, c'est-à-dire vingt articles
 * écrits en dur dans `vinted.ts` — « Nike Air Jordan 1 Retro », « Ceinture
 * Gucci Web »… — avec des photos de banque d'images. Et quand la recherche ne
 * correspondait à rien, elle renommait ces mêmes articles avec le texte tapé
 * par l'utilisateur : chercher « bottes fille 32 » rendait « bottes fille 32
 * Vintage », au prix d'un Jordan. Une fonctionnalité payante répondait donc à
 * côté, toujours, sans jamais le dire.
 *
 * Elle lit maintenant deux sources réelles, dans cet ordre :
 *  1. les annonces déjà collectées en base — instantané, sans toucher Vinted ;
 *  2. Vinted en direct si la base n'a pas de quoi répondre. Ce qui revient est
 *     écrit en base au passage : chaque recherche enrichit le corpus commun.
 */

const MINIMUM_ACCEPTABLE = 12

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const query = (url.searchParams.get('query') ?? '').trim()
  const category = url.searchParams.get('category')?.trim() || undefined
  const limite = Math.min(96, Math.max(1, Number(url.searchParams.get('limit')) || 24))

  if (!query) {
    return NextResponse.json({ error: 'Le paramètre « query » est obligatoire.' }, { status: 400 })
  }

  // 1. Ce qu'on a déjà. Les mots sont cherchés séparément : « nike air force »
  //    doit trouver « Air Force 1 Nike », que la recherche mot-à-mot manquerait.
  const mots = query.split(/\s+/).filter((m) => m.length > 1).slice(0, 6)
  const enBase = await prisma.product.findMany({
    where: {
      status: 'active',
      ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
      AND: mots.map((mot) => ({
        OR: [
          { title: { contains: mot, mode: 'insensitive' as const } },
          { brand: { contains: mot, mode: 'insensitive' as const } },
        ],
      })),
    },
    orderBy: [{ analysisScore: 'desc' }, { lastSeenAt: 'desc' }],
    take: limite,
  })

  if (enBase.length >= MINIMUM_ACCEPTABLE) {
    return NextResponse.json({
      results: enBase.map(formater),
      source: 'db',
      count: enBase.length,
      message: `${enBase.length} annonce${enBase.length > 1 ? 's' : ''} déjà collectée${enBase.length > 1 ? 's' : ''}.`,
    })
  }

  // 2. Pas assez en base : on va lire Vinted. Le résultat est persisté, donc la
  //    même recherche répondra depuis la base la prochaine fois.
  const scan = await runVintedBotScan({ query, category: category || query, perPage: 96 })

  if (!scan.success) {
    // S'il reste quelques lignes en base, mieux vaut les rendre en le disant
    // que de rendre une erreur sèche sur des données qu'on possède.
    if (enBase.length > 0) {
      return NextResponse.json({
        results: enBase.map(formater),
        source: 'db',
        count: enBase.length,
        degraded: true,
        message: `Vinted est injoignable (${scan.failure?.detail ?? scan.message}). Seules les annonces déjà collectées sont affichées.`,
      })
    }
    return NextResponse.json(
      {
        results: [],
        source: 'failed',
        count: 0,
        error: scan.message,
        cause: scan.failure?.cause ?? 'network',
      },
      { status: 502 },
    )
  }

  await persistVintedScanResults(scan.items, category || query).catch((err) =>
    console.error('vinted/search: écriture des annonces impossible', err),
  )

  const vus = new Set(enBase.map((p) => p.vintedId))
  const combines = [
    ...enBase.map(formater),
    ...scan.items.filter((i) => !vus.has(i.id)).map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      totalPrice: item.totalPrice,
      brand: item.brand,
      size: item.size,
      condition: item.condition,
      category: category || query,
      image: item.image,
      url: item.url,
      seller: item.sellerLogin,
      favouriteCount: item.favouriteCount,
      listedAt: item.listedAt?.toISOString() ?? null,
      analysisScore: null as number | null,
      profitMargin: null as number | null,
    })),
  ].slice(0, limite)

  return NextResponse.json({
    results: combines,
    source: enBase.length > 0 ? 'db+live' : 'live',
    count: combines.length,
    message: `${combines.length} annonce${combines.length > 1 ? 's' : ''} lue${combines.length > 1 ? 's' : ''} sur Vinted pour « ${query} ».`,
  })
}

/** Une ligne de la table `products` telle que l'API la rend au client. */
function formater(p: Product) {
  return {
    id: p.vintedId,
    title: p.title,
    price: p.price,
    totalPrice: p.totalPrice ?? p.price,
    brand: p.brand ?? 'Sans marque',
    size: p.size ?? '',
    condition: p.condition,
    category: p.category,
    image: p.imageUrl ?? '',
    url: p.url ?? `https://www.vinted.fr/items/${p.vintedId}`,
    seller: p.seller,
    favouriteCount: p.favouriteCount ?? 0,
    listedAt: p.listedAt?.toISOString() ?? null,
    analysisScore: p.analysisScore,
    profitMargin: p.profitMargin,
  }
}
