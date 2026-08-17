import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export async function PATCH(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides. Le nouveau mot de passe doit contenir au moins 8 caractères.', 400)

  const { currentPassword, newPassword } = parsed.data
  const user = access.user

  if (!user.password) {
    return errorResponse('Ce compte utilise une connexion externe (OAuth) et n\'a pas de mot de passe à modifier.', 400)
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return errorResponse('Mot de passe actuel incorrect.', 401)

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
