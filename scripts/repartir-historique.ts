/**
 * Efface l'historique quotidien et force un balayage sur toutes les catégories.
 *
 *   npm run history:reset
 *
 * À n'utiliser qu'après un changement de *méthode* de mesure, et c'est
 * exactement le cas ici. Les points enregistrés jusqu'à aujourd'hui étaient la
 * médiane des 96 dernières annonces mises en ligne ; ceux d'après sont la
 * médiane d'un échantillon réparti sur toute l'échelle des prix. Les deux sont
 * cohérents chacun de leur côté, et incomparables entre eux : garder la série
 * telle quelle produirait, au moment de la bascule, une « tendance » de
 * plusieurs centaines de pour cent qui ne décrirait que le changement d'outil.
 *
 * Le prix à payer est assumé : les tendances repartent à « pas encore
 * mesurable » et le redeviennent au bout de dix jours. C'est le seul choix
 * honnête — une flèche fondée sur deux méthodes différentes est pire que pas
 * de flèche du tout.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const { prisma } = await import('../prisma')

  const { count: points } = await prisma.categoryMarketDaily.deleteMany({})
  const { count: marches } = await prisma.categoryMarket.updateMany({
    data: {
      trendDirection: 'inconnue',
      priceChangePercent: null,
      volumeChangePercent: null,
      historyDays: 0,
      confidence: 'insuffisant',
      publishable: false,
      qualityNote: "Mesure repartie de zéro après changement de méthode de relevé.",
      avgPrice: null,
      medianPrice: null,
    },
  })
  // Balayage dû immédiatement partout : c'est lui qui reconstruit les prix de
  // référence, et sans lui les catégories resteraient sans médiane.
  const { count: cibles } = await prisma.collectTarget.updateMany({
    data: {
      lastSweepAt: null,
      nextRunAt: new Date(),
      sweepCursor: 0,
      // Les cibles créées avant le découpage par tranches portaient un budget
      // de 15 à 25 pages, pensé pour une pagination unique. Réparti sur dix
      // tranches, ça ne fait plus que deux pages par tranche : on ne verrait
      // que le haut de chaque intervalle et l'échantillon serait aussi biaisé
      // qu'avant, pour une raison différente.
      sweepMaxPages: 70,
    },
  })

  console.log(`${points} point(s) d'historique effacé(s).`)
  console.log(`${marches} catégorie(s) remise(s) à « pas encore mesurable ».`)
  console.log(`${cibles} cible(s) programmée(s) pour un balayage immédiat.`)
  console.log(`\nLancez maintenant : npm run collect:once -- 1200`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
