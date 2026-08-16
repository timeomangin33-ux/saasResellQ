const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/+$/, '')

export const AGENTS = {
  chat: N8N_BASE ? `${N8N_BASE}/ResellQ-ai-chat` : '',
  ragSearch: N8N_BASE ? `${N8N_BASE}/ResellQ-rag-search` : '',
  memory: N8N_BASE ? `${N8N_BASE}/ResellQ-memory` : '',
  productAnalyzer: N8N_BASE ? `${N8N_BASE}/ResellQ-analyze-product` : '',
  categoryAnalyzer: N8N_BASE ? `${N8N_BASE}/ResellQ-analyze-category` : '',
  opportunityFinder: N8N_BASE ? `${N8N_BASE}/ResellQ-opportunities` : '',
  dealFinder: N8N_BASE ? `${N8N_BASE}/ResellQ-deals` : '',
  trendAnalyzer: N8N_BASE ? `${N8N_BASE}/ResellQ-trends` : '',
  reportGenerator: N8N_BASE ? `${N8N_BASE}/ResellQ-report` : '',
  notificationAgent: N8N_BASE ? `${N8N_BASE}/ResellQ-notifications` : '',
}

function buildFallbackResponse(body: unknown, errorMessage: string) {
  const payload = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
  const message = typeof payload.message === 'string' ? payload.message : ''
  return {
    response: message ? `L'agent IA est momentanément indisponible. Votre demande a été enregistrée : « ${message} ». ` : 'L'agent IA est momentanément indisponible. Réessayez dans un instant.',
    fallback: true,
    error: errorMessage,
  }
}

export async function callAgent<T = unknown>(url: string, body: object = {}): Promise<T> {
  if (!url) return buildFallbackResponse(body, 'Le service IA n'est pas configuré.') as T
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    const text = await res.text().catch(() => '')
    let data: unknown = null
    if (text) {
      try { data = JSON.parse(text) } catch { data = null }
    }
    if (!res.ok) {
      const message = (data as Record<string, unknown> | null)?.error || `Service IA indisponible (${res.status}).`
      throw new Error(String(message))
    }
    return (data ?? (text ? { raw: text } : {})) as T
  } catch (error) {
    return buildFallbackResponse(body, error instanceof Error ? error.message : 'Erreur inconnue') as T
  }
}
