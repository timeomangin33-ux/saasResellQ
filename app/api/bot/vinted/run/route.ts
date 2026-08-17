import { NextResponse } from 'next/server'
import { runVintedBotScan } from '@/lib/vinted-bot'
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
