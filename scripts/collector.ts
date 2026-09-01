/**
 * Le collecteur permanent.
 *
 * Le cron Vercel passe une fois par déclenchement, avec soixante secondes en
 * tout : de quoi rafraîchir quelques catégories, pas de quoi tenir un marché à
 * jour. Ce script fait tourner exactement le même moteur, mais sans limite de
 * durée — il prend la cible la plus en retard, la traite, replanifie, et
 * recommence. Un revendeur voit alors le marché bouger dans la journée, pas
 * une photo prise à 6 h du matin.
 *
 * Lancement :
 *   npm run collector
 *
 * Il tourne aussi bien sur un PC allumé que sur un petit serveur. Il écrit
 * dans la même base Neon que le site : l'un collecte, l'autre affiche.
 *
 * Arrêt propre : Ctrl+C. La cible en cours est terminée avant de rendre la
 * main, pour ne pas laisser une écriture à moitié faite.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chargerEnv } from './charger-env'

chargerEnv()

/**
 * Un seul collecteur par machine.
 *
 * Le lanceur `.cmd` relance le collecteur quand il s'arrête, et le raccourci
 * de démarrage en lance un à l'ouverture de session : lancer le script à la
 * main par-dessus donnait deux collecteurs sur la même machine. La réservation
 * en base empêche qu'ils traitent la même cible, donc rien ne cassait — mais
 * deux processus consommaient le double de mémoire et de requêtes vers Vinted
 * pour le même résultat, sans que rien ne le signale.
 *
 * Le verrou est un fichier hors du dossier de l'utilisateur, contenant le PID.
 * Un PID mort n'empêche personne de démarrer : c'est ce qui rend le verrou
 * inoffensif après une coupure de courant.
 */
const VERROU = path.join(os.tmpdir(), 'resellq-collecteur.lock')

function processusVivant(pid: number) {
  try {
    // Le signal 0 ne fait rien : il vérifie seulement que le processus existe
    // et qu'on a le droit de lui parler.
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function prendreLeVerrou(): boolean {
  if (existsSync(VERROU)) {
    const pid = Number(readFileSync(VERROU, 'utf8').trim())
    if (Number.isFinite(pid) && pid > 0 && pid !== process.pid && processusVivant(pid)) {
      console.error(
        `Un collecteur tourne déjà sur cette machine (PID ${pid}).\n` +
          `Fermez-le avant d'en lancer un autre, ou supprimez ${VERROU} s'il est bloqué.`,
      )
      return false
    }
  }
  writeFileSync(VERROU, String(process.pid), 'utf8')
  return true
}

function rendreLeVerrou() {
  try {
    if (existsSync(VERROU) && readFileSync(VERROU, 'utf8').trim() === String(process.pid)) {
      unlinkSync(VERROU)
    }
  } catch {
    // Un verrou qu'on n'arrive pas à effacer sera ignoré au prochain démarrage,
    // puisque le PID qu'il contient sera mort.
  }
}

async function principal() {
  if (!prendreLeVerrou()) {
    // Code 3 : ni succès ni panne, « il y en a déjà un ». Le lanceur .cmd
    // reconnaît ce code et arrête sa boucle, au lieu de relancer toutes les
    // trente secondes un processus qui refusera de démarrer.
    process.exit(3)
  }
  process.on('exit', rendreLeVerrou)

  const { passerUnTour, amorcerCibles } = await import('../lib/vinted/collector')
  const { prisma } = await import('../prisma')
  const { etatSession } = await import('../lib/vinted/session')

  let arretDemande = false
  const arreter = (signal: string) => {
    if (arretDemande) {
      console.log('\nArrêt forcé.')
      process.exit(1)
    }
    arretDemande = true
    console.log(`\n${signal} reçu — le tour en cours se termine, puis on s'arrête.`)
  }
  process.on('SIGINT', () => arreter('SIGINT'))
  process.on('SIGTERM', () => arreter('SIGTERM'))

  const creees = await amorcerCibles()
  if (creees > 0) console.log(`File de collecte amorcée : ${creees} cible(s) créée(s).`)

  console.log('Collecteur démarré. Ctrl+C pour arrêter.')

  let toursConsecutifsBloques = 0

  while (!arretDemande) {
    const debut = Date.now()
    const bilan = await passerUnTour({ budgetMs: 5 * 60_000 })

    for (const cible of bilan.cibles) {
      const marque = cible.statut === 'ok' ? '✓' : '✗'
      const detail =
        cible.statut === 'ok'
          ? `${cible.annonces} annonces (${cible.source}), ${cible.notees} notée(s)`
          : `${cible.statut} — ${cible.erreur ?? ''}`
      console.log(`${marque} ${cible.query} : ${detail} [${cible.dureeMs} ms]`)
    }

    if (bilan.raison === 'bloque') {
      toursConsecutifsBloques += 1
      // Insister pendant qu'on est filtré ne fait qu'allonger le filtrage. On
      // attend de plus en plus longtemps, jusqu'à une demi-heure.
      const pause = Math.min(30, 2 ** Math.min(toursConsecutifsBloques, 5))
      console.warn(`Vinted bloque (session : ${JSON.stringify(etatSession())}). Pause de ${pause} min.`)
      await dormir(pause * 60_000, () => arretDemande)
      continue
    }
    toursConsecutifsBloques = 0

    if (bilan.raison === 'file-vide') {
      // Rien n'est dû : on dort jusqu'à la prochaine échéance plutôt que de
      // marteler la base avec des requêtes qui ne rendront rien.
      const suivante = await prisma.collectTarget.findFirst({
        where: { enabled: true },
        orderBy: { nextRunAt: 'asc' },
        select: { nextRunAt: true, query: true },
      })
      const attente = suivante?.nextRunAt ? suivante.nextRunAt.getTime() - Date.now() : 60_000
      const borne = Math.max(15_000, Math.min(attente, 15 * 60_000))
      console.log(`File à jour. Prochaine cible : ${suivante?.query ?? 'aucune'} dans ${Math.round(borne / 1000)} s.`)
      await dormir(borne, () => arretDemande)
      continue
    }

    console.log(
      `Tour terminé en ${Math.round((Date.now() - debut) / 1000)} s : ` +
        `${bilan.annoncesCollectees} annonces, ${bilan.annoncesEcrites} écrites, ${bilan.echecs} échec(s).`,
    )
    await dormir(2_000, () => arretDemande)
  }

  // Une cible reste utilisable si le processus s'arrête : elle a déjà été
  // replanifiée. Il ne reste qu'à fermer proprement la connexion.
  await prisma.$disconnect()
  rendreLeVerrou()
  console.log('Collecteur arrêté.')
}

/** Sommeil interruptible : on vérifie l'arrêt toutes les secondes. */
async function dormir(ms: number, interrompu: () => boolean) {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    if (interrompu()) return
    await new Promise((r) => setTimeout(r, Math.min(1000, fin - Date.now())))
  }
}

// Une exception non rattrapée doit arrêter le processus avec un code d'erreur :
// c'est ce qui permet à un superviseur (systemd, pm2, Docker) de le relancer.
principal().catch((err) => {
  console.error('Collecteur : arrêt sur erreur.', err)
  rendreLeVerrou()
  process.exit(1)
})
