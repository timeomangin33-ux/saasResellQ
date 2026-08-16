import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '../../../../../prisma'
// 2FA verification disabled

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // 2FA confirmation flow is disabled; do not enable 2FA.
  return NextResponse.json({ success: true, message: 'La vérification à deux facteurs est temporairement désactivée.' })
}
