import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'rag_search', 2)
    if ('response' in access) return access.response
    const { query, limit = 10 } = await request.json()
    if (!query) return NextResponse.json({ error: 'Query manquante' }, { status: 400 })
    const data = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.ragSearch, { query, limit })
    // `callAgent` ne lève jamais : le repli était renvoyé en 200 et le client
    // recevait un objet sans résultats comme s'il s'agissait d'une recherche
    // vide. Les 2 crédits débités avant l'appel sont rendus.
    if (data.fallback) {
      await rembourserCredits(access.user.id, 2, 'rag_search')
      return NextResponse.json(
        { error: data.error || 'La recherche documentaire est momentanément indisponible.', cause: 'agent_indisponible' },
        { status: 503 },
      )
    }
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
