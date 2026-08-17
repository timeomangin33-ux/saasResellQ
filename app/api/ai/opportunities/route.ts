import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'opportunity_finder', 2, 'PRO')
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({}))
    const data = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.opportunityFinder, body)
    if (data.fallback) {
      return NextResponse.json({ error: data.error || 'Le service de recherche d\'opportunités est momentanément indisponible.' }, { status: 503 })
    }
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
