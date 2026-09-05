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
import { balayerCategorie } from '@/lib/vinted/balayage'
import { verifierCohorte } from '@/lib/vinted/verification'
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
  statut: 'ok' | 'empty' | 'partiel' | CauseEchec
  /** `refresh` = les nouveautés ; `balayage` = tout le catalogue de la catégorie. */
  mode: 'refresh' | 'balayage'
  annonces: number
  ecrites: number
  /** Annonces dont la note d'opportunité a été recalculée. */
  notees: number
  /** Balayage seulement : pages lues, tranches de prix, disparitions constatées. */
  pages?: number
  disparues?: number
  /** Tranches de prix parcourues. */
  zones?: number
  /** Tranches parcourues *en entier*, les seules où une absence prouve quelque chose. */
  zonesFiables?: number
  /** Annonces dont la page a été relue pour connaître leur sort. */
  verifiees?: number
  /** Parmi elles, celles qui n'étaient plus en vente. */
  plusEnVente?: number
  source: string
  dureeMs: number
  erreur?: string
}

/**
 * Temps qu'il faut réserver pour un balayage complet.
 *
 * Une dizaine de tranches de prix, jusqu'à dix pages chacune, deux requêtes en
 * parallèle et 700 ms entre chaque paquet : de l'ordre d'une à deux minutes.
 * Entamer un balayage avec moins que ça dans le budget, c'est se faire couper
 * au milieu — et un balayage coupé conclut moins de disparitions, donc coûte le
 * trafic sans rendre tout le service.
 *
 * Le cron Vercel, plafonné à 60 s, ne franchira jamais ce seuil : les balayages
 * sont donc le travail du collecteur permanent, et le cron reste le filet qui
 * rafraîchit les nouveautés quand le poste est éteint. C'est voulu, et c'est
 * pour cette raison que le curseur de tranche est stocké en base plutôt qu'en
 * mémoire : les deux moteurs se relaient sans se marcher dessus.
 */
const BUDGET_BALAYAGE_MS = 90_000

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
    sweepMaxPages: index < 6 ? 25 : 15,
    // Les balayages sont décalés les uns des autres : quinze catégories qui
    // partiraient toutes en profondeur à la même heure feraient un pic de
    // trafic vers Vinted, ce qui est précisément le motif que DataDome
    // cherche. Étalés, ils passent pour de la navigation.
    sweepIntervalMinutes: 720 + index * 17,
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
export interface CibleACollecter {
  id: string
  query: string
  targetItems: number
  intervalMinutes: number
  consecutiveFailures: number
  sweepIntervalMinutes?: number
  sweepMaxPages?: number
  sweepCursor?: number
  lastSweepAt?: Date | null
}

/**
 * Cette cible mérite-t-elle un balayage complet maintenant ?
 *
 * Le balayage coûte une vingtaine de requêtes là où le rafraîchissement en
 * coûte une : on ne le déclenche que quand il est dû, et seulement si le budget
 * de temps permet de le mener à son terme.
 */
function balayageDu(cible: CibleACollecter, budgetRestantMs: number) {
  if (budgetRestantMs < BUDGET_BALAYAGE_MS) return false
  const intervalle = (cible.sweepIntervalMinutes ?? 720) * 60_000
  if (!cible.lastSweepAt) return true
  return Date.now() - cible.lastSweepAt.getTime() >= intervalle
}

