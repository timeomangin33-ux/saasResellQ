import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'opportunity_finder', 2, 'PRO')
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({}))
    const data = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.opportunityFinder, body)
    if (data.fallback) {
    // Les crédits sont débités avant l'appel : un agent injoignable les
    // consommerait sans rien rendre, et le compteur ne se recharge pas tout
    // seul. On rembourse donc avant de répondre.
    await rembourserCredits(access.user.id, 2, 'opportunity_finder')
      return NextResponse.json({ error: data.error || 'Le service de recherche d\'opportunités est momentanément indisponible.' }, { status: 503 })
    }
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
