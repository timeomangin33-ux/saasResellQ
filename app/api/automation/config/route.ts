import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { auth } from '@/auth'
import { automationQueue } from '@/lib/queues'
import { authorizeFeature } from '@/lib/access-control'
import { z } from 'zod'

const configSchema = z.object({
  enabled: z.boolean().optional(),
  autoCreateWatchlist: z.boolean().optional(),
  autoAnalyze: z.boolean().optional(),
  autoNotify: z.boolean().optional(),
  minProfitMargin: z.coerce.number().min(0).max(100).optional(),
  maxRiskLevel: z.enum(['low', 'medium', 'high']).optional(),
  checkInterval: z.coerce.number().int().min(300).max(86_400).optional(),
})

/**
 * GET /api/automation/config - Get user automation config
 */
export async function GET(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = access.user

    let config = await prisma.automationConfig.findUnique({
      where: { userId: user.id },
    })

    // Create default config if doesn\'t exist
    if (!config) {
      config = await prisma.automationConfig.create({
        data: {
          userId: user.id,
          enabled: true,
          autoCreateWatchlist: true,
          autoAnalyze: true,
          autoNotify: true,
          minProfitMargin: 25.0,
          maxRiskLevel: 'medium',
          checkInterval: 3600,
        },
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/automation/config - Update automation config
 */
export async function POST(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = access.user
    const parsed = configSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Configuration invalide.' }, { status: 400 })
    const body = parsed.data

    const updated = await prisma.automationConfig.upsert({
      where: { userId: user.id },
      update: body,
      create: {
        userId: user.id,
        ...body,
      },
    })

    // If automation is enabled, schedule initial jobs
    if (updated.enabled) {
      await automationQueue.add(
        {
          type: 'sync-products',
          userId: user.id,
          payload: { limit: 100 },
        },
        { jobId: `automation-sync-${user.id}`, repeat: { every: updated.checkInterval * 1000 } }
      )
      // Schedule Vinted account sync as well
      await automationQueue.add(
        {
          type: 'sync-vinted',
          userId: user.id,
          payload: {},
        },
        { jobId: `automation-vinted-sync-${user.id}`, repeat: { every: updated.checkInterval * 1000 } }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
