import { NextResponse } from 'next/server'
import { PostgreSQLProvider } from '@/src/providers/database/postgresql.provider'
import { requireInternalAccess } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = requireInternalAccess(request)
  if ('response' in access) return access.response

  try {
    const client = PostgreSQLProvider.getClient()
    const now = await client.$queryRaw`SELECT now()`
    return NextResponse.json({ status: 'ok', now })
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}
