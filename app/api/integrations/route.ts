import { NextResponse } from 'next/server'
import { authorizeAuthenticatedUser } from '@/lib/access-control'
import { etatDesIntegrations } from '@/lib/integrations'

export const dynamic = 'force-dynamic'

/**
 * Ce qui n'est pas branché, dit à ceux qui utilisent le produit.
 *
 * Réservé aux comptes connectés : c'est une information d'exploitation, pas
 * un argument commercial. Aucune valeur de clé n'est renvoyée, seulement le
 * fait qu'elle soit posée ou non.
 */
export async function GET(request: Request) {
  const acces = await authorizeAuthenticatedUser(request)
  if ('response' in acces) return acces.response

  const manquantes = etatDesIntegrations().filter((i) => !i.configuree)
  return NextResponse.json({
    manquantes: manquantes.map(({ nom, consequence }) => ({ nom, consequence })),
  })
}
