/**
 * Crée la file de collecte à partir des catégories Vinted connues.
 *
 * `npm run targets:seed`
 *
 * Idempotent : relancer n'écrase aucun réglage déjà fait à la main (fréquence,
 * priorité, cible désactivée). Le collecteur l'appelle aussi de lui-même au
 * démarrage ; cette commande sert à préparer la base avant le premier lancement
 * ou à vérifier ce qui est planifié.
 */

import { chargerEnv } from './charger-env'

chargerEnv()

async function principal() {
  const { amorcerCibles } = await import('../lib/vinted/collector')
  const { prisma } = await import('../prisma')

  const creees = await amorcerCibles()
  console.log(creees > 0 ? `${creees} cible(s) créée(s).` : 'La file contient déjà des cibles : rien à créer.')

  const cibles = await prisma.collectTarget.findMany({ orderBy: [{ priority: 'desc' }, { query: 'asc' }] })
  console.log(`\n${cibles.length} cible(s) dans la file :\n`)
  for (const c of cibles) {
    const etat = c.enabled ? (c.lastStatus ?? 'jamais lancée') : 'désactivée'
    const quand = c.nextRunAt ? c.nextRunAt.toISOString().slice(0, 16).replace('T', ' ') : 'dès que possible'
    console.log(
      `  ${c.query.padEnd(24)} toutes les ${String(c.intervalMinutes).padStart(4)} min  ` +
        `prochain : ${quand}  état : ${etat}${c.lastItemCount !== null ? ` (${c.lastItemCount} annonces)` : ''}`,
    )
  }

  await prisma.$disconnect()
}

principal().catch((err) => {
  console.error('Amorçage impossible :', err)
  process.exit(1)
})
