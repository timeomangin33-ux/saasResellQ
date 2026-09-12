import { chargerEnv } from './charger-env'

/**
 * Verifie que le detail d'une marque arrive bien jusqu'a la page.
 *
 * Le detail par etat et par categorie est desormais calcule pour toutes les
 * marques d'un coup, puis retrouve par cle. Si la cle ne correspond pas a ce
 * que renvoie LOWER(brand), les deux tableaux se vident sans qu'aucune erreur
 * ne soit levee : la page s'affiche, simplement amputee. Ce script existe pour
 * que cette panne-la se voie.
 */
async function main() {
  chargerEnv()
  const { marquesPubliables, statistiquesMarque } = await import('../lib/prix-public')
  const marques = await marquesPubliables()
  console.log(`Marques publiables : ${marques.length}`)

  const aVerifier = marques.slice(0, 5)
  let vides = 0

  for (const marque of aVerifier) {
    const stats = await statistiquesMarque(marque.slug)
    if (!stats) {
      console.log(`  ${marque.slug} : introuvable`)
      vides += 1
      continue
    }
    const etats = stats.parEtat.length
    const categories = stats.parCategorie.length
    if (etats === 0 || categories === 0) vides += 1
    console.log(
      `  ${stats.slug} : ${stats.annonces} annonces, median ${stats.prixMedian} EUR, ` +
        `${etats} etat(s), ${categories} categorie(s), favoris ${stats.partAvecFavori ?? 'non mesure'}`
    )
  }

  if (vides > 0) {
    console.error(`\n${vides} marque(s) sans detail : la cle ne correspond pas.`)
    process.exit(1)
  }
  console.log('\nDetail present sur toutes les marques testees.')
}

main()
  .catch((erreur) => {
    console.error(erreur)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import('../prisma')
    await prisma.$disconnect()
  })
