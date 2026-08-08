import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { getCurrentUser, errorResponse } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return errorResponse('Connexion requise.', 401)
    if (user.role !== 'ADMIN') return errorResponse('Accès administrateur requis.')
    const body = await request.json().catch(() => ({}))
    const { agentKey } = body

    if (!agentKey) {
      return NextResponse.json(
        {
          error: 'Fournir agentKey dans le body',
          availableAgents: Object.keys(AGENTS),
        },
        { status: 400 }
      )
    }

    const agentUrl = AGENTS[agentKey as keyof typeof AGENTS]
    if (!agentUrl) {
      return NextResponse.json(
        {
          error: `Agent '${agentKey}' non trouvé`,
          availableAgents: Object.keys(AGENTS),
        },
        { status: 400 }
      )
    }

    // Payload de test simple selon l'agent
    const testPayloads: Record<string, object> = {
      chat: { message: 'Test du chat agent', session_id: 'test_session' },
      ragSearch: { query: 'test', limit: 5 },
      memory: { sessionId: 'test', action: 'store', content: 'test data' },
      productAnalyzer: { productId: 'test_product' },
      categoryAnalyzer: { category: 'sneakers' },
      opportunityFinder: { minMargin: 30 },
      dealFinder: { category: 'clothing', budget: 100 },
      trendAnalyzer: { period: 'week' },
      reportGenerator: { dateRange: '7d' },
      notificationAgent: { userId: 'test', type: 'deal' },
    }

    const testPayload = testPayloads[agentKey] || body.testPayload || {}

    console.log(`Testing agent: ${agentKey}`)
    console.log(`URL: ${agentUrl}`)
    console.log(`Payload:`, testPayload)

    const startTime = Date.now()
    const result = await callAgent(agentUrl, testPayload)
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      agent: agentKey,
      url: agentUrl,
      duration: `${duration}ms`,
      payload: testPayload,
      response: result,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        availableAgents: Object.keys(AGENTS),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return errorResponse('Connexion requise.', 401)
  if (user.role !== 'ADMIN') return errorResponse('Accès administrateur requis.')
  return NextResponse.json({
    message: 'Test des agents N8N',
    usage: {
      method: 'POST',
      body: {
        agentKey: 'chat | ragSearch | memory | productAnalyzer | categoryAnalyzer | opportunityFinder | dealFinder | trendAnalyzer | reportGenerator | notificationAgent',
        testPayload: '(optionnel) payload personnalisé',
      },
    },
    availableAgents: Object.keys(AGENTS),
    examples: {
      chatTest: {
        method: 'POST',
        url: '/api/ai/test',
        body: { agentKey: 'chat', testPayload: { message: 'Quels sont les deals cette semaine?', session_id: 'test' } },
      },
      dealFinderTest: {
        method: 'POST',
        url: '/api/ai/test',
        body: { agentKey: 'dealFinder', testPayload: { category: 'sneakers', minMargin: 35 } },
      },
    },
  })
}
