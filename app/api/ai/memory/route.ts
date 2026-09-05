import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'memory_operation')
    if ('response' in access) return access.response
    const { sessionId, action, content } = await request.json()
    const data = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.memory, { sessionId, action, content })
    // `callAgent` ne lève jamais : sans agent, la route confirmait en 200 une
    // écriture mémoire qui n'a jamais eu lieu. Le crédit débité est rendu.
    if (data.fallback) {
      await rembourserCredits(access.user.id, 1, 'memory_operation')
      return NextResponse.json(
        { error: data.error || 'Le service de mémoire est momentanément indisponible.', cause: 'agent_indisponible' },
        { status: 503 },
      )
    }
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
