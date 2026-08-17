import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

const patchAlertSchema = z.object({
  active: z.boolean(),
})

async function loadOwnedAlert(id: string, userId: string) {
  const alert = await prisma.alert.findUnique({ where: { id } })
  if (!alert || alert.userId !== userId) return null
  return alert
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const { id } = await params
  const existing = await loadOwnedAlert(id, access.user.id)
  if (!existing) return errorResponse('Alerte introuvable.', 404)

  const parsed = patchAlertSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  const alert = await prisma.alert.update({ where: { id }, data: { active: parsed.data.active } })
  return NextResponse.json({ alert })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const { id } = await params
  const existing = await loadOwnedAlert(id, access.user.id)
  if (!existing) return errorResponse('Alerte introuvable.', 404)

  await prisma.alert.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
