import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { prisma } from '@/prisma'

export async function GET() {
  const access = await authorizeFeature('BUSINESS')
  if ('response' in access) return access.response

  const user = access.user

  const db: any = prisma
  const accounts = await db.vintedAccount.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ ok: true, accounts })
}
