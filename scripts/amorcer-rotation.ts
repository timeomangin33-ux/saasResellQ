/**
 * Amorce la mesure de rotation sur toutes les catégories suivies.
 *
 *   npm run rotation:seed
 *
 * En régime normal, le collecteur vérifie une quinzaine d'annonces par
 * catégorie à chaque balayage, et la mesure se constitue toute seule en
 * quelques jours. Ce script fait la même chose d'un coup, pour ne pas attendre
 * une semaine avant d'avoir un premier chiffre — la base contient déjà des
 * milliers d'annonces vues il y a sept à dix jours, qui n'attendent que d'être
 * relues.
 *
 * Il est volontairement lent : une page d'annonce pèse deux mégaoctets, et cinq
 * cents requêtes rapprochées vers Vinted ressemblent beaucoup plus à un
 * aspirateur qu'à un visiteur. Comptez une vingtaine de minutes.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const objectif = Number(process.argv[2] ?? 35)
  const { prisma } = await import('../prisma')
  const { verifierCohorte } = await import('../lib/vinted/verification')
  const { mesurerRotation } = await import('../lib/vinted/rotation')

  const categories = await prisma.collectTarget.findMany({
    where: { enabled: true },
    orderBy: { priority: 'desc' },
    select: { query: true },
  })

  console.log(`Amorçage de la rotation sur ${categories.length} catégorie(s), ${objectif} annonces chacune.\n`)

  for (const { query } of categories) {
    const bilan = await verifierCohorte(query, { vendeurs: objectif })
    const rotation = await mesurerRotation(query)
    const taux = rotation.taux === null ? 'pas encore' : `${Math.round(rotation.taux * 100)} %`
    console.log(
      `${query.padEnd(20)} ${String(bilan.vendeurs).padStart(3)} penderies · ${String(bilan.verifiees).padStart(3)} vérifiées · ` +
        `${String(bilan.parties).padStart(3)} plus en vente · ` +
        `${String(bilan.indeterminees).padStart(2)} indéterminées · ` +
        `rotation ${taux} (cohorte ${rotation.cohorte})` +
        (bilan.erreur ? ` · ARRÊT : ${bilan.erreur}` : ''),
    )
    // Un blocage sur une catégorie vaut pour les suivantes : inutile d'insister.
    if (bilan.erreur) {
      console.error('\nVinted a coupé la série. Relancez ce script plus tard : les annonces déjà vérifiées sont gardées.')
      break
    }
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Amorçage impossible :', err instanceof Error ? err.message : err)
  process.exit(1)
})
