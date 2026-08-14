import { NextResponse } from 'next/server'

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

  const result: Record<string, boolean> = {}
  keys.forEach((k) => {
    result[k] = !!process.env[k]
  })

  return NextResponse.json({ ok: true, env: result })
}
