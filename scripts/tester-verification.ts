/**
 * Vérifie que la mesure « est-ce que ça se vend » fonctionne réellement.
 *
 *   npm run rotation:test -- "Sneakers" 8
 *
 * Elle relit la page de quelques annonces vues il y a une semaine et regarde ce
 * que Vinted en dit : supprimée, clôturée, retirée, ou toujours en ligne. C'est
 * la seule mesure de rotation possible — Vinted ne publie aucune transaction —
 * et la seule qui résiste au plafond de 960 résultats par recherche.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const [categorie = 'Sneakers', taille = '8'] = process.argv.slice(2)
  const { prisma } = await import('../prisma')
  const { verifierCohorte } = await import('../lib/vinted/verification')
  const { mesurerRotation } = await import('../lib/vinted/rotation')

  const eligibles = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "products"
    WHERE category = ${categorie}
      AND "sellerId" IS NOT NULL
      AND "checkedAt" IS NULL
      AND "createdAt" <= NOW() - INTERVAL '7 days'
      AND "createdAt" >  NOW() - INTERVAL '10 days'
  `
  console.log(`Catégorie « ${categorie} » : ${Number(eligibles[0]?.n ?? 0)} annonce(s) éligible(s) à la vérification.\n`)

  const bilan = await verifierCohorte(categorie, { vendeurs: Number(taille) })
  console.log(`Penderies lues   : ${bilan.vendeurs}`)
  console.log(`Vérifiées        : ${bilan.verifiees}`)
  console.log(`Toujours en ligne: ${bilan.enLigne}`)
  console.log(`Plus en vente    : ${bilan.parties}`)
  console.log(`Indéterminées    : ${bilan.indeterminees}`)
  console.log(`Durée            : ${(bilan.dureeMs / 1000).toFixed(1)} s`)
  if (bilan.erreur) console.log(`Erreur           : ${bilan.erreur}`)

  const rotation = await mesurerRotation(categorie)
  console.log(`\nRotation : ${rotation.explication}`)

  await prisma.$disconnect()
  process.exit(bilan.verifiees > 0 && bilan.indeterminees < bilan.verifiees ? 0 : 1)
}

main().catch((err) => {
  console.error('Vérification impossible :', err instanceof Error ? err.message : err)
  process.exit(1)
})
