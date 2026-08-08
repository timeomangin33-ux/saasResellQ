import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature('category_analysis', 2, 'PRO')
    if ('response' in access) return access.response
    const { category } = await request.json()
    if (!category || typeof category !== 'string') return NextResponse.json({ error: 'Catégorie manquante' }, { status: 400 })
    const data = await callAgent(AGENTS.categoryAnalyzer, { category: category.slice(0, 100) })
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
