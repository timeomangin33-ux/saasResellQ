import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature, errorResponse } from '@/lib/access-control'

/**
 * GET /api/products - List products with filters
 */
export async function GET(request: NextRequest) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const minMargin = searchParams.get('minMargin')
    const maxRisk = searchParams.get('maxRisk')
    // `parseInt('abc')` rend NaN, que Prisma refuse : `?limit=abc` renvoyait
    // une 500. On borne comme le fait vinted/opportunities.
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const status = searchParams.get('status') || 'active'

    const products = await prisma.product.findMany({
      where: {
        ...(category && { category }),
        ...(minMargin && { profitMargin: { gte: parseFloat(minMargin) } }),
        ...(maxRisk && { riskLevel: { in: getRiskLevels(maxRisk) } }),
        status,
      },
      // Postgres place les NULL en tête sur un ORDER BY ... DESC, et Prisma
      // émet un ORDER BY nu : les produits sans marge calculée remontaient en
      // tête de liste, devant ceux dont la marge est réellement mesurée.
      orderBy: { profitMargin: { sort: 'desc', nulls: 'last' } },
      take: limit,
    })

    return NextResponse.json({
      count: products.length,
      products,
    })
  } catch (error) {
    // Le message brut de Prisma exposait la structure de la base au client.
    console.error('products GET: lecture impossible', error)
    return NextResponse.json(
      { error: 'Impossible de charger les produits.', cause: 'database' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products - crée ou met à jour une annonce.
 *
 * La table `products` alimente toutes les statistiques publiques du produit.
 * Cette route acceptait `const { vintedId, ...data } = body` et versait `data`
 * tel quel dans un `upsert` : n'importe quel compte PRO pouvait donc écrire le
 * titre, le prix, le score d'analyse ou le statut de n'importe quelle ligne, et
 * fausser les chiffres affichés à tout le monde. Elle est réservée aux
 * administrateurs, et seuls les champs listés ci-dessous sont écrits.
 */

/** Champs qu'un appel externe a le droit d'écrire, et leur type attendu. */
const CHAMPS_ECRITURE = {
  title: 'string',
  description: 'string',
  price: 'number',
  currency: 'string',
  category: 'string',
  subcategory: 'string',
  brand: 'string',
  size: 'string',
  condition: 'string',
  seller: 'string',
  sellerId: 'string',
  location: 'string',
  imageUrl: 'string',
  url: 'string',
  totalPrice: 'number',
  favouriteCount: 'number',
  viewCount: 'number',
} as const

/** Champs obligatoires côté schéma : sans eux, la création échoue en base. */
const CHAMPS_REQUIS_CREATION = ['title', 'price', 'category', 'condition'] as const

function filtrerChampsAutorises(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const [champ, type] of Object.entries(CHAMPS_ECRITURE)) {
    const valeur = body[champ]
    if (valeur === undefined || valeur === null) continue
    if (type === 'number') {
      const nombre = Number(valeur)
      if (!Number.isFinite(nombre)) continue
      data[champ] = nombre
    } else if (typeof valeur === 'string') {
      data[champ] = valeur.slice(0, 2000)
    }
  }
  return data
}

export async function POST(request: NextRequest) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response
  // Écriture dans la table qui sert de source à toutes les figures publiques :
  // réservée aux administrateurs.
  if (access.user.role !== 'ADMIN') {
    return errorResponse('Accès administrateur requis.', 403)
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const vintedId = typeof body.vintedId === 'string' ? body.vintedId.trim() : ''
    if (!vintedId) {
      return NextResponse.json({ error: 'vintedId requis.' }, { status: 400 })
    }

    const data = filtrerChampsAutorises(body)
    const manquants = CHAMPS_REQUIS_CREATION.filter((champ) => data[champ] === undefined)

    const existant = await prisma.product.findUnique({ where: { vintedId }, select: { id: true } })

    // À la création, les champs non nullables doivent être fournis : sans ce
    // contrôle, Prisma répondait par une erreur de contrainte illisible.
    if (!existant && manquants.length > 0) {
      return NextResponse.json(
        { error: `Champs requis manquants : ${manquants.join(', ')}.` },
        { status: 400 },
      )
    }

    const product = existant
      ? await prisma.product.update({
          where: { vintedId },
          data: { ...data, updatedAt: new Date() },
        })
      : await prisma.product.create({
          data: {
            vintedId,
            ...data,
            title: data.title as string,
            price: data.price as number,
            category: data.category as string,
            condition: data.condition as string,
          },
        })

    return NextResponse.json(product, { status: existant ? 200 : 201 })
  } catch (error) {
    console.error('products POST: écriture impossible', error)
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'annonce.", cause: 'database' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get risk levels based on max level
 */
function getRiskLevels(maxRisk: string): string[] {
  const levels: Record<string, string[]> = {
    low: ['low'],
    medium: ['low', 'medium'],
    high: ['low', 'medium', 'high'],
  }
  return levels[maxRisk] || ['low', 'medium', 'high']
}
