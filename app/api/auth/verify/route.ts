import { NextResponse } from 'next/server'
import { prisma } from '../../../../prisma'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?verified=0', request.url))
  }

  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verification || verification.expires < new Date()) {
    return NextResponse.redirect(new URL('/auth/signin?verified=0', request.url))
  }

  const [type, userId] = verification.identifier.split(':')

  if (type === 'verify') {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    })
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: verification.identifier } })

  return NextResponse.redirect(new URL('/auth/signin?verified=1', request.url))
}
