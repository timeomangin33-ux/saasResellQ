import { NextResponse } from 'next/server'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
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
    try {
      await persistVintedScanResults(result.items, body.category || result.query)
    } catch (err) {
      console.error('bot/vinted/run: failed to persist scan results', err)
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