export async function traiterCible(
  cible: CibleACollecter,
  options: { deadline?: number; scoring?: boolean } = {},
): Promise<ResultatCible> {
  const debut = Date.now()
  let statut: ResultatCible['statut'] = 'ok'
  let erreur: string | undefined
  let annonces = 0
  let ecrites = 0
  let notees = 0
  let source = 'failed'

  const budgetRestant = options.deadline ? options.deadline - Date.now() : Number.POSITIVE_INFINITY
  const mode: ResultatCible['mode'] = balayageDu(cible, budgetRestant) ? 'balayage' : 'refresh'

  // ------------------------------------------------------------------
  // Balayage complet : tout le catalogue de la catégorie, tri par prix.
  // ------------------------------------------------------------------
  if (mode === 'balayage') {
    const bilan = await balayerCategorie({
      query: cible.query,
      category: cible.query,
      budgetPages: cible.sweepMaxPages ?? 70,
      depart: cible.sweepCursor ?? 0,
      deadline: options.deadline,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      return {
        statut: 'network' as const,
        erreur: message,
        categorie: cible.query,
        pagesLues: 0,
        annoncesVues: 0,
        annoncesEcrites: 0,
        zones: [],
        zonesFiables: 0,
        prochainDepart: cible.sweepCursor ?? 0,
        absentes: 0,
        disparues: 0,
        dureeMs: 0,
      }
    })

    // Un balayage « partiel » a lu et écrit des annonces, mais s'est arrêté
    // avant la fin : il ne conclut rien sur les disparitions. C'est une demi-
    // réussite, et la traiter comme un échec ferait reculer la cible de deux
    // heures pour une raison qui n'en est pas une.
    // La vérification de cohorte a lieu après le balayage, dans le même
    // passage : c'est elle qui mesure ce qui se vend, et elle ne dépend pas du
    // balayage — elle lit la page de quelques annonces précises. On la fait
    // ici plutôt que dans un travail séparé pour qu'elle profite de la même
    // session Vinted déjà ouverte, et pour qu'une catégorie en échec de
    // collecte ne se fasse pas vérifier pour rien.
    const verification = await verifierCohorte(cible.query, {
      deadline: options.deadline ? options.deadline - 2_000 : undefined,
    }).catch((err: unknown) => {
      console.error(`collecteur: vérification impossible pour ${cible.query}`, err)
      return null
    })

    const reussi = bilan.statut === 'ok' || bilan.statut === 'partiel'
    const echecs = reussi ? 0 : cible.consecutiveFailures + 1
    const attente = reussi ? cible.intervalMinutes : reculMinutes(echecs)

    await prisma.collectTarget
      .update({
        where: { id: cible.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + attente * 60_000),
          lastStatus: bilan.statut,
          lastError: bilan.erreur ?? null,
          lastItemCount: bilan.annoncesVues,
          consecutiveFailures: echecs,
          // Seul un balayage exploitable remet le compteur à zéro : un balayage
          // interrompu ne doit pas repousser le suivant de douze heures, sinon
          // une catégorie qui échoue une fois reste sans mesure toute la
          // journée.
          ...(reussi
            ? {
                lastSweepAt: new Date(),
                lastSweepPages: bilan.pagesLues,
                lastSweepZones: bilan.zonesFiables,
                lastSweepComplete: bilan.zones.length > 0 && bilan.zonesFiables === bilan.zones.length,
                sweepCursor: bilan.prochainDepart,
              }
            : {}),
        },
      })
      .catch((err: unknown) => console.error('collecteur: replanification impossible', err))

    return {
      query: cible.query,
      statut: bilan.statut,
      mode: 'balayage',
      annonces: bilan.annoncesVues,
      ecrites: bilan.annoncesEcrites,
      notees: 0,
      pages: bilan.pagesLues,
      disparues: bilan.disparues,
      zones: bilan.zones.length,
      zonesFiables: bilan.zonesFiables,
      verifiees: verification?.verifiees ?? 0,
      plusEnVente: verification?.parties ?? 0,
      source: reussi ? 'api' : 'failed',
      dureeMs: Date.now() - debut,
      erreur: bilan.erreur,
    }
  }

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

  return { query: cible.query, statut, mode: 'refresh', annonces, ecrites, notees, source, dureeMs: Date.now() - debut, erreur }
}

export interface BilanPassage {
  cibles: ResultatCible[]
  annoncesCollectees: number
  annoncesEcrites: number
  /** Nombre de catégories parcourues en entier sur ce tour. */
  balayages: number
  /** Annonces constatées disparues (vendues ou retirées) sur ce tour. */
  disparues: number
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
  // Une cible entamée mais non finie est une cible perdue pour ce tour : on
  // garde de quoi finir ce qu'on commence.

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
  const balayages = cibles.filter((c) => c.mode === 'balayage')
  const disparues = cibles.reduce((t, c) => t + (c.disparues ?? 0), 0)
  // « partiel » veut dire : des annonces ont bien été lues et écrites, mais le
  // balayage n'est pas allé au bout, donc aucune disparition n'a été conclue.
  // C'est une lecture réussie amputée d'une conclusion, pas un échec.
  const echecs = cibles.filter((c) => c.statut !== 'ok' && c.statut !== 'partiel').length

  // Un passage où plus d'un tiers des cibles échoue, ou qui ne ramène presque
  // rien, est un passage dégradé. Sans trace écrite, les chiffres se figeraient
  // sans que personne ne l'apprenne — c'est exactement ce qui se produisait
  // quand l'échec renvoyait des annonces inventées avec un HTTP 200.
  // Le seuil de volume ne vaut que pour les rafraîchissements : un balayage
  // ramène des centaines d'annonces et fausserait la moyenne dans l'autre sens.
  const rafraichissements = cibles.filter((c) => c.mode === 'refresh')
  const volumeRafraichi = rafraichissements.reduce((t, c) => t + c.annonces, 0)
  const degrade =
    cibles.length === 0 ||
    echecs > cibles.length / 3 ||
    (rafraichissements.length > 0 && volumeRafraichi < rafraichissements.length * 20)

  await prisma.automationJob
    .create({
      data: {
        jobType: 'market-refresh',
        status: degrade ? 'failed' : 'completed',
        lastRunAt: new Date(),
        result: JSON.stringify({
          annoncesCollectees,
          annoncesEcrites,
          cibles: cibles.length,
          balayages: balayages.length,
          disparues,
          echecs,
          raison,
        }),
        error: degrade
          ? `Collecte dégradée : ${annoncesCollectees} annonces, ${echecs} cible(s) en échec (${cibles.map((c) => `${c.query}:${c.statut}`).join(', ') || 'aucune cible traitée'}).`
          : null,
      },
    })
    .catch((err: unknown) => console.error('collecteur: bilan non enregistré', err))

  if (degrade) {
    console.error(`collecteur: PASSAGE DÉGRADÉ — ${annoncesCollectees} annonces, ${echecs} échec(s)`)
  }

  return { cibles, annoncesCollectees, annoncesEcrites, balayages: balayages.length, disparues, echecs, degrade, raison }
}
