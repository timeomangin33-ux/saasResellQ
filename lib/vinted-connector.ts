import { prisma } from '@/prisma'
import play from './playwright-vinted'
import { handleUnexpectedError, createApiError, logError } from '@/lib/errors'

// Vinted connector: save encrypted cookieJar, fetch account data via Playwright,
// persist results and compute summaries.

export async function saveVintedSession(userId: string, data: { username?: string; profileUrl?: string; cookieJar?: string }) {
  const db: any = prisma
  try {
    const toSave = { ...data }
    if (toSave.cookieJar) {
      toSave.cookieJar = play.encryptCookieJar(toSave.cookieJar)
    }

    const existingAccount = await db.vintedAccount.findFirst({
      where: {
        userId,
        ...(toSave.profileUrl ? { profileUrl: toSave.profileUrl } : {}),
        ...(toSave.username ? { username: toSave.username } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (existingAccount) {
      return await db.vintedAccount.update({
        where: { id: existingAccount.id },
        data: { ...toSave, updatedAt: new Date() },
      })
    }

    return await db.vintedAccount.create({ data: { userId, ...toSave } })
  } catch (err) {
    logError(createApiError('DATABASE_ERROR', 'Failed to save Vinted session', 500, err))
    throw err
  }
}

export async function getVintedAccountForUser(userId: string) {
  const db: any = prisma
  return db.vintedAccount.findFirst({ where: { userId } })
}

export async function fetchAccountData(account: any | null) {
  if (!account || !account.cookieJar) {
    return { listings: [], sales: [] }
  }

  // Decrypt cookieJar and call Playwright scraper with retries
  const db: any = prisma
  let decrypted = ''
  try {
    decrypted = play.decryptCookieJar(account.cookieJar)
  } catch (err) {
    logError(createApiError('INVALID_SESSION', 'Failed to decrypt cookieJar', 400, err))
    return { listings: [], sales: [] }
  }

  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await play.scrapeWithCookieJar(decrypted)
      // update lastSyncAt
      await db.vintedAccount.update({ where: { id: account.id }, data: { lastSyncAt: new Date() } })
      return result
    } catch (err) {
      logError(createApiError('SCRAPE_FAILED', `Playwright scrape attempt ${attempt} failed`, 500, err))
      if (attempt === maxAttempts) throw err
      // exponential backoff
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }

  return { listings: [], sales: [] }
}

export async function persistFetchedData(accountId: string, listings: any[], sales: any[]) {
  const db: any = prisma
  try {
    for (const l of listings) {
      await db.vintedListing.upsert({
        where: { vintedId: String(l.vintedId) },
        update: { ...l, updatedAt: new Date() },
        create: { accountId, ...l },
      })
    }

    // Detect new sales and notify
    for (const s of sales) {
      const exists = await db.vintedSale.findFirst({ where: { accountId, listingId: s.listingId || null, price: Number(s.price || 0) } })
      if (!exists) {
        const created = await db.vintedSale.create({ data: { accountId, ...s } })
        // Create a user notification
        try {
          const account = await db.vintedAccount.findUnique({ where: { id: accountId } })
          if (account) {
            await db.notification.create({ data: { userId: account.userId, title: 'Nouvelle vente Vinted', message: `Une vente a été enregistrée: ${created.price}€`, type: 'info' } })
          }
        } catch (nerr) {
          // ignore notification errors
        }
      }
    }

    await db.vintedSync.create({ data: { accountId, summary: JSON.stringify({ listings: listings.length, sales: sales.length }) } })
  } catch (err) {
    logError(createApiError('DATABASE_ERROR', 'Failed to persist fetched data', 500, err))
    throw err
  }
}

export function computeSummary(listings: any[], sales: any[]) {
  const totalRevenue = sales.reduce((s: number, x: any) => s + Number(x.price || 0), 0)
  const totalSales = sales.length
  const activeListings = listings.filter((l) => !l.sold).length
  const soldListings = listings.filter((l) => l.sold).length
  const avgPrice = totalSales ? totalRevenue / totalSales : 0
  return { totalRevenue, totalSales, activeListings, soldListings, avgPrice }
}

const vintedConnector = { saveVintedSession, getVintedAccountForUser, fetchAccountData, persistFetchedData, computeSummary }

export default vintedConnector
