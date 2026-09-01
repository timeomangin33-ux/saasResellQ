/**
 * Vérification du robot, en une commande.
 *
 * `npm run bot:check`
 *
 * Interroge Vinted pour de vrai et affiche ce qui revient, champ par champ.
 * C'est le test qui répond à la seule question qui compte : est-ce que le
 * robot lit Vinted, maintenant, depuis cette machine ? Un changement chez
 * Vinted, une IP filtrée ou une session expirée se voient ici immédiatement.
 */

import { chargerEnv } from './charger-env'

chargerEnv()

async function principal() {
  const { runVintedBotScan } = await import('../lib/vinted-bot')
  const { etatSession } = await import('../lib/vinted/session')

  console.log('Interrogation de Vinted…\n')
  const scan = await runVintedBotScan({ query: 'nike', perPage: 96 })

  console.log(`Source        : ${scan.source}`)
  console.log(`Annonces      : ${scan.items.length}`)
  console.log(`Durée         : ${scan.durationMs} ms`)
  console.log(`Session       : ${JSON.stringify(etatSession())}`)
  console.log(`Message       : ${scan.message}\n`)

  if (!scan.success) {
    console.error(`ÉCHEC (${scan.failure?.cause}) : ${scan.failure?.detail}`)
    process.exit(1)
  }

  const premiere = scan.items[0]
  console.log('Première annonce lue :')
  console.log(JSON.stringify(premiere, null, 2))

  // Un champ vide sur toute la page signale une régression : Vinted a changé
  // un nom de champ et l'extraction rend des lignes creuses sans le dire.
  const controles: [string, number][] = [
    ['titre', scan.items.filter((i) => i.title.trim().length > 1).length],
    ['prix > 0', scan.items.filter((i) => i.price > 0).length],
    ['marque', scan.items.filter((i) => i.brand && i.brand !== 'Sans marque').length],
    ['image', scan.items.filter((i) => i.image).length],
    ['url', scan.items.filter((i) => i.url.includes('/items/')).length],
    ['état', scan.items.filter((i) => i.condition).length],
    ['vendeur', scan.items.filter((i) => i.sellerLogin).length],
    ['date de mise en ligne', scan.items.filter((i) => i.listedAt).length],
  ]

  console.log('\nRemplissage des champs :')
  let manquants = 0
  for (const [nom, compte] of controles) {
    const part = Math.round((compte / scan.items.length) * 100)
    const ok = part >= 80
    if (!ok) manquants += 1
    console.log(`  ${ok ? '✓' : '✗'} ${nom.padEnd(24)} ${compte}/${scan.items.length} (${part} %)`)
  }

  const doublons = scan.items.length - new Set(scan.items.map((i) => i.id)).size
  console.log(`  ${doublons === 0 ? '✓' : '✗'} ${'sans doublon'.padEnd(24)} ${doublons} doublon(s)`)

  if (manquants > 0 || doublons > 0) {
    console.error('\nDes champs sont mal remplis : l\'extraction a probablement régressé.')
    process.exit(1)
  }

  console.log('\nLe robot lit Vinted correctement.')
}

principal().catch((err) => {
  console.error('Vérification impossible :', err)
  process.exit(1)
})
