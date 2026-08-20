import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * L'évolution d'une catégorie dans le temps.
 *
 * C'est la seule chose que le produit sait faire et qu'un relevé ponctuel ne
 * remplace pas : savoir si une catégorie monte ou descend depuis un mois. Le
 * marché du jour reste ouvert à tous les abonnés ; l'historique est ce qui
 * distingue le forfait Business.
 */
export async function GET(request: Request) {
  const acces = await authorizeFeature(request, 'BUSINESS')
  if ('response' in acces) return acces.response

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')?.trim()
  const jours = Math.max(7, Math.min(365, Number(searchParams.get('days')) || 30))

  if (!category) {
    return NextResponse.json({ error: 'Paramètre « category » requis.' }, { status: 400 })
  }

  const depuis = new Date()
  depuis.setUTCHours(0, 0, 0, 0)
  depuis.setUTCDate(depuis.getUTCDate() - jours)

  const points = await prisma.categoryMarketDaily.findMany({
    where: { category, day: { gte: depuis } },
    orderBy: { day: 'asc' },
    select: { day: true, avgPrice: true, medianPrice: true, volumeActive: true, sampleSize: true },
  })

  const premier = points[0]
  const dernier = points[points.length - 1]
  const variation =
    premier?.medianPrice && dernier?.medianPrice && premier.medianPrice > 0
      ? ((dernier.medianPrice - premier.medianPrice) / premier.medianPrice) * 100
      : null

  return NextResponse.json({
    category,
    days: jours,
    points,
    // Une courbe a besoin d'au moins deux points : tant que le robot n'a pas
    // tourné deux jours, on le dit plutôt que d'afficher une ligne plate.
    ready: points.length >= 2,
    medianChangePercent: variation === null ? null : Number(variation.toFixed(1)),
  })
}
