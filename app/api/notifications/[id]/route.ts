import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

const patchNotificationSchema = z.object({
  read: z.boolean(),
})

async function loadOwnedNotification(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== userId) return null
  return notification
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const { id } = await params
  const existing = await loadOwnedNotification(id, access.user.id)
  if (!existing) return errorResponse('Notification introuvable.', 404)

  const parsed = patchNotificationSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  const notification = await prisma.notification.update({ where: { id }, data: { read: parsed.data.read } })
  return NextResponse.json({ notification })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const { id } = await params
  const existing = await loadOwnedNotification(id, access.user.id)
  if (!existing) return errorResponse('Notification introuvable.', 404)

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
