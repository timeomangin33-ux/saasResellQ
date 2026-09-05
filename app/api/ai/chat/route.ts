import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'chat_message')
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
    })) as Record<string, unknown> & { fallback?: boolean; error?: string }

    // `callAgent` ne lève jamais : sans agent joignable il rend
    // `{ fallback: true, response: "L'agent IA est momentanément
    // indisponible…" }`. Cette route rendait cette phrase en 200 dans le champ
    // `result`, et l'interface l'affichait comme la réponse de l'assistant.
    // Le crédit débité avant l'appel est rendu : rien n'a été analysé.
    if (data.fallback) {
      await rembourserCredits(access.user.id, 1, 'chat_message')
      return NextResponse.json(
        { error: data.error || "L'assistant IA est momentanément indisponible.", cause: 'agent_indisponible' },
        { status: 503 },
      )
    }

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
