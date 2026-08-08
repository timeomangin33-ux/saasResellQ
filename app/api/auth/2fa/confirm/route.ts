import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '../../../../../prisma'
import { consumeVerificationToken } from '@/lib/email'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!code) {
    return NextResponse.json({ error: 'Le code est requis' }, { status: 400 })
  }

  const isValid = await consumeVerificationToken({ userId: session.user.id, type: '2fa', token: code })
  if (!isValid) {
    return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true },
  })

  return NextResponse.json({ success: true, message: 'Authentification à deux facteurs activée.' })
}
