import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../prisma'
import { authMiddleware } from '../../../../lib/middleware/auth'

export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Require admin authentication
  const auth = await authMiddleware(req, { requireAuth: true, requireRole: 'ADMIN' })
  if (!auth.authenticated) {
    return auth.error
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD environment variable not set' },
      { status: 400 }
    )
  }

  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const admin = await prisma.user.upsert({
      where: { email: 'botvintedscrapper@gmail.com' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'BUSINESS',
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        email: 'botvintedscrapper@gmail.com',
        name: 'Admin Vinted Scrapper',
        password: hashedPassword,
        role: 'ADMIN',
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'BUSINESS',
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({
      message: 'Admin created or already exists',
      email: admin.email,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create admin', details: message },
      { status: 500 }
    )
  }
}
