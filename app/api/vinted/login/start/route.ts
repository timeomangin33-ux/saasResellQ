import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import play from '@/lib/playwright-vinted'
import { saveVintedSession } from '@/lib/vinted-connector'

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const user = access.user

  try {
    // Launch headful Playwright and wait for the user to login in the opened browser
    const serializedCookieJar = await play.loginWithPlaywright({ timeoutMs: 1000 * 60 * 5 })

    const account = await saveVintedSession(user.id, { cookieJar: serializedCookieJar })
    return NextResponse.json({ ok: true, account })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur lors du login Playwright' }, { status: 500 })
  }
}
