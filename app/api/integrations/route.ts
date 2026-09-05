import { NextResponse } from 'next/server'
import { authorizeAuthenticatedUser } from '@/lib/access-control'
import { assistantIADisponible, etatDesIntegrations, integrationConfiguree } from '@/lib/integrations'

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

  const etats = etatDesIntegrations()
  const manquantes = etats.filter((i) => !i.configuree)

  return NextResponse.json({
    manquantes: manquantes.map(({ nom, consequence }) => ({ nom, consequence })),
    // Le menu s'en sert pour masquer les fonctions qui ne peuvent pas
    // repondre. Proposer un « Assistant IA » qui debite des credits et repond
    // « momentanement indisponible » coute la confiance de celui qui l'essaie,
    // et le compteur ne se recharge pas tout seul.
    fonctions: {
      assistantIA: assistantIADisponible(),
      notation: integrationConfiguree('OPENAI_API_KEY'),
      emails: integrationConfiguree('RESEND_API_KEY'),
      comptesVinted: integrationConfiguree('VINTED_COOKIE_SECRET'),
    },
  })
}
