import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const { id } = await params
  const watchlist = await prisma.watchlist.findUnique({ where: { id } })
  if (!watchlist || watchlist.userId !== access.user.id) {
    return errorResponse('Watchlist introuvable.', 404)
  }

  await prisma.watchlist.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
