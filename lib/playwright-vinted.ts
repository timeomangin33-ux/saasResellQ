import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey() {
  const secret = process.env.VINTED_COOKIE_SECRET || ''
  if (!secret || secret.length < 32) {
    throw new Error('VINTED_COOKIE_SECRET must be set to at least 32 chars')
  }
  return Buffer.from(secret).slice(0, 32)
}

export function encryptCookieJar(plain: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptCookieJar(payload: string) {
  const data = Buffer.from(payload, 'base64')
  const iv = data.slice(0, IV_LENGTH)
  const tag = data.slice(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = data.slice(IV_LENGTH + 16)
  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return out.toString('utf8')
}

type Cookie = { name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean }

export async function scrapeWithCookieJar(serializedCookieJar: string) {
  // Try to lazy-load Playwright to avoid hard dependency at import time
  let playwright: any
  try {
     
    playwright = require('playwright')
  } catch (err) {
    throw new Error('Playwright is not installed. Run `npm install playwright`')
  }

  const cookiesJson = JSON.parse(serializedCookieJar) as Cookie[]

  const browser = await playwright.chromium.launch({ headless: true })
  const context = await browser.newContext()

  try {
    // normalize and add cookies to context
    const cookies = cookiesJson.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.vinted.fr',
      path: c.path || '/',
      expires: c.expires || -1,
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
    }))

    await context.addCookies(cookies)

    const page = await context.newPage()

    // Visit Vinted profile page to confirm session
    await page.goto('https://www.vinted.fr/', { waitUntil: 'networkidle' })

    // Simple checks: if user menu exists, assume authenticated
    const isLoggedIn = await page.evaluate(() => {
      try {
        return !!document.querySelector('a[href*="/profile/"]') || !!document.querySelector('[data-testid="user-menu"]')
      } catch (e) {
        return false
      }
    })

    if (!isLoggedIn) {
      await browser.close()
      throw new Error('Invalid or expired Vinted session')
    }

    // Scrape listings from user\'s profile page
    // This is intentionally conservative: extract elements that are stable, fall back to empty arrays
    const listings = await page.evaluate(() => {
      const out: any[] = []
      const nodes = Array.from(document.querySelectorAll('a.feed-grid__item'))
      for (const n of nodes) {
        try {
          const title = (n.querySelector('.catalogue-item__title') as HTMLElement)?.innerText || ''
          const price = (n.querySelector('.catalogue-item__price') as HTMLElement)?.innerText || ''
          const url = (n as HTMLAnchorElement).href
          const vintedId = url.split('/').pop() || url
          out.push({ vintedId, title, price: price.replace(/[^0-9.,]/g, '').replace(',', '.'), url, sold: false })
        } catch (e) {
          // ignore
        }
      }
      return out
    })

    // Very basic sales scrape: attempt to open sales page if exists
    let sales: any[] = []
    try {
      await page.goto('https://www.vinted.fr/transactions', { waitUntil: 'networkidle' })
      sales = await page.evaluate(() => {
        const out: any[] = []
        const nodes = Array.from(document.querySelectorAll('.transaction-item'))
        for (const n of nodes) {
          try {
            const title = (n.querySelector('.transaction-item__title') as HTMLElement)?.innerText || ''
            const price = (n.querySelector('.transaction-item__price') as HTMLElement)?.innerText || ''
            out.push({ title, price: price.replace(/[^0-9.,]/g, '').replace(',', '.'), date: new Date().toISOString() })
          } catch (e) {}
        }
        return out
      })
    } catch (e) {
      // ignore if page not available
      sales = []
    }

    await browser.close()
    return { listings, sales }
  } catch (err) {
    await browser.close()
    throw err
  }
}

export async function loginWithPlaywright(options: { timeoutMs?: number } = {}) {
  let playwright: any
  try {
     
    playwright = require('playwright')
  } catch (err) {
    throw new Error('Playwright is not installed. Run `npm install playwright`')
  }

  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000
  const browser = await playwright.chromium.launch({ headless: false, args: ['--start-maximized'] })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto('https://www.vinted.fr/', { waitUntil: 'load' })

    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      // check for vinted cookies in the context
      const cookies = await context.cookies()
      const vintedCookies = cookies.filter((c: any) => (c.domain || '').includes('vinted'))
      if (vintedCookies.length > 0) {
        const serialized = JSON.stringify(vintedCookies)
        await browser.close()
        return serialized
      }

      // also check for simple UI indicator of logged-in state
      const loggedIn = await page.evaluate(() => {
        try {
          return !!document.querySelector('a[href*="/profile/"]') || !!document.querySelector('[data-testid="user-menu"]')
        } catch (e) {
          return false
        }
      })
      if (loggedIn) {
        const cookies = await context.cookies()
        const serialized = JSON.stringify(cookies.filter((c: any) => (c.domain || '').includes('vinted')))
        await browser.close()
        return serialized
      }

      await page.waitForTimeout(2000)
    }

    await browser.close()
    throw new Error('Timeout waiting for user to complete Vinted login (Playwright)')
  } catch (err) {
    try {
      await browser.close()
    } catch (e) {}
    throw err
  }
}

const playwrightVinted = { encryptCookieJar, decryptCookieJar, scrapeWithCookieJar, loginWithPlaywright }

export default playwrightVinted
