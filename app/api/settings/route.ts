import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['fr', 'en', 'de']).optional(),
  aiModel: z.enum(['gpt-4', 'gpt-3.5']).optional(),
  detailLevel: z.enum(['short', 'medium', 'detailed']).optional(),
  autoSuggest: z.boolean().optional(),
  emailDealAlerts: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  emailProductUpdates: z.boolean().optional(),
})

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  return NextResponse.json({ preferences: access.user.preferences ?? {} })
}

export async function PATCH(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const parsed = preferencesSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  const current = (access.user.preferences as Record<string, unknown>) ?? {}
  const preferences = { ...current, ...parsed.data }

  const user = await prisma.user.update({
    where: { id: access.user.id },
    data: { preferences },
  })

  return NextResponse.json({ preferences: user.preferences })
}
