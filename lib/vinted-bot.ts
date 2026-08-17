import https from 'node:https'

export interface VintedBotItem {
  id: string
  title: string
  price: number
  brand: string
  category: string
  image: string
  url: string
  description: string
}

export interface VintedBotScanResult {
  success: boolean
  source: 'live' | 'fallback', query: string
  items: VintedBotItem[]
  message: string
}

const FALLBACK_ITEMS: VintedBotItem[] = [
  {
    id: 'fallback-1',
    title: 'Nike Air Force 1 blanc',
    price: 69,
    brand: 'Nike',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    url: 'https://www.vinted.fr',
    description: 'Exemple de scan Vinted pour valider l\'intégration SaaS.',
  },
  {
    id: 'fallback-2',
    title: 'Veste Levi\'s 501 vintage',
    price: 42,
    brand: 'Levi\'s',
    category: 'Femmes',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600',
    url: 'https://www.vinted.fr',
    description: 'Résultat de secours si Vinted bloque la requête.',
  },
]

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/ /g, ' ')
}

function extractPrice(text: string) {
  const match = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*€/)
  return match ? Number(match[1].replace(',', '.')) : 0
}

function buildVintedItemsFromHtml(html: string, query: string, limit = 8): VintedBotItem[] {
  const seen = new Set<string>()
  const items: VintedBotItem[] = []

  const testIdRe = /data-testid="product-item-id-(\d+)"(?!--)/g
  let match: RegExpExecArray | null

  while ((match = testIdRe.exec(html)) && items.length < limit) {
    const vintedId = match[1]
    if (seen.has(vintedId)) continue

    const window = html.slice(match.index, match.index + 1500)
    const hrefMatch = window.match(/href="(\/items\/\d+[^"]*)"/)
    const srcMatch = window.match(/src="(https:\/\/images1\.vinted\.net[^"]*)"/)
    const altMatch = window.match(/alt="([^"]+)"/)
    if (!altMatch) continue

    const rawText = decodeHtmlEntities(altMatch[1]).replace(/\s+/g, ' ').trim()
    if (!rawText || rawText.includes('Logo Vinted') || !/marque\s*:/i.test(rawText)) continue

    seen.add(vintedId)

    const title = rawText.split(/,\s*marque\s*:/i)[0].trim()
    const brand = rawText.match(/marque\s*:\s*([^,]+)/i)?.[1]?.trim() || 'Vinted'
    const state = rawText.match(/état\s*:\s*([^,]+)/i)?.[1]?.trim() || 'État non précisé'
    const size = rawText.match(/taille\s*:\s*([^,]+)/i)?.[1]?.trim() || ''
    const price = extractPrice(rawText)

    items.push({
      id: vintedId,
      title,
      price,
      brand,
      category: query,
      image: srcMatch?.[1] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
      url: hrefMatch ? `https://www.vinted.fr${hrefMatch[1]}` : `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(query)}`,
      description: `${state}${size ? ` • Taille ${size}` : ''}`,
    })
  }

  return items
}

function fetchVintedSearchPage(query: string): Promise<string> {
  const url = `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(query)}`

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => resolve(body))
      },
    )

    req.on('error', reject)
  })
}

export async function runVintedBotScan({
  query = 'nike',
  perPage = 8,
  category,
}: {
  query?: string
  perPage?: number
  category?: string
} = {}): Promise<VintedBotScanResult> {
  const normalizedQuery = (query || '').trim() || 'nike'
  const normalizedPerPage = Math.max(4, Math.min(12, Number(perPage) || 8))

  try {
    const html = await fetchVintedSearchPage(normalizedQuery)
    const items = buildVintedItemsFromHtml(html, normalizedQuery, normalizedPerPage)

    if (items.length === 0) {
      throw new Error('Aucune annonce n\'a été extraite de la page Vinted')
    }

    return {
      success: true,
      source: 'live',
      query: normalizedQuery,
      items,
      message: `Les dernières annonces Vinted pour "${normalizedQuery}" ont été chargées.`,
    }
  } catch (error) {
    const fallbackItems = FALLBACK_ITEMS.map((item) => ({
      ...item,
      title: item.title.replace('Nike', normalizedQuery),
      category: category || item.category,
    }))

    return {
      success: false,
      source: 'fallback',
      query: normalizedQuery,
      items: fallbackItems,
      message: `Le flux live a échoué (${error instanceof Error ? error.message : 'erreur inconnue'}). Les résultats de secours sont affichés.`,
    }
  }
}
