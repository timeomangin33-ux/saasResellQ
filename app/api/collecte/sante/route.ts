import { NextResponse } from 'next/server'
import { etatDeLaCollecte } from '@/lib/vinted/sante'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * L'état de la collecte, pour l'afficher dans l'interface.
 *
 * Ouvert à tout compte connecté, y compris gratuit : savoir si les chiffres
 * qu'on regarde sont frais n'est pas une fonctionnalité premium, c'est la
 * condition pour leur faire confiance.
 */
export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const sante = await etatDeLaCollecte()

  // 200 même quand la collecte est arrêtée : l'information est correctement
  // rendue, c'est la collecte qui va mal. Le client lit `statut`.
  return NextResponse.json(sante)
}
