import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

interface AgentTrendsResponse {
  fallback?: boolean
  error?: string
  trends?: unknown
}

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'trend_analysis', 2, 'PRO')
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({}))
    const data = await callAgent<AgentTrendsResponse>(AGENTS.trendAnalyzer, body)

    if (data.fallback) {
      return NextResponse.json({ error: data.error || 'Le service d\'analyse des tendances est momentanément indisponible.' }, { status: 503 })
    }

    const trends = Array.isArray(data.trends) ? data.trends : []
    return NextResponse.json({ trends, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
