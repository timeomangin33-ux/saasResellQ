/**
 * Force un balayage sur une ou plusieurs catégories précises.
 *
 *   npm run sweep -- "Bijoux" "Vintage"
 *   npm run sweep                        (toutes celles sans prix de référence)
 *
 * Le collecteur permanent espace ses balayages d'un quart d'heure pour ne pas
 * se faire freiner par Vinted. C'est le bon réglage en régime établi, mais il
 * rend l'amorçage lent : quinze catégories demandent presque quatre heures. Ce
 * script fait le même travail sur les catégories qu'on lui nomme, avec une
 * pause explicite entre chacune — assez pour rester sous le seuil, assez peu
 * pour finir un amorçage dans la soirée.
 *
 * Il s'arrête net au premier refus de Vinted. Insister pendant qu'on est filtré
 * ne ramène rien et allonge le filtrage.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

/** Pause entre deux catégories. Mesuré : onze balayages en 40 min => HTTP 429. */
const PAUSE_MS = 3 * 60_000

async function main() {
  const { prisma } = await import('../prisma')
  const { balayerCategorie } = await import('../lib/vinted/balayage')

  let categories = process.argv.slice(2)
  if (categories.length === 0) {
    // Par défaut : celles dont le prix de référence manque encore. C'est le cas
    // d'usage réel — finir un amorçage — et ça évite de retaper les noms.
    const manquantes = await prisma.categoryMarket.findMany({
      where: { OR: [{ medianPrice: null }, { medianPrice: 0 }] },
      orderBy: { volumeActive: 'desc' },
      select: { category: true },
    })
    categories = manquantes.map((m) => m.category)
  }

  if (categories.length === 0) {
    console.log('Toutes les catégories ont déjà un prix de référence.')
    await prisma.$disconnect()
    return
  }

  console.log(`Balayage de ${categories.length} catégorie(s) : ${categories.join(', ')}\n`)

  for (const [index, categorie] of categories.entries()) {
    const bilan = await balayerCategorie({ query: categorie, category: categorie })
    const marche = await prisma.categoryMarket.findUnique({
      where: { category: categorie },
      select: { medianPrice: true, p25Price: true, p75Price: true, priceSample: true },
    })

    console.log(
      `${bilan.statut === 'ok' ? '✓' : '✗'} ${categorie.padEnd(20)} ` +
        `${bilan.annoncesVues} annonces · ${bilan.recentes} récentes · ` +
        `médiane ${marche?.medianPrice ?? '—'} € ` +
        `(${marche?.p25Price ?? '—'}–${marche?.p75Price ?? '—'} €, ${marche?.priceSample ?? 0} relevés) · ` +
        `${Math.round(bilan.dureeMs / 1000)} s` +
        (bilan.erreur ? `\n   └─ ${bilan.statut} : ${bilan.erreur}` : ''),
    )

    if (bilan.statut === 'blocked' || bilan.statut === 'auth') {
      console.error('\nVinted refuse. On s’arrête ici ; relancez plus tard, le travail déjà fait est gardé.')
      break
    }

    if (index < categories.length - 1) {
      console.log(`   … pause de ${PAUSE_MS / 60_000} min`)
      await new Promise((r) => setTimeout(r, PAUSE_MS))
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
