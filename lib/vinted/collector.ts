/**
 * Le moteur de collecte.
 *
 * Un seul moteur, deux façons de le déclencher : le cron Vercel lui donne un
 * budget de quelques dizaines de secondes, le worker permanent l'appelle en
 * boucle sans interruption. Les deux exécutent exactement le même code, donc
 * ce qui marche en local marche en production — l'inverse de deux chemins
 * parallèles qui divergent au premier correctif.
 *
 * Le choix de la cible vient de la base (table `collect_targets`), pas d'une
 * liste écrite dans le code. Ajouter une recherche à surveiller ne demande
 * plus de redéploiement.
 */

import { prisma } from '@/prisma'
import { runVintedBotScan, type CauseEchec } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { scoreProducts } from '@/lib/ai-scoring'
import { VINTED_CATEGORIES } from '@/vinted'

/** Le scoring IA coûte des crédits par produit : on ne score que les nouveautés. */
const MAX_SCORING_PAR_PASSAGE = 12

/**
 * Coupe-circuit du scoring.
 *
 * Un compte OpenAI sans crédit répond 429 à chaque appel, et chaque échec coûte
 * un aller-retour réseau. Observé en conditions réelles : quinze catégories,
 * quinze appels, quinze fois « You have no credits remaining » — quinze
 * secondes prises sur le budget de collecte pour zéro note. Au premier refus,
 * on arrête d'essayer pour un moment ; la collecte, elle, continue.
 */
const REPOS_APRES_REFUS_MS = 15 * 60_000
let scoringIndisponibleJusqua = 0

function scoringDisponible() {
  return Boolean(process.env.OPENAI_API_KEY) && Date.now() > scoringIndisponibleJusqua
}

/**
 * Recul en cas d'échec : 2, 4, 8... minutes, plafonné à 2 heures.
 *
 * Une cible qui échoue sans recul revient immédiatement en tête de file et
 * consomme tout le budget en se cassant les dents, pendant que les cibles
 * saines attendent. Le recul la met de côté sans la supprimer.
 */
function reculMinutes(echecs: number) {
  return Math.min(120, 2 ** Math.min(echecs, 6))
}

export interface ResultatCible {
  query: string
  statut: 'ok' | 'empty' | CauseEchec
  annonces: number
  ecrites: number
  /** Annonces dont la note d'opportunité a été recalculée. */
  notees: number
  source: string
  dureeMs: number
  erreur?: string
}

/**
 * Crée les cibles de départ à partir des catégories Vinted connues, si la
 * table est vide. Idempotent : relancer n'écrase aucun réglage existant.
 */
export async function amorcerCibles(): Promise<number> {
  const existantes = await prisma.collectTarget.count()
  if (existantes > 0) return 0

  const cibles = VINTED_CATEGORIES.map((categorie, index) => ({
    query: categorie.name,
    label: categorie.name,
    targetItems: 96,
    // Les premières catégories de la liste sont les plus grosses : on les
    // rafraîchit plus souvent que la longue traîne.
    intervalMinutes: index < 6 ? 60 : 180,
    priority: index < 6 ? 10 : 0,
    nextRunAt: new Date(),
  }))

  const { count } = await prisma.collectTarget.createMany({ data: cibles, skipDuplicates: true })
  return count
}

/**
 * Durée pendant laquelle une cible réservée est invisible pour les autres.
 *
 * Assez longue pour couvrir un scan complet, assez courte pour qu'un processus
 * tué au milieu ne bloque pas la cible plus de quelques minutes.
 */
const VERROU_MS = 5 * 60_000

/**
 * Réserve la cible la plus en retard, ou rien.
 *
 * La réservation compte parce que deux collecteurs tournent en même temps :
 * celui du poste, en continu, et le cron Vercel, toutes les heures. Sans elle,
 * les deux liraient la même ligne « due » à la même seconde et taperaient deux
 * fois sur Vinted pour la même catégorie — du trafic doublé vers un site qui
 * compte les requêtes, et deux écritures concurrentes sur les mêmes annonces.
 *
 * Le `updateMany` filtré sur l'ancienne valeur de `nextRunAt` est la
 * réservation : c'est une écriture conditionnelle, donc atomique côté Postgres.
 * Celui qui la réussit a la cible ; l'autre repart chercher la suivante.
 */
export async function reserverCible() {
  const candidat = await prisma.collectTarget.findFirst({
    where: {
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
    },
    orderBy: [{ priority: 'desc' }, { nextRunAt: 'asc' }, { lastRunAt: 'asc' }],
  })
  if (!candidat) return null

  const { count } = await prisma.collectTarget.updateMany({
    where: { id: candidat.id, nextRunAt: candidat.nextRunAt },
    data: { nextRunAt: new Date(Date.now() + VERROU_MS) },
  })

  // Zéro ligne modifiée : un autre collecteur est passé entre la lecture et
  // l'écriture. On ne prend pas la cible.
  return count === 1 ? candidat : null
}

/**
 * Traite une cible : lecture sur Vinted, écriture en base, scoring, puis
 * replanification. La replanification a lieu quoi qu'il arrive — y compris
 * après une exception — sinon une cible en erreur resterait éternellement
 * « due » et bloquerait la file.
 */
