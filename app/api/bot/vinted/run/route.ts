import { NextResponse } from 'next/server'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { scoreProducts } from '@/lib/ai-scoring'
import { authorizeFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  const body = await request.json().catch(() => ({})) as {
    query?: string
    perPage?: number
    category?: string
  }

  const result = await runVintedBotScan({
    query: body.query,
    perPage: body.perPage,
    category: body.category,
  })

  if (result.source === 'live' && result.items.length > 0) {
    const category = body.category || result.query
    try {
      await persistVintedScanResults(result.items, category)
    } catch (err) {
      console.error('bot/vinted/run: failed to persist scan results', err)
    }
    try {
      await scoreProducts(result.items.map((item) => ({ vintedId: item.id, title: item.title, brand: item.brand, price: item.price, category })))
    } catch (err) {
      console.error('bot/vinted/run: failed to score products', err)
    }
  }

  return NextResponse.json(result)
}

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  return NextResponse.json({
    ok: true,
    message: 'Endpoint du bot Vinted prêt à scanner les annonces.',
  })
}
