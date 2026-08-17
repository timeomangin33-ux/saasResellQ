import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const searches = await prisma.savedSearch.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ searches })
}
