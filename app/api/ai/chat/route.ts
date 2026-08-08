import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature('chat_message')
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({}))
    const messages: Array<{ role?: string; content?: string }> = Array.isArray(body.messages)
      ? body.messages
      : []
    const lastMessage = messages[messages.length - 1]?.content || ''
    const sessionId = body.session_id || `sess_${Date.now()}`

    if (!lastMessage) {
      return NextResponse.json({ error: 'Aucun message fourni' }, { status: 400 })
    }

    const data = (await callAgent(AGENTS.chat, {
      message: lastMessage,
      session_id: sessionId,
      messages: messages.map(m => ({ role: m.role ?? 'user', content: m.content ?? '' })),
    })) as Record<string, unknown>

    const result = typeof data?.response === 'string'
      ? data.response
      : typeof data?.output === 'string'
        ? data.output
        : typeof data?.message === 'string'
          ? data.message
          : JSON.stringify(data)

    return NextResponse.json({ result, usage: { remaining: access.usage.remaining, limit: access.usage.limit } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
