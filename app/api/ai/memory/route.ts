import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature('memory_operation')
    if ('response' in access) return access.response
    const { sessionId, action, content } = await request.json()
    const data = await callAgent(AGENTS.memory, { sessionId, action, content })
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
