import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  try {
    const access = await authorizeAIFeature(request, 'category_analysis', 2, 'PRO')
    if ('response' in access) return access.response
    const { category } = await request.json()
    if (!category || typeof category !== 'string') return NextResponse.json({ error: 'Catégorie manquante' }, { status: 400 })
    const data = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.categoryAnalyzer, { category: category.slice(0, 100) })
    if (data.fallback) {
      return NextResponse.json({ error: data.error || 'Le service d\'analyse de catégorie est momentanément indisponible.' }, { status: 503 })
    }
    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
