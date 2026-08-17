import { NextResponse } from 'next/server'
import { authorizeAuthenticatedUser } from '@/lib/access-control'
import { prisma } from '@/prisma'

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const notifications = await prisma.notification.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({ notifications })
}
