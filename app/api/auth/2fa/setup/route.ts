import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '../../../../../prisma'
import { createVerificationToken, sendVerificationEmailToUser } from '@/lib/email'

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  if (!user?.email) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const token = await createVerificationToken({ userId: session.user.id, type: '2fa' })
  await sendVerificationEmailToUser(user.email, token, '2fa')

  return NextResponse.json({ success: true, message: 'Un code de validation a été envoyé à votre adresse email.' })
}
