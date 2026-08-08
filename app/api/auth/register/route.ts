import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../../../prisma'
import { nextMonthlyReset } from '@/lib/plans'
import { checkRateLimit } from '@/lib/rate-limit'
import { createVerificationToken, sendVerificationEmail } from '@/lib/email'

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rateLimit = checkRateLimit(`register:${ip}`, 5, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { name, password } = parsed.data
  const normalizedEmail = parsed.data.email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'USER',
      subscriptionStatus: 'INACTIVE',
      subscriptionPlan: 'FREE',
      aiCreditsResetAt: nextMonthlyReset(),
    },
  })

  const verificationToken = await createVerificationToken({ userId: user.id, type: 'verify' })
  await sendVerificationEmail(normalizedEmail, verificationToken, 'verify')

  return NextResponse.json({ success: true, message: 'Compte créé. Un email de vérification a été envoyé.' }, { status: 201 })
}
