/**
 * Un seul tour de collecte, à la main.
 *
 *   npm run collect:once -- 240
 *
 * Sert après un changement de code : plutôt que d'attendre que le collecteur
 * permanent repasse sur chaque catégorie, on force un tour et on lit le bilan
 * tout de suite. Le scoring IA est coupé par défaut — il n'a rien à voir avec
 * la collecte et ne ferait qu'ajouter des appels payants à une vérification.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const secondes = Number(process.argv[2] ?? 240)
  const { passerUnTour } = await import('../lib/vinted/collector')
  const { prisma } = await import('../prisma')

  const bilan = await passerUnTour({ budgetMs: secondes * 1000, scoring: false })

  for (const c of bilan.cibles) {
    const detail =
      c.mode === 'balayage'
        ? `${c.annonces} annonces · ${c.pages} pages · ${c.zonesFiables}/${c.zones} tranches entières · ` +
          `${c.verifiees} vérifiées (${c.plusEnVente} plus en vente)`
        : `${c.annonces} annonces`
    console.log(`${c.statut === 'ok' ? '✓' : '✗'} ${c.mode.padEnd(9)} ${c.query.padEnd(20)} ${detail}`)
    // Un échec sans sa cause oblige à relancer pour apprendre quelque chose.
    if (c.erreur) console.log(`   └─ ${c.statut} : ${c.erreur}`)
  }
  console.log(
    `\n${bilan.cibles.length} cible(s) · ${bilan.annoncesCollectees} annonces · ` +
      `${bilan.balayages} balayage(s) · ${bilan.echecs} échec(s) · ${bilan.degrade ? 'DÉGRADÉ' : 'ok'}`,
  )

  const marches = await prisma.categoryMarket.findMany({
    orderBy: { volumeActive: 'desc' },
    select: {
      category: true, medianPrice: true, volumeActive: true, trendDirection: true,
      priceChangePercent: true, historyDays: true, confidence: true, publishable: true,
      sellThroughRate: true, sellThroughSample: true,
    },
  })
  console.log('\nCatégorie              médian  actives  tendance     hist  fiabilité     publiable  rotation')
  for (const m of marches) {
    console.log(
      `${m.category.padEnd(22)} ${String(Math.round(m.medianPrice ?? 0)).padStart(5)}€ ` +
        `${String(m.volumeActive ?? 0).padStart(7)}  ${(m.trendDirection ?? '-').padEnd(9)} ` +
        `${String(m.priceChangePercent === null ? '' : m.priceChangePercent.toFixed(1)).padStart(5)} ` +
        `${String(m.historyDays ?? 0).padStart(4)}j ${(m.confidence ?? '-').padEnd(12)} ` +
        `${m.publishable ? 'oui' : 'non'}        ` +
        `${m.sellThroughRate === null ? `— (${m.sellThroughSample ?? 0})` : Math.round(m.sellThroughRate * 100) + '%'}`,
    )
  }
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
