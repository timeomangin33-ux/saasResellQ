import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature, errorResponse, rembourserCredits } from '@/lib/access-control'
import { getPlanLimits } from '@/lib/plans'

interface AgentReportResponse {
  fallback?: boolean
  error?: string
  response?: string
  report?: Record<string, unknown>
  id?: string
  title?: string
  type?: string
  summary?: string
  insights?: string[]
  topOpportunities?: string[]
  createdAt?: string
}

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'report_generation', 3, 'STARTER')
    if ('response' in access) return access.response
    const body = await request.json().catch(() => ({}))

    const requestedType = typeof (body as Record<string, unknown>).type === 'string' ? (body as Record<string, unknown>).type as string : 'weekly'
    if (access.user.role !== 'ADMIN') {
      const allowedTypes = getPlanLimits(access.user.subscriptionPlan).reportTypes
      if (!allowedTypes.includes(requestedType)) {
        return errorResponse(`Les rapports "${requestedType}" ne sont pas inclus dans votre forfait. Passez à un forfait supérieur pour y accéder.`, 403)
      }
    }

    const data = await callAgent<AgentReportResponse>(AGENTS.reportGenerator, body)

    if (data.fallback) {
    // Les crédits sont débités avant l'appel : un agent injoignable les
    // consommerait sans rien rendre, et le compteur ne se recharge pas tout
    // seul. On rembourse donc avant de répondre.
    await rembourserCredits(access.user.id, 3, 'report_generation')
      return NextResponse.json({ error: data.error || 'Le service de génération de rapports est momentanément indisponible.' }, { status: 503 })
    }

    const source = data.report ?? data
    const type = typeof (body as Record<string, unknown>).type === 'string' ? (body as Record<string, unknown>).type as string : 'weekly'

    if (!source.summary && !source.insights) {
      return NextResponse.json({ error: 'Le rapport généré est vide. Réessayez.' }, { status: 502 })
    }

    const report = {
      id: (source.id as string) || crypto.randomUUID(),
      title: (source.title as string) || `Rapport — ${new Date().toLocaleDateString('fr-FR')}`,
      type: (source.type as string) || type,
      summary: (source.summary as string) || '',
      insights: Array.isArray(source.insights) ? source.insights : [],
      topOpportunities: Array.isArray(source.topOpportunities) ? source.topOpportunities : [],
      createdAt: (source.createdAt as string) || new Date().toISOString(),
    }

    return NextResponse.json({ report, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
