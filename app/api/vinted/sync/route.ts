import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { getVintedAccountForUser, fetchAccountData, persistFetchedData, computeSummary } from '@/lib/vinted-connector'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rateLimit = checkRateLimit(`vinted-sync:${ip}`, 8, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }

  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const user = access.user

  try {
    const account = await getVintedAccountForUser(user.id)
    if (!account) return NextResponse.json({ error: 'Aucun compte Vinted lié' }, { status: 404 })

    const { listings, sales } = await fetchAccountData(account)
    await persistFetchedData(account.id, listings, sales)

    const summary = computeSummary(listings, sales)
    return NextResponse.json({ ok: true, summary })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur lors de la synchronisation' }, { status: 500 })
  }
}