export async function traiterCible(
  cible: { id: string; query: string; targetItems: number; intervalMinutes: number; consecutiveFailures: number },
  options: { deadline?: number; scoring?: boolean } = {},
): Promise<ResultatCible> {
  const debut = Date.now()
  let statut: ResultatCible['statut'] = 'ok'
  let erreur: string | undefined
  let annonces = 0
  let ecrites = 0
  let notees = 0
  let source = 'failed'

  try {
    const scan = await runVintedBotScan({
      query: cible.query,
      category: cible.query,
      perPage: cible.targetItems,
      deadline: options.deadline,
    })

    source = scan.source
    annonces = scan.items.length

    if (!scan.success) {
      statut = scan.failure?.cause ?? 'network'
      erreur = scan.message
    } else if (annonces === 0) {
      statut = 'empty'
      erreur = 'Vinted a répondu sans aucune annonce pour cette recherche.'
    } else {
      const bilan = await persistVintedScanResults(scan.items, cible.query)
      ecrites = bilan.annoncesEcrites
      notees = bilan.notees

      if (options.scoring !== false && scoringDisponible()) {
        // Un échec de scoring ne doit pas faire échouer la collecte : les
        // annonces sont déjà en base, c'est l'essentiel.
        const notation = await scoreProducts(
          scan.items.slice(0, MAX_SCORING_PAR_PASSAGE).map((item) => ({
            vintedId: item.id,
            title: item.title,
            brand: item.brand,
            price: item.price,
            category: cible.query,
          })),
        ).catch((err: unknown) => ({ scored: 0, error: true as const, reason: String(err) }))

        if (notation.error) {
          scoringIndisponibleJusqua = Date.now() + REPOS_APRES_REFUS_MS
          console.error(
            `collecteur: notation IA suspendue ${REPOS_APRES_REFUS_MS / 60_000} min ` +
              `après un refus sur « ${cible.query} » — ${'reason' in notation ? notation.reason : 'raison inconnue'}`,
          )
        }
      }
    }
  } catch (err) {
    statut = 'network'
    erreur = err instanceof Error ? err.message : String(err)
  }

  const reussi = statut === 'ok'
  const echecs = reussi ? 0 : cible.consecutiveFailures + 1
  const attente = reussi ? cible.intervalMinutes : reculMinutes(echecs)

  await prisma.collectTarget
    .update({
      where: { id: cible.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: new Date(Date.now() + attente * 60_000),
        lastStatus: statut,
        lastError: erreur ?? null,
        lastItemCount: annonces,
        consecutiveFailures: echecs,
      },
    })
    .catch((err: unknown) => console.error('collecteur: replanification impossible', err))

  return { query: cible.query, statut, annonces, ecrites, notees, source, dureeMs: Date.now() - debut, erreur }
}

export interface BilanPassage {
  cibles: ResultatCible[]
  annoncesCollectees: number
  annoncesEcrites: number
  echecs: number
  degrade: boolean
  raison: 'budget' | 'file-vide' | 'bloque'
}

/**
 * Un tour de collecte, borné par un budget de temps.
 *
 * Le cron Vercel est plafonné à 60 s : dépasser, c'est se faire couper au
 * milieu d'une écriture. On s'arrête donc avant, en gardant de la marge pour
 * écrire le bilan.
 *
 * Un blocage Vinted arrête le tour immédiatement : insister catégorie après
 * catégorie pendant qu'on est filtré ne fait qu'aggraver le filtrage.
 */
export async function passerUnTour(options: { budgetMs?: number; scoring?: boolean } = {}): Promise<BilanPassage> {
  const budget = options.budgetMs ?? 45_000
  const fin = Date.now() + budget
  const cibles: ResultatCible[] = []
  let raison: BilanPassage['raison'] = 'budget'

  await amorcerCibles()

  while (Date.now() < fin) {
    const cible = await reserverCible()
    if (!cible) {
      raison = 'file-vide'
      break
    }

    // On ne démarre pas une cible qu'on ne pourra pas finir : mieux vaut la
    // laisser due pour le tour suivant que de l'entamer et la perdre.
    const restant = fin - Date.now()
    if (restant < 5_000) break

    const resultat = await traiterCible(cible, { deadline: fin - 2_000, scoring: options.scoring })
    cibles.push(resultat)

    if (resultat.statut === 'blocked' || resultat.statut === 'auth') {
      raison = 'bloque'
      break
    }

    // Un souffle entre deux catégories.
    await new Promise((r) => setTimeout(r, 500))
  }

  const annoncesCollectees = cibles.reduce((t, c) => t + c.annonces, 0)
  const annoncesEcrites = cibles.reduce((t, c) => t + c.ecrites, 0)
  const echecs = cibles.filter((c) => c.statut !== 'ok').length

  // Un passage où plus d'un tiers des cibles échoue, ou qui ne ramène presque
  // rien, est un passage dégradé. Sans trace écrite, les chiffres se figeraient
  // sans que personne ne l'apprenne — c'est exactement ce qui se produisait
  // quand l'échec renvoyait des annonces inventées avec un HTTP 200.
  const degrade = cibles.length === 0 || echecs > cibles.length / 3 || annoncesCollectees < cibles.length * 20

  await prisma.automationJob
    .create({
      data: {
        jobType: 'market-refresh',
        status: degrade ? 'failed' : 'completed',
        lastRunAt: new Date(),
        result: JSON.stringify({ annoncesCollectees, annoncesEcrites, cibles: cibles.length, echecs, raison }),
        error: degrade
          ? `Collecte dégradée : ${annoncesCollectees} annonces, ${echecs} cible(s) en échec (${cibles.map((c) => `${c.query}:${c.statut}`).join(', ') || 'aucune cible traitée'}).`
          : null,
      },
    })
    .catch((err: unknown) => console.error('collecteur: bilan non enregistré', err))

  if (degrade) {
    console.error(`collecteur: PASSAGE DÉGRADÉ — ${annoncesCollectees} annonces, ${echecs} échec(s)`)
  }

  return { cibles, annoncesCollectees, annoncesEcrites, echecs, degrade, raison }
}
