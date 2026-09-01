/**
 * L'état de la collecte, en une commande.
 *
 * `npm run collect:status`
 *
 * Répond aux trois questions qu'on se pose devant un robot qui tourne :
 * combien d'annonces sont en base, quelles cibles échouent, et depuis combien
 * de temps les chiffres n'ont pas bougé. Un tableau qui se fige est le
 * symptôme le plus courant — et le plus difficile à voir sans regarder.
 */

import { chargerEnv } from './charger-env'

chargerEnv()

function ilYA(date: Date | null | undefined) {
  if (!date) return 'jamais'
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 48) return `il y a ${heures} h`
  return `il y a ${Math.round(heures / 24)} j`
}

async function principal() {
  const { prisma } = await import('../prisma')

  const [total, actifs, perimes, avecVendeur, avecDate, avecScore] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.product.count({ where: { status: 'stale' } }),
    prisma.product.count({ where: { seller: { not: null } } }),
    prisma.product.count({ where: { listedAt: { not: null } } }),
    prisma.product.count({ where: { analysisScore: { not: null } } }),
  ])

  console.log('ANNONCES EN BASE')
  console.log(`  total                 ${total}`)
  console.log(`  actives               ${actifs}`)
  console.log(`  périmées              ${perimes}`)
  console.log(`  avec vendeur          ${avecVendeur} (${pourcent(avecVendeur, total)})`)
  console.log(`  avec date Vinted      ${avecDate} (${pourcent(avecDate, total)})`)
  console.log(`  avec note d'opportunité ${avecScore} (${pourcent(avecScore, total)})`)

  const derniere = await prisma.product.findFirst({
    where: { lastSeenAt: { not: null } },
    orderBy: { lastSeenAt: 'desc' },
    select: { lastSeenAt: true },
  })
  console.log(`  dernière écriture     ${ilYA(derniere?.lastSeenAt)}`)

  const cibles = await prisma.collectTarget.findMany({ orderBy: [{ lastRunAt: 'desc' }] })
  console.log(`\nFILE DE COLLECTE (${cibles.length} cible(s))`)
  for (const c of cibles) {
    const etat = !c.enabled ? 'désactivée' : (c.lastStatus ?? 'jamais lancée')
    const marque = etat === 'ok' ? '✓' : etat === 'jamais lancée' ? '·' : '✗'
    console.log(
      `  ${marque} ${c.query.padEnd(22)} ${String(c.lastItemCount ?? '-').padStart(4)} annonces  ` +
        `${ilYA(c.lastRunAt).padEnd(14)} ${etat}${c.consecutiveFailures > 0 ? ` (${c.consecutiveFailures} échec(s) d'affilée)` : ''}`,
    )
    if (c.lastError) console.log(`      ${c.lastError.slice(0, 160)}`)
  }

  const marches = await prisma.categoryMarket.findMany({ orderBy: { volumeActive: 'desc' }, take: 20 })
  console.log(`\nMARCHÉ PAR CATÉGORIE (${marches.length})`)
  for (const m of marches) {
    console.log(
      `  ${m.category.padEnd(22)} ${String(m.volumeActive ?? 0).padStart(5)} actives  ` +
        `moyenne ${(m.avgPrice ?? 0).toFixed(2).padStart(7)} €  médiane ${(m.medianPrice ?? 0).toFixed(2).padStart(7)} €  ` +
        `${m.trendDirection ?? 'stable'}  analysé ${ilYA(m.lastAnalyzedAt)}`,
    )
  }

  const passages = await prisma.automationJob.findMany({
    where: { jobType: 'market-refresh' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  console.log(`\n5 DERNIERS PASSAGES`)
  for (const p of passages) {
    console.log(`  ${p.status === 'completed' ? '✓' : '✗'} ${ilYA(p.lastRunAt ?? p.createdAt).padEnd(14)} ${p.result ?? ''}`)
    if (p.error) console.log(`      ${p.error.slice(0, 200)}`)
  }

  await prisma.$disconnect()
}

function pourcent(part: number, total: number) {
  if (total === 0) return '0 %'
  return `${Math.round((part / total) * 100)} %`
}

principal().catch((err) => {
  console.error('Lecture de l\'état impossible :', err)
  process.exit(1)
})
