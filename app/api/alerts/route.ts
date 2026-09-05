import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeFeature, authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'
import { getPlanLimits } from '@/lib/plans'

/**
 * Les conditions qu'une alerte peut réellement déclencher.
 *
 * `profit_margin` en a été retirée : elle était évaluée dans le cron contre
 * `CategoryMarket.avgMargin`, une colonne que rien dans le dépôt n'écrit
 * jamais. L'alerte était acceptée, affichée « Active », et ne pouvait
 * mathématiquement jamais se déclencher. Mieux vaut ne pas la proposer que
 * promettre une notification qui n'arrivera pas. Les alertes déjà enregistrées
 * avec cette condition sont désactivées par le cron, qui prévient leur
 * propriétaire.
 */
const CONDITIONS = ['price_drop', 'demand_spike'] as const

const createAlertSchema = z.object({
  category: z.string().trim().min(1).max(100),
  condition: z.enum(CONDITIONS),
  threshold: z.coerce.number().min(0).max(1000),
})

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const alerts = await prisma.alert.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ alerts })
}

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const parsed = createAlertSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  if (access.user.role !== 'ADMIN') {
    const limit = getPlanLimits(access.user.subscriptionPlan).alerts
    const count = await prisma.alert.count({ where: { userId: access.user.id } })
    if (count >= limit) {
      return errorResponse(`Limite de ${limit} alerte(s) atteinte pour votre forfait. Passez à un forfait supérieur pour en créer davantage.`, 403)
    }
  }

  // Le cron cherche la catégorie par son nom exact dans `CategoryMarket` et
  // passe son tour sans rien dire quand il ne la trouve pas : une faute de
  // frappe donnait une alerte enregistrée, affichée « Active », et muette à vie.
  // La liste des catégories suivies fait autorité. Si la table est vide (base
  // fraîche, collecte pas encore passée), on n'a rien à opposer et on laisse
  // créer.
  const suivies = await prisma.categoryMarket.findMany({ select: { category: true } })
  if (suivies.length > 0 && !suivies.some((c) => c.category === parsed.data.category)) {
    return errorResponse(
      `« ${parsed.data.category} » ne fait pas partie des catégories suivies. Choisissez-en une dans la liste : ${suivies
        .map((c) => c.category)
        .join(', ')}.`,
      400,
    )
  }

  const alert = await prisma.alert.create({
    data: { userId: access.user.id, ...parsed.data },
  })

  return NextResponse.json({ alert }, { status: 201 })
}
