import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { requireInternalAccess } from '@/lib/access-control'
import { etatDeLaCollecte } from '@/lib/vinted/sante'

export const dynamic = 'force-dynamic'

/**
 * L'état du robot, pour les appels internes.
 *
 * Cette route renvoyait trois constantes — `status: 'disabled'`, `lastRun:
 * null`, `categoriesCount: 0` — quelle que soit la réalité. Le robot pouvait
 * tourner parfaitement, elle répondait « désactivé » ; il pouvait être mort,
 * elle répondait la même chose. Une sonde qui ne mesure rien est pire
 * qu'absente : on croit surveiller.
 */
export async function GET(request: Request) {
  const access = requireInternalAccess(request)
  if ('response' in access) return access.response

  const [sante, cibles, dernierPassage] = await Promise.all([
    etatDeLaCollecte(),
    prisma.collectTarget.findMany({
      orderBy: [{ priority: 'desc' }, { query: 'asc' }],
      select: {
        query: true,
        enabled: true,
        intervalMinutes: true,
        lastRunAt: true,
        nextRunAt: true,
        lastStatus: true,
        lastItemCount: true,
        consecutiveFailures: true,
      },
    }),
    prisma.automationJob.findFirst({
      where: { jobType: 'market-refresh' },
      orderBy: { createdAt: 'desc' },
      select: { status: true, lastRunAt: true, result: true, error: true },
    }),
  ])

  return NextResponse.json({
    status: sante.statut,
    message: sante.message,
    lastRun: sante.derniereEcriture,
    ageMinutes: sante.ageMinutes,
    activeListings: sante.annoncesActives,
    categoriesCount: sante.categoriesSuivies,
    targets: cibles,
    lastPass: dernierPassage,
  })
}
