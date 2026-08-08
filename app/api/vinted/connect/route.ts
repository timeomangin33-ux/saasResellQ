import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { saveVintedSession } from '@/lib/vinted-connector'

export async function POST(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const user = access.user

  try {
    const body = await request.json().catch(() => ({}))
    // Expect optional fields: username, profileUrl, cookieJar (client may supply cookieJar)
    const { username, profileUrl, cookieJar } = body

    const account = await saveVintedSession(user.id, { username, profileUrl, cookieJar })
    return NextResponse.json({ ok: true, account })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur' }, { status: 500 })
  }
}
