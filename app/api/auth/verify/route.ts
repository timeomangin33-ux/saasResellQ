import { NextResponse } from 'next/server'
import { prisma } from '../../../../prisma'

/**
 * Vérification d'une adresse email.
 *
 * Cette route redirigeait vers `/auth/signin?verified=1` quel que soit le
 * contenu de l'URL : sans jeton, avec un jeton inventé ou expiré, l'écran de
 * connexion affichait « Adresse email vérifiée avec succès ». Elle importait
 * `prisma` sans jamais s'en servir. Le jeton est maintenant réellement
 * confronté à la table `verification_tokens`, et la redirection ne porte
 * `verified=1` que lorsque la vérification a eu lieu.
 *
 * À noter : aucun code de ce dépôt n'écrit pour l'instant dans
 * `verification_tokens` — l'inscription pose `emailVerifiedAt` directement
 * (voir app/api/auth/register/route.ts). Tant qu'aucun envoi d'email ne crée
 * de jeton, cette route répondra donc toujours `verified=0`, ce qui est la
 * réponse honnête : elle n'a rien pu vérifier.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')?.trim() ?? ''
  const echec = NextResponse.redirect(new URL('/auth/signin?verified=0', request.url))

  if (!token) return echec

  try {
    const enregistrement = await prisma.verificationToken.findUnique({ where: { token } })
    if (!enregistrement) return echec

    // Un jeton expiré est supprimé plutôt que laissé en base : il ne servira
    // plus, et le garder allonge la fenêtre pendant laquelle il peut fuiter.
    if (enregistrement.expires <= new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
      return echec
    }

    const utilisateur = await prisma.user.findUnique({
      where: { email: enregistrement.identifier },
      select: { id: true },
    })
    if (!utilisateur) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
      return echec
    }

    await prisma.user.update({
      where: { id: utilisateur.id },
      data: { emailVerifiedAt: new Date() },
    })
    // Jeton à usage unique : sans cette suppression, le lien resterait
    // rejouable jusqu'à sa date d'expiration.
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})

    return NextResponse.redirect(new URL('/auth/signin?verified=1', request.url))
  } catch (error) {
    console.error('auth/verify: vérification impossible', error)
    return echec
  }
}
