import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
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
  }

  return { evaluated: alerts.length, triggered }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const categories = VINTED_CATEGORIES.slice(0, 12)
  const results: { category: string; source: string; items: number }[] = []

  for (const category of categories) {
    try {
      const scan = await runVintedBotScan({ query: category.name, perPage: 12, category: category.name })
      if (scan.source === 'live' && scan.items.length > 0) {
        await persistVintedScanResults(scan.items, category.name)
      }
      results.push({ category: category.name, source: scan.source, items: scan.items.length })
    } catch (err) {
      console.error(`market-refresh: scan failed for ${category.name}`, err)
      results.push({ category: category.name, source: 'error', items: 0 })
    }
    await sleep(600)
  }

  const alertSummary = await evaluateAlerts()

  return NextResponse.json({ ok: true, categoriesScanned: results.length, results, alerts: alertSummary })
}
