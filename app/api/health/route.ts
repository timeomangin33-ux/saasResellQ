import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { etatDeLaCollecte } from '@/lib/vinted/sante'

export const dynamic = 'force-dynamic'

/**
 * Sonde de supervision.
 *
 * Elle ne répondait « ok » que sur la base de données. Or une base en parfait
 * état qui contient des annonces vieilles de cinq jours n'est pas un service
 * en bon état : c'est exactement la panne qu'on a eue, et cette sonde l'aurait
 * déclarée verte. Un service dont la donnée est périmée est dégradé.
 */
export async function GET() {
  const debut = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    return NextResponse.json(
      {
        status: 'down',
        service: 'resellq',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 503 },
    )
  }

  const collecte = await etatDeLaCollecte().catch(() => null)

  // « arretee » est une dégradation réelle du service : la sonde le dit, pour
  // qu'un outil de supervision externe puisse s'en saisir.
  const degrade = collecte === null || collecte.statut === 'arretee' || collecte.statut === 'jamais-demarree'

  return NextResponse.json(
    {
      status: degrade ? 'degraded' : 'ok',
      service: 'resellq',
      timestamp: new Date().toISOString(),
      database: 'ok',
      latenceMs: Date.now() - debut,
      collecte: collecte
        ? {
            statut: collecte.statut,
            ageMinutes: collecte.ageMinutes,
            derniereEcriture: collecte.derniereEcriture,
            annoncesActives: collecte.annoncesActives,
            categoriesSuivies: collecte.categoriesSuivies,
            ciblesEnEchec: collecte.ciblesEnEchec.length,
            message: collecte.message,
          }
        : { statut: 'inconnu', message: "L'état de la collecte n'a pas pu être lu." },
    },
    { status: degrade ? 503 : 200 },
  )
}
