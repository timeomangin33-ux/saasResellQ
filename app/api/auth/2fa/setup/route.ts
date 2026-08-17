import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '../../../../../prisma'
// 2FA via email is temporarily disabled

export async function POST(request: Request) {
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

  // 2FA email flow disabled: return a neutral success message
  return NextResponse.json({ success: true, message: 'La vérification à deux facteurs est temporairement désactivée.' })
}
