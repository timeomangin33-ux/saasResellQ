import { NextResponse } from 'next/server'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'
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

  // Appel de l'agent IA pour l'analyse détaillée.
  try {
    const agentResponse = await callAgent<{ fallback?: boolean; error?: string }>(AGENTS.productAnalyzer, {
      action: 'vinted_account_analysis',
      userId: user.id,
      topCategories,
      topBrands,
      listings: listings.slice(0, 100),
      sales: sales.slice(0, 100),
    })

    // `callAgent` ne lève jamais : il rattrape ses propres erreurs et rend
    // `{ fallback: true }`. Le bloc `catch` ci-dessous n'était donc jamais
    // atteint, et l'agent indisponible était servi en 200 avec un objet de
    // repli dans `ai` — l'interface l'affichait comme une analyse. On traite
    // le repli explicitement et on rend les 2 crédits déjà débités.
    if (agentResponse?.fallback) {
      await rembourserCredits(user.id, 2, 'vinted_analysis')
      return NextResponse.json(
        {
          error: 'AI_AGENT_FAILED',
          message: agentResponse.error || 'Agent indisponible',
          cause: 'agent_indisponible',
          suggestions: suggestionsLocales(topCategories, topBrands, listings.length),
          topCategories,
          topBrands,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ ai: agentResponse, topCategories, topBrands })
  } catch (err) {
    await rembourserCredits(user.id, 2, 'vinted_analysis')
    return NextResponse.json(
      {
        error: 'AI_AGENT_FAILED',
        message: (err as any)?.message || 'Agent indisponible',
        cause: 'agent_indisponible',
        suggestions: suggestionsLocales(topCategories, topBrands, listings.length),
        topCategories,
        topBrands,
      },
      { status: 502 },
    )
  }
}

/**
 * Pistes déduites du seul compte Vinted de l'utilisateur, sans modèle.
 * Ce sont ses propres ventes, pas des données de marché : le vocabulaire
 * « vendu » est ici légitime, contrairement aux annonces publiques.
 */
function suggestionsLocales(
  topCategories: Array<[string, number]>,
  topBrands: Array<[string, number]>,
  nombreAnnonces: number,
) {
  const suggestions: string[] = []
  if (topCategories.length) suggestions.push(`Vos catégories les plus performantes : ${topCategories.map((t) => t[0]).join(', ')}`)
  if (topBrands.length) suggestions.push(`Vos marques les plus vendues : ${topBrands.map((t) => t[0]).join(', ')}`)
  if (nombreAnnonces > 0) suggestions.push('Remettez en avant les annonces à faible visibilité mais avec marge élevée.')
  return suggestions
}
