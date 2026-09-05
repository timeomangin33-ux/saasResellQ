import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { passerUnTour } from '@/lib/vinted/collector'
import { sendAlertEmail, envoyerAlerteCollecteArretee } from '@/lib/email'
import { etatDeLaCollecte, formaterAge } from '@/lib/vinted/sante'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Le déclencheur périodique de la collecte.
 *
 * Il ne contient plus de logique de collecte : celle-ci vit dans
 * `lib/vinted/collector.ts` et sert aussi au worker permanent. Cette route
 * n'est qu'un des deux boutons qui l'actionnent, avec un budget de temps
 * adapté à la limite de Vercel.
 */

function estAutorise(request: Request) {
  const cronVercel = request.headers.get('x-vercel-cron')
  if (cronVercel) return true

  const attendu = process.env.CRON_SECRET
  // Sans secret configuré, on n'ouvre pas la route au monde entier : une route
  // de cron publique, c'est un moyen gratuit de faire marteler Vinted depuis
  // notre IP jusqu'à ce qu'elle soit bloquée. Vercel reste autorisé par son
  // en-tête, ce qui suffit à faire tourner la production.
  if (!attendu) return false

  const fourni = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  return fourni === attendu
}

const REPOS_ALERTE_MS = 12 * 60 * 60 * 1000

async function evaluerAlertes() {
  const alertes = await prisma.alert.findMany({ where: { active: true } })
  if (alertes.length === 0) return { evaluees: 0, declenchees: 0 }

  const categories = [...new Set(alertes.map((a) => a.category))]
  const marches = await prisma.categoryMarket.findMany({ where: { category: { in: categories } } })
  const parCategorie = new Map(marches.map((m) => [m.category, m]))

  let declenchees = 0
  for (const alerte of alertes) {
    const marche = parCategorie.get(alerte.category)
    if (!marche) continue

    const enRepos =
      alerte.lastTriggeredAt && Date.now() - new Date(alerte.lastTriggeredAt).getTime() < REPOS_ALERTE_MS
    if (enRepos) continue

    let touche = false
    let detail = ''

    if (alerte.condition === 'profit_margin' && marche.avgMargin !== null && marche.avgMargin !== undefined) {
      touche = marche.avgMargin >= alerte.threshold
      detail = `Marge moyenne : ${marche.avgMargin.toFixed(1)}%`
    } else if (
      alerte.condition === 'price_drop' &&
      marche.priceChangePercent !== null &&
      marche.priceChangePercent !== undefined
    ) {
      touche = -marche.priceChangePercent >= alerte.threshold
      detail = `Prix moyen en baisse de ${Math.abs(marche.priceChangePercent).toFixed(1)}%`
    } else if (
      alerte.condition === 'demand_spike' &&
      marche.volumeChangePercent !== null &&
      marche.volumeChangePercent !== undefined
    ) {
      touche = marche.volumeChangePercent >= alerte.threshold
      detail = `Volume d'annonces en hausse de ${marche.volumeChangePercent.toFixed(1)}%`
    }

    if (!touche) continue

    declenchees += 1
    await prisma.notification.create({
      data: {
        userId: alerte.userId,
        title: `Alerte déclenchée : ${alerte.category}`,
        message: detail,
        type: 'alert',
      },
    })
    await prisma.alert.update({ where: { id: alerte.id }, data: { lastTriggeredAt: new Date() } })

    const utilisateur = await prisma.user.findUnique({
      where: { id: alerte.userId },
      select: { email: true, preferences: true },
    })
    const preferences = (utilisateur?.preferences as Record<string, unknown>) ?? {}
    if (utilisateur?.email && preferences.emailDealAlerts) {
      await sendAlertEmail({
        to: utilisateur.email,
        category: alerte.category,
        detail,
        condition: alerte.condition,
      }).catch((err) => console.error('market-refresh: envoi de l\'alerte échoué', err))
    }
  }

  return { evaluees: alertes.length, declenchees }
}

/** Une seule alerte de collecte arrêtée par demi-journée, pas une par passage. */
const REPOS_ALERTE_COLLECTE_MS = 12 * 60 * 60 * 1000

/**
 * Prévient quand la collecte est à l'arrêt.
 *
 * Le cron collecte lui-même : si ce contrôle voit des données périmées, c'est
 * que la collecte échoue des deux côtés à la fois — le poste local et ici.
 * C'est exactement le cas qu'on veut apprendre sans avoir à le chercher.
 */
async function surveillerLaFraicheur() {
  const sante = await etatDeLaCollecte()
  if (sante.statut !== 'arretee') return { alerte: false, statut: sante.statut }

  const derniere = await prisma.automationJob.findFirst({
    where: { jobType: 'collecte-arretee' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (derniere && Date.now() - derniere.createdAt.getTime() < REPOS_ALERTE_COLLECTE_MS) {
    return { alerte: false, statut: sante.statut, raison: 'déjà signalé récemment' }
  }

  const ageTexte = formaterAge(sante.ageMinutes ?? 0)
  const detail =
    sante.ciblesEnEchec.length > 0
      ? `Cibles en échec : ${sante.ciblesEnEchec.map((c) => `${c.query} (${c.statut})`).join(', ')}.`
      : "Aucune cible n'est en échec : le collecteur ne tourne probablement plus du tout."

  await prisma.automationJob.create({
    data: {
      jobType: 'collecte-arretee',
      status: 'failed',
      lastRunAt: new Date(),
      error: `${sante.message} ${detail}`,
    },
  })

  // Les administrateurs sont prévenus dans l'application, et par courriel si
  // Resend est configuré.
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } })
  for (const admin of admins) {
    await prisma.notification
      .create({
        data: {
          userId: admin.id,
          title: 'La collecte Vinted est arrêtée',
          message: `${sante.message} ${detail}`,
          type: 'system',
        },
      })
      .catch((err) => console.error('market-refresh: notification admin impossible', err))

    if (admin.email) {
      await envoyerAlerteCollecteArretee({ to: admin.email, ageTexte, detail }).catch((err) =>
        console.error('market-refresh: courriel de collecte non envoyé', err),
      )
    }
  }

  return { alerte: true, statut: sante.statut, ageMinutes: sante.ageMinutes, adminsPrevenus: admins.length }
}

export async function GET(request: Request) {
  if (!estAutorise(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  // La fonction est plafonnée à 60 s. On garde 8 s pour les alertes et la
  // réponse : passé ce budget, le tour rend ce qu'il a plutôt que de se faire
  // couper au milieu d'une écriture.
  const bilan = await passerUnTour({ budgetMs: 50_000 })
  const alertes = await evaluerAlertes()
  const fraicheur = await surveillerLaFraicheur().catch((err) => {
    console.error('market-refresh: surveillance de fraîcheur impossible', err)
    return { alerte: false, statut: 'inconnu' as const }
  })

  return NextResponse.json({
    ok: !bilan.degrade,
    degraded: bilan.degrade,
    reason: bilan.raison,
    targetsProcessed: bilan.cibles.length,
    itemsCollected: bilan.annoncesCollectees,
    itemsWritten: bilan.annoncesEcrites,
    fullSweeps: bilan.balayages,
    itemsDisappeared: bilan.disparues,
    failures: bilan.echecs,
    results: bilan.cibles,
    alerts: alertes,
    freshness: fraicheur,
  })
}
