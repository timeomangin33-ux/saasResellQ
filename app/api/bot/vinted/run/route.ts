import { NextResponse } from 'next/server'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { scoreProducts } from '@/lib/ai-scoring'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/** Un scan à la demande, déclenché depuis le tableau de bord. */
export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  const body = (await request.json().catch(() => ({}))) as {
    query?: string
    perPage?: number
    category?: string
    priceFrom?: number
    priceTo?: number
  }

  const result = await runVintedBotScan({
    query: body.query,
    perPage: body.perPage,
    category: body.category,
    priceFrom: body.priceFrom,
    priceTo: body.priceTo,
  })

  if (result.success && result.items.length > 0) {
    const category = body.category || result.query
    try {
      await persistVintedScanResults(result.items, category)
    } catch (err) {
      console.error('bot/vinted/run: écriture des annonces impossible', err)
    }
    try {
      await scoreProducts(
        result.items.slice(0, 12).map((item) => ({
          vintedId: item.id,
          title: item.title,
          brand: item.brand,
          price: item.price,
          category,
        })),
      )
    } catch (err) {
      console.error('bot/vinted/run: scoring impossible', err)
    }
  }

  // Un scan qui échoue est un échec : il répond 502, pas 200. Un 200 avec zéro
  // annonce laisserait croire que Vinted n'a rien à proposer, alors que c'est
  // notre lecture qui est en panne.
  return NextResponse.json(result, { status: result.success ? 200 : 502 })
}

/** Diagnostic : le robot arrive-t-il à lire Vinted, maintenant ? */
export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  const { diagnostiquerRobot } = await import('@/lib/vinted-bot')
  const diagnostic = await diagnostiquerRobot()
  return NextResponse.json(diagnostic, { status: diagnostic.ok ? 200 : 502 })
}
