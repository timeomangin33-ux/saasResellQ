import { NextRequest, NextResponse } from 'next/server'
import { automationQueue, productSyncQueue, analysisQueue, watchlistQueue } from '@/lib/queues'
import { prisma } from '@/prisma'
import { auth } from '@/auth'
import { authorizeFeature } from '@/lib/access-control'

/**
 * GET /api/automation/status - Get automation status and job queue
 */
export async function GET(request: NextRequest) {
  try {
    const access = await authorizeFeature('PRO')
    if ('response' in access) return access.response
    const user = await prisma.user.findUnique({ where: { id: access.user.id }, include: { automationConfig: true } })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    // Get queue stats
    const [automationCount, syncCount, analysisCount, watchlistCount] = await Promise.all([
      automationQueue.count(),
      productSyncQueue.count(),
      analysisQueue.count(),
      watchlistQueue.count(),
    ])

    // Get recent jobs
    const recentJobs = await prisma.automationJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      automationEnabled: user.automationConfig?.enabled ?? true,
      queues: {
        automation: automationCount,
        productSync: syncCount,
        analysis: analysisCount,
        watchlist: watchlistCount,
      },
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
 * POST /api/automation/trigger - Manually trigger automation job
 */
export async function POST(request: NextRequest) {
  try {
    const access = await authorizeFeature('PRO')
    if ('response' in access) return access.response
    const user = access.user

    const body = await request.json().catch(() => ({}))
    const { jobType, payload } = body

    // Validate job type
    const validJobTypes = ['sync-products', 'analyze-products', 'create-watchlist', 'notify-user']
    if (!validJobTypes.includes(jobType)) {
      return NextResponse.json({ error: `Invalid job type: ${jobType}` }, { status: 400 })
    }

    // Add job to queue
    const job = await automationQueue.add(
      {
        type: jobType,
        userId: user.id,
        payload: typeof payload === 'object' && payload !== null ? payload : {},
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    )

    // Log to database
    await prisma.automationJob.create({
      data: {
        userId: user.id,
        jobType,
        status: 'pending',
        input: JSON.stringify(typeof payload === 'object' && payload !== null ? payload : {}),
      },
    })

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      type: jobType,
      message: `Job ${job.id} has been queued`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
