import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'rag_search', 2)
    if ('response' in access) return access.response
    const { query, limit = 10 } = await request.json()
    if (!query) return NextResponse.json({ error: 'Query manquante' }, { status: 400 })
    const data = await callAgent(AGENTS.ragSearch, { query, limit })
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
