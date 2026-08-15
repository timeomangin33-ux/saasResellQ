import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'

export async function GET(req: Request) {
  const provided = req.headers.get('x-debug-token') || ''
  const secret = process.env.DEBUG_TOKEN || ''

  // In production require token match; in development allow without token.
  if (process.env.NODE_ENV === 'production' && (!secret || provided !== secret)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const keys = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY',
  ]

  const envPresence: Record<string, boolean> = {}
  keys.forEach((k) => {
    envPresence[k] = !!process.env[k]
  })

  // Try a lightweight DB check using Prisma (SELECT 1) and report result.
  let dbCheck = { ok: false, error: null as string | null }
  try {
    // If DATABASE_URL is missing, prisma will already have tried fallbacks in prisma.ts
    // We run a minimal query to validate connectivity.
    // @ts-ignore
    await prisma.$queryRaw`SELECT 1 as result`
    dbCheck.ok = true
  } catch (err: unknown) {
    dbCheck.error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({ ok: true, env: envPresence, db: dbCheck })
}
