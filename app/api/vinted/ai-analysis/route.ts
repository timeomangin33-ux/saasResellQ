import { NextResponse } from 'next/server'
import { authorizeAIFeature } from '@/lib/access-control'
import { prisma } from '@/prisma'
import { callAgent, AGENTS } from '@/lib/n8n-agents'

export async function GET(request: Request) {
  const access = await authorizeAIFeature(request, 'vinted_analysis', 2, 'PRO')
  if ('response' in access) return access.response

  const user = access.user

  // Very small heuristic-based analysis. For richer analysis, call AI agent.
  const db: any = prisma
  const account = await db.vintedAccount.findFirst({ where: { userId: user.id } })
  if (!account) return NextResponse.json({ error: 'Aucun compte Vinted lié' }, { status: 404 })

  const sales = await db.vintedSale.findMany({ where: { accountId: account.id } })
  const listings = await db.vintedListing.findMany({ where: { accountId: account.id } })

  // Best-selling categories
  const catCount: Record<string, number> = {}
  const brandCount: Record<string, number> = {}
  for (const s of sales) {
    const listing = await db.vintedListing.findUnique({ where: { vintedId: s.listingId ?? '' } })
    if (!listing) continue
    if (listing.category) catCount[listing.category] = (catCount[listing.category] || 0) + 1
    if (listing.brand) brandCount[listing.brand] = (brandCount[listing.brand] || 0) + 1
  }

  const topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Try calling the AI agent for richer analysis
  try {
    const agentResponse = await callAgent(AGENTS.productAnalyzer, {
      action: 'vinted_account_analysis',
      userId: user.id,
      topCategories,
      topBrands,
      listings: listings.slice(0, 100),
      sales: sales.slice(0, 100),
    })
    return NextResponse.json({ ai: agentResponse, topCategories, topBrands })
  } catch (err) {
    const suggestions: string[] = []
    if (topCategories.length) suggestions.push(`Les catégories les plus performantes sont: ${topCategories.map(t => t[0]).join(', ')}`)
    if (topBrands.length) suggestions.push(`Les marques qui se vendent le mieux: ${topBrands.map(t => t[0]).join(', ')}`)
    if (listings.length > 0) suggestions.push('Remettez en avant les annonces à faible visibilité mais avec marge élevée.')
    return NextResponse.json({ error: 'AI_AGENT_FAILED', message: (err as any)?.message || 'Agent indisponible', suggestions, topCategories, topBrands }, { status: 502 })
  }
}
