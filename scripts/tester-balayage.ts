/**
 * Vérifie qu'un balayage par tranches de prix fonctionne réellement, contre
 * Vinted, et qu'il conclut ce qu'il prétend conclure.
 *
 *   npm run sweep:test -- "Sneakers"
 *
 * Ce que ce script prouve, et qu'aucun test unitaire ne peut prouver : que le
 * découpage franchit le plafond des 960 résultats par recherche, que Vinted ne
 * bloque pas au bout de plusieurs dizaines de requêtes rapprochées, et surtout
 * quelles tranches de prix ont été vues *en entier* — les seules où l'absence
 * d'une annonce autorisera plus tard à dire qu'elle est partie.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const [recherche = 'Sneakers', budget = '70'] = process.argv.slice(2)

  const { balayerParTranches, PLAFOND_RESULTATS } = await import('../lib/vinted/api')

  console.log(`Balayage par tranches de prix : « ${recherche} », budget ${budget} pages.\n`)
  const debut = Date.now()
  const r = await balayerParTranches({
    searchText: recherche,
    budgetPages: Number(budget),
  })
  const duree = Date.now() - debut

  const fiables = r.zones.filter((z) => z.exhaustive)
  const prix = r.items.map((a) => a.price).sort((a, b) => a - b)
  const mediane = prix.length > 0 ? prix[Math.floor(prix.length / 2)] : null

  console.log('Tranche          Annonces   Vue en entier')
  for (const z of r.zones) {
    const nom = `${z.from}-${z.to} €`.padEnd(16)
    console.log(`${nom} ${String(z.annonces).padStart(8)}   ${z.exhaustive ? 'oui' : 'NON (saturée)'}`)
  }

  console.log(`\nPages lues           : ${r.pagesLues}`)
  console.log(`Annonces uniques     : ${r.items.length}`)
  console.log(`Plafond d'une seule recherche : ${PLAFOND_RESULTATS}`)
  console.log(`Gain sur le plafond  : x${(r.items.length / PLAFOND_RESULTATS).toFixed(1)}`)
  console.log(`Tranches fiables     : ${fiables.length}/${r.zones.length}`)
  console.log(`Fourchette de prix   : ${prix[0]} € → ${prix[prix.length - 1]} €`)
  console.log(`Prix médian demandé  : ${mediane} €`)
  console.log(`Durée                : ${(duree / 1000).toFixed(1)} s`)
  console.log(`Prochain départ      : tranche n°${r.prochainDepart}`)
  if (r.interrompuPar) console.log(`Interrompu par       : ${r.interrompuPar.message}`)

  const invalides = r.items.filter((a) => !a.title || !a.url || !a.id).length
  console.log(`Annonces valides     : ${r.items.length - invalides}/${r.items.length}`)

  // Le vrai critère : sans une seule tranche vue en entier, le balayage ne peut
  // rien conclure sur les disparitions, donc la rotation reste non mesurable.
  process.exit(r.items.length > 0 && fiables.length > 0 && invalides === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('Balayage impossible :', err instanceof Error ? err.message : err)
  process.exit(1)
})
