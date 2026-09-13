import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { navigateurDisponible } from '@/lib/integrations'
import play from '@/lib/playwright-vinted'
import { saveVintedSession } from '@/lib/vinted-connector'

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const user = access.user

  // Cette route ouvre un navigateur *visible* et attend cinq minutes que
  // quelqu'un s'y connecte à la main. Sur un poste de développement c'est le
  // but ; sur une fonction serverless il n'y a ni écran ni Chromium, et
  // l'appel mourait au lancement sur une erreur parlant de Chromium à
  // quelqu'un qui voulait relier son compte.
  if (!navigateurDisponible()) {
    return NextResponse.json(
      { error: "La connexion assistée par navigateur n'est pas disponible sur cet hébergement." },
      { status: 503 },
    )
  }

  try {
    // Launch headful Playwright and wait for the user to login in the opened browser
    const serializedCookieJar = await play.loginWithPlaywright({ timeoutMs: 1000 * 60 * 5 })

    const account = await saveVintedSession(user.id, { cookieJar: serializedCookieJar })
    return NextResponse.json({ ok: true, account })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur lors du login Playwright' }, { status: 500 })
  }
}
