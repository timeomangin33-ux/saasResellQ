import { chargerEnv } from './charger-env'

/**
 * Ou en est la mesure des tendances, categorie par categorie.
 *
 * `npm run collect:status` affiche « inconnue » partout sans dire pourquoi :
 * historique trop court, trop peu de points dans la fenetre, ou ecart sous le
 * seuil d'entree. La difference compte, parce que la premiere se resorbe toute
 * seule avec les jours qui passent et que les autres non.
 */
async function main() {
  chargerEnv()
  const { prisma } = await import('../prisma')
  const { calculerTendance } = await import('../lib/vinted/tendance')

  const marches = await prisma.categoryMarket.findMany({
    orderBy: { volumeActive: 'desc' },
    select: { category: true, trendDirection: true, historyDays: true, confidence: true, publishable: true },
  })

  console.log('CATEGORIE'.padEnd(22) + 'JOURS  DIRECTION   CALCUL')
  for (const marche of marches) {
    const calcul = await calculerTendance(marche.category, marche.trendDirection ?? undefined)
    console.log(
      marche.category.padEnd(22) +
        String(marche.historyDays ?? 0).padStart(5) +
        '  ' +
        (marche.trendDirection ?? '-').padEnd(11) +
        calcul.direction.padEnd(10) +
        `${calcul.historyDays} pt(s) — ${calcul.explication}`
    )
  }

  await prisma.$disconnect()
}

main().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})
