import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { scoreProducts } from '@/lib/ai-scoring'
import { sendAlertEmail } from '@/lib/email'
import { VINTED_CATEGORIES } from '@/vinted'

export const maxDuration = 60

function isAuthorized(request: Request) {
  const vercelCron = request.headers.get('x-vercel-cron')
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const expected = process.env.CRON_SECRET

  if (!expected) return true // no secret configured yet: allow so the feature works until it's set
  if (vercelCron) return true
  return provided === expected
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000

async function evaluateAlerts() {
  const alerts = await prisma.alert.findMany({ where: { active: true } })
  if (alerts.length === 0) return { evaluated: 0, triggered: 0 }

  const categories = [...new Set(alerts.map((a) => a.category))]
  const markets = await prisma.categoryMarket.findMany({ where: { category: { in: categories } } })
  const marketByCategory = new Map(markets.map((m) => [m.category, m]))

  let triggered = 0
  for (const alert of alerts) {
    const market = marketByCategory.get(alert.category)
    if (!market) continue

    const onCooldown = alert.lastTriggeredAt && Date.now() - new Date(alert.lastTriggeredAt).getTime() < ALERT_COOLDOWN_MS
    if (onCooldown) continue

    let hit = false
    let detail = ''

    if (alert.condition === 'profit_margin' && market.avgMargin !== null && market.avgMargin !== undefined) {
      hit = market.avgMargin >= alert.threshold
      detail = `Marge moyenne : ${market.avgMargin.toFixed(1)}%`
    } else if (alert.condition === 'price_drop' && market.priceChangePercent !== null && market.priceChangePercent !== undefined) {
      hit = -market.priceChangePercent >= alert.threshold
      detail = `Prix moyen en baisse de ${Math.abs(market.priceChangePercent).toFixed(1)}%`
    } else if (alert.condition === 'demand_spike' && market.volumeChangePercent !== null && market.volumeChangePercent !== undefined) {
      hit = market.volumeChangePercent >= alert.threshold
      detail = `Volume d'annonces en hausse de ${market.volumeChangePercent.toFixed(1)}%`
    }

    if (!hit) continue

    triggered += 1
    await prisma.notification.create({
      data: {
        userId: alert.userId,
        title: `Alerte déclenchée : ${alert.category}`,
        message: detail,
        type: 'alert',
      },
    })
    await prisma.alert.update({ where: { id: alert.id }, data: { lastTriggeredAt: new Date() } })

    const user = await prisma.user.findUnique({ where: { id: alert.userId }, select: { email: true, preferences: true } })
    const preferences = (user?.preferences as Record<string, unknown>) ?? {}
    if (user?.email && preferences.emailDealAlerts) {
      await sendAlertEmail({ to: user.email, category: alert.category, detail, condition: alert.condition }).catch((err) => {
        console.error('market-refresh: failed to send alert email', err)
      })
    }
  }

  return { evaluated: alerts.length, triggered }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  // Rotation : si le budget temps coupe avant la fin, ce ne sont pas toujours
  // les mêmes catégories qui passent. Le décalage suit le jour de l'année,
  // donc chacune finit par être rafraîchie même dans le pire des cas.
  const toutes = VINTED_CATEGORIES.slice(0, 12)
  const jourDeLAnnee = Math.floor(Date.now() / 86_400_000)
  const depart = jourDeLAnnee % toutes.length
  const categories = [...toutes.slice(depart), ...toutes.slice(0, depart)]
  const results: { category: string; source: string; items: number }[] = []

  // La fonction est plafonnée à 60 s. On garde 8 s pour les alertes et la
  // réponse : passé ce budget, le scan rend ce qu il a plutôt
  // que de se faire couper au milieu d'une écriture.
  const BUDGET_SCAN_MS = 52_000
  const finDuScan = Date.now() + BUDGET_SCAN_MS

  // Une page Vinted contient exactement 96 annonces. Viser 96 plutôt que 100
  // évite une seconde requête par catégorie pour quatre annonces de plus :
  // toutes les catégories passent dans le budget au lieu de sept, ce qui fait
  // plus de volume au total et deux fois moins de requêtes vers Vinted.
  const ANNONCES_PAR_CATEGORIE = 96

  // Le scoring IA consomme des crédits par produit : on ne score que les
  // nouveautés les plus récentes, pas les cent annonces à chaque passage.
  const MAX_SCORING_PAR_CATEGORIE = 12
  let scoringDisponible = Boolean(process.env.OPENAI_API_KEY)

  for (const category of categories) {
    if (Date.now() > finDuScan) {
      results.push({ category: category.name, source: 'skipped-time-budget', items: 0 })
      continue
    }
    try {
      const scan = await runVintedBotScan({
        query: category.name,
        perPage: ANNONCES_PAR_CATEGORIE,
        category: category.name,
        deadline: finDuScan,
      })
      if (scan.source === 'live' && scan.items.length > 0) {
        await persistVintedScanResults(scan.items, category.name)
        if (scoringDisponible) {
          await scoreProducts(
            scan.items.slice(0, MAX_SCORING_PAR_CATEGORIE).map((item) => ({
              vintedId: item.id,
              title: item.title,
              brand: item.brand,
              price: item.price,
              category: category.name,
            })),
          ).catch((err) => {
            // Un compte OpenAI sans crédit échoue à chaque appel, et chaque
            // échec coûte un aller-retour réseau. On arrête d'essayer pour ce
            // passage plutôt que de brûler le budget temps du cron.
            scoringDisponible = false
            console.error(`market-refresh: scoring désactivé pour ce passage (${category.name})`, err)
          })
        }
      }
      results.push({ category: category.name, source: scan.source, items: scan.items.length })
    } catch (err) {
      console.error(`market-refresh: scan failed for ${category.name}`, err)
      results.push({ category: category.name, source: 'error', items: 0 })
    }
    await sleep(300)
  }

  const alertSummary = await evaluateAlerts()

  // Le robot lit le HTML de Vinted : un changement de balisage chez eux le
  // fait basculer en secours, silencieusement, avec un HTTP 200. Sans trace
  // écrite, les chiffres se figeraient sans que personne ne l'apprenne. Chaque
  // passage laisse donc son bilan, et un passage dégradé est enregistré comme
  // un échec, visible dans les compteurs d'administration.
  const enSecours = results.filter((r) => r.source === 'fallback' || r.source === 'error').length
  const collectees = results.reduce((t, r) => t + r.items, 0)
  const degrade = enSecours > results.length / 3 || collectees < 100

  await prisma.automationJob
    .create({
      data: {
        jobType: 'market-refresh',
        status: degrade ? 'failed' : 'completed',
        lastRunAt: new Date(),
        result: JSON.stringify({ collectees, enSecours, categories: results.length }),
        error: degrade
          ? `Collecte dégradée : ${collectees} annonces, ${enSecours} catégorie(s) en secours. Le balisage Vinted a peut-être changé.`
          : null,
      },
    })
    .catch((err) => console.error('market-refresh: bilan non enregistré', err))

  if (degrade) {
    console.error(`market-refresh: PASSAGE DÉGRADÉ — ${collectees} annonces, ${enSecours} en secours`)
  }

  return NextResponse.json({
    ok: true,
    degraded: degrade,
    categoriesScanned: results.length,
    itemsCollected: collectees,
    results,
    alerts: alertSummary,
  })
}
