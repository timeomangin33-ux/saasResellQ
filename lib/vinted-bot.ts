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

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lt: '<',
  gt: '>',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ocirc: 'ô',
  icirc: 'î',
  ecirc: 'ê',
  ugrave: 'ù',
}

function decodeHtmlEntities(input: string) {
  return (
    input
      // Numeric entities, hex (&#x27;) and decimal (&#39;). Vinted emits hex for
      // apostrophes, which the previous decoder missed entirely - titles were
      // persisted and rendered as "Boîte d&#x27;origine".
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
      // &amp; last, so "&amp;#39;" doesn't get double-decoded above.
      .replace(/&amp;/g, '&')
  )
}

function extractPrice(text: string) {
  const match = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*€/)
  return match ? Number(match[1].replace(',', '.')) : 0
}

function buildVintedItemsFromHtml(
  html: string,
  query: string,
  limit = 8,
  seen: Set<string> = new Set(),
): VintedBotItem[] {
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
      // No stock-photo fallback: showing an unrelated Unsplash image next to a
      // real listing misrepresents the item. Empty means "no image", and the
      // UI renders a placeholder instead.
      image: srcMatch?.[1] || '',
      url: hrefMatch ? `https://www.vinted.fr${hrefMatch[1]}` : `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(query)}`,
      description: `${state}${size ? ` • Taille ${size}` : ''}`,
    })
  }

  return items
}

function fetchVintedSearchPage(query: string, page = 1): Promise<string> {
  const url =
    `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(query)}` +
    (page > 1 ? `&page=${page}` : '')

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

const ANNONCES_PAR_PAGE = 96
const DECALAGE_ENTRE_PAGES = 250
const MAX_PAGES = 6

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Scanne une recherche Vinted.
 *
 * Une page de catalogue contient 96 annonces : l'ancienne limite de 12 en
 * jetait 84 sur 96, pour exactement le même coût réseau. On lit donc la page
 * entière, puis on pagine si la cible n'est pas atteinte — les pages se
 * recouvrent très peu, de l'ordre de 5 annonces sur 96.
 *
 * `deadline` protège le cron : la fonction rend ce qu'elle a déjà collecté
 * plutôt que de dépasser le temps d'exécution alloué.
 */
export async function runVintedBotScan({
  query = 'nike',
  perPage = 96,
  category,
  deadline,
}: {
  query?: string
  perPage?: number
  category?: string
  deadline?: number
} = {}): Promise<VintedBotScanResult> {
  const normalizedQuery = (query || '').trim() || 'nike'
  const cible = Math.max(4, Math.min(600, Number(perPage) || 96))

  try {
    const seen = new Set<string>()
    const items: VintedBotItem[] = []

    // Une page rend 96 annonces : on sait donc combien en demander sans avoir
    // à sonder. Les pages partent ensemble plutôt qu'à la file — deux requêtes
    // simultanées, c'est moins que ce qu'un navigateur ouvre pour afficher la
    // même page, et ça divise par deux le temps passé sur chaque catégorie.
    const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(cible / ANNONCES_PAR_PAGE)))

    const reponses = await Promise.all(
      Array.from({ length: pages }, async (_, i) => {
        // Un léger décalage évite d'arriver toutes en même temps.
        if (i > 0) await attendre(i * DECALAGE_ENTRE_PAGES)
        if (deadline && Date.now() > deadline) return null
        try {
          return await fetchVintedSearchPage(normalizedQuery, i + 1)
        } catch {
          return null // une page perdue ne doit pas faire échouer les autres
        }
      }),
    )

    for (const html of reponses) {
      if (!html || items.length >= cible) continue
      items.push(...buildVintedItemsFromHtml(html, normalizedQuery, cible - items.length, seen))
    }

    if (items.length === 0 && reponses.every((r) => r === null)) {
      throw new Error('Aucune page Vinted n\'a pu être chargée')
    }

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
