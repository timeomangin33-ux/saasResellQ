import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'
import { runAutomationJob } from '@/lib/automation-actions'

export const maxDuration = 60

/**
 * GET /api/automation/status - Get automation status and recent job history
 */
export async function GET(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = await prisma.user.findUnique({ where: { id: access.user.id }, include: { automationConfig: true } })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    const recentJobs = await prisma.automationJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const lastRunByType: Record<string, string | null> = {}
    for (const type of ['sync-products', 'analyze-products', 'create-watchlist']) {
      const last = recentJobs.find((j) => j.jobType === type)
      lastRunByType[type] = last?.lastRunAt?.toISOString() ?? null
    }

    return NextResponse.json({
      automationEnabled: user.automationConfig?.enabled ?? true,
      lastRunByType,
      config: user.automationConfig,
      recentJobs,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/automation/status - Run an automation action now and wait for the result.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = access.user

    const body = await request.json().catch(() => ({}))
    const { jobType, payload } = body

    const validJobTypes = ['sync-products', 'analyze-products', 'create-watchlist', 'notify-user']
    if (!validJobTypes.includes(jobType)) {
      return NextResponse.json({ error: `Type de job invalide : ${jobType}` }, { status: 400 })
    }

    if (jobType === 'create-watchlist' && user.role !== 'ADMIN' && user.subscriptionPlan !== 'BUSINESS') {
      return NextResponse.json({ error: 'La création automatique de watchlists est réservée au forfait Business.' }, { status: 403 })
    }

    const { jobId, status, result } = await runAutomationJob(
      user.id,
      jobType,
      typeof payload === 'object' && payload !== null ? payload : {},
    )

    return NextResponse.json({ jobId, status, type: jobType, result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
