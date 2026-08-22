import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature, errorResponse } from '@/lib/access-control'
import { integrationConfiguree } from '@/lib/integrations'
import { getPlanLimits } from '@/lib/plans'
import { saveVintedSession } from '@/lib/vinted-connector'

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const user = access.user

  try {
    const body = await request.json().catch(() => ({}))
    // Expect optional fields: username, profileUrl, cookieJar (client may supply cookieJar)
    const { username, profileUrl, cookieJar } = body

    if (user.role !== 'ADMIN') {
      const limit = getPlanLimits(user.subscriptionPlan).vintedAccounts
      const db: any = prisma
      const existing = await db.vintedAccount.findFirst({
        where: { userId: user.id, ...(profileUrl ? { profileUrl } : {}), ...(username ? { username } : {}) },
      })
      if (!existing) {
        const count = await db.vintedAccount.count({ where: { userId: user.id } })
        if (count >= limit) {
          return errorResponse(`Votre forfait permet ${limit} compte(s) Vinted connecté(s). Passez à Business pour le multi-comptes.`, 403)
        }
      }
    }

    // Sans la clé de chiffrement, la sauvegarde échoue de toute façon — mais
    // avec un 500 et un message interne. Autant le dire clairement et tôt.
    if (!integrationConfiguree('VINTED_COOKIE_SECRET')) {
      return errorResponse(
        "La connexion de comptes Vinted est momentanément indisponible. Rien n'a été enregistré.",
        503,
      )
    }

    const account = await saveVintedSession(user.id, { username, profileUrl, cookieJar })
    return NextResponse.json({ ok: true, account })
  } catch (err: any) {
    // Le message d'erreur brut expose la configuration interne du serveur.
    console.error('vinted/connect', err)
    return NextResponse.json({ error: 'La connexion a échoué. Réessaie dans un instant.' }, { status: 500 })
  }
}
