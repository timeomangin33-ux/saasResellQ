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
        ? `${c.annonces} annonces · ${c.pages} pages · ${c.recentes} récentes · ` +
          `${c.zonesFiables}/${c.zones} tranches entières · ${c.verifiees} vérifiées (${c.plusEnVente} plus en vente)`
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
      category: true, medianPrice: true, p25Price: true, p75Price: true, volumeActive: true,
      trendDirection: true, priceChangePercent: true, historyDays: true, confidence: true,
      publishable: true, sellThroughRate: true, sellThroughSample: true,
    },
  })
  console.log('\nCatégorie              médian   fourchette   suivies  tendance  hist  fiabilité     rotation')
  for (const m of marches) {
    const fourchette =
      m.p25Price === null || m.p75Price === null ? '—' : `${Math.round(m.p25Price)}-${Math.round(m.p75Price)} €`
    console.log(
      `${m.category.padEnd(22)} ${String(Math.round(m.medianPrice ?? 0)).padStart(5)}€ ` +
        `${fourchette.padStart(12)} ${String(m.volumeActive ?? 0).padStart(8)}  ` +
        `${(m.trendDirection ?? '-').padEnd(9)} ${String(m.historyDays ?? 0).padStart(2)}j ` +
        `${(m.confidence ?? '-').padEnd(13)} ` +
        `${m.sellThroughRate === null ? `— (${m.sellThroughSample ?? 0} vérif.)` : Math.round(m.sellThroughRate * 100) + '%'}`,
    )
  }
  await prisma.$disconnect()

  // Un tour où *toutes* les cibles ont échoué rendait malgré tout le code 0.
  // En local on le voit, puisqu'on lit la sortie ; lancé par un planificateur,
  // ça donne une exécution verte qui n'a rien collecté — exactement la panne
  // muette qu'on cherche à éviter. Un échec partiel, lui, reste normal : une
  // cible peut échouer pendant que les autres passent.
  if (bilan.cibles.length > 0 && bilan.echecs === bilan.cibles.length) {
    console.error(
      `\nAucune cible n'est passée : ${bilan.echecs} échec(s) sur ${bilan.cibles.length}. ` +
        `La cause de chacune est indiquée ci-dessus.`,
    )
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
