/**
 * Recalcule les notes d'opportunité de toutes les catégories.
 *
 *   npm run score:refresh
 *
 * La notation se refait normalement à chaque passage du collecteur. Ce script
 * sert quand la *règle* de notation change : sans lui, il faudrait attendre que
 * chaque catégorie repasse pour que l'ancienne règle cesse d'être visible, et
 * pendant ce temps le tableau de bord mélange les deux.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const { prisma } = await import('../prisma')
  const { noterCategorie } = await import('../lib/vinted/scoring-marche')

  const marches = await prisma.categoryMarket.findMany({
    orderBy: { volumeActive: 'desc' },
    select: { category: true, medianPrice: true, volumeActive: true },
  })

  for (const m of marches) {
    const bilan = await noterCategorie(m.category, m.medianPrice, m.volumeActive ?? 0)
    console.log(
      `${m.category.padEnd(20)} ${String(bilan.notes).padStart(6)} annonce(s) notée(s)` +
        (bilan.ignore ? ` — ignorée : ${bilan.ignore}` : ''),
    )
  }

  // Ce que le tableau de bord montrera en tête : la vérification qui compte,
  // puisque c'est la ligne qu'un visiteur lit en premier.
  const top = await prisma.$queryRaw<
    { title: string; brand: string | null; category: string; price: number; margin: number | null; gain: number | null }[]
  >`
    SELECT title, brand, category, price,
           "profitMargin" AS margin,
           ("profitMargin" / 100.0) * price AS gain
    FROM products
    WHERE status = 'active' AND "analysisScore" IS NOT NULL
    ORDER BY "analysisScore" DESC NULLS LAST, "profitMargin" DESC NULLS LAST
    LIMIT 8
  `
  console.log('\nTête de liste après notation :')
  for (const t of top) {
    console.log(
      `  ${(t.brand ?? 'sans marque').padEnd(14)} ${String(Math.round(t.price)).padStart(4)} € → ` +
        `+${String(Math.round(t.gain ?? 0)).padStart(4)} € (${Math.round(t.margin ?? 0)} %)  ` +
        `${t.category.padEnd(16)} ${t.title.slice(0, 46)}`,
    )
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
