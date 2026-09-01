/**
 * eBay.
 *
 * Ce fichier fabriquait ses résultats : six annonces par recherche, titres
 * assemblés (« Enchère en cours », « Vendeur Top »), prix tirés au hasard dans
 * une fourchette selon les mots-clés, photos de banque d'images, et un lien
 * vers une page de recherche eBay pour faire vrai. Une comparaison de prix
 * inter-plateformes construite là-dessus n'informe pas : elle invente.
 *
 * L'API Browse d'eBay existe et rend de vraies annonces, mais elle demande des
 * identifiants applicatifs (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET). Tant qu'ils
 * ne sont pas fournis, la seule réponse honnête est « non disponible ».
 */

export interface EbayListing {
  id: string
  title: string
  price: number
  currency: string
  image: string
  platform: 'ebay'
  condition: string
  link: string
}

export class MarketplaceNonConfigure extends Error {
  readonly plateforme: string
  readonly variables: string[]
  constructor(plateforme: string, variables: string[]) {
    super(
      `L'intégration ${plateforme} n'est pas configurée : ${variables.join(' et ')} ${variables.length > 1 ? 'sont absentes' : 'est absente'}.`,
    )
    this.name = 'MarketplaceNonConfigure'
    this.plateforme = plateforme
    this.variables = variables
  }
}

const OAUTH = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const PORTEE = 'https://api.ebay.com/oauth/api_scope'

let jeton: { valeur: string; expireA: number } | null = null

async function obtenirJeton(clientId: string, clientSecret: string) {
  if (jeton && Date.now() < jeton.expireA) return jeton.valeur

  const reponse = await fetch(OAUTH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(PORTEE)}`,
  })

  if (!reponse.ok) {
    throw new Error(`eBay a refusé les identifiants (HTTP ${reponse.status}).`)
  }

  const donnees = (await reponse.json()) as { access_token?: string; expires_in?: number }
  if (!donnees.access_token) throw new Error("eBay n'a pas renvoyé de jeton d'accès.")

  // On renouvelle une minute avant l'expiration annoncée, pour ne pas se faire
  // refuser une requête déjà partie.
  jeton = { valeur: donnees.access_token, expireA: Date.now() + ((donnees.expires_in ?? 7200) - 60) * 1000 }
  return jeton.valeur
}

export const EbayProvider = {
  estConfigure() {
    return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)
  },

  async searchListings(query: string, limite = 12): Promise<EbayListing[]> {
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new MarketplaceNonConfigure('eBay', ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'])
    }

    const acces = await obtenirJeton(clientId, clientSecret)
    const url = `${BROWSE}?q=${encodeURIComponent(query)}&limit=${Math.min(50, limite)}`

    const reponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${acces}`,
        'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID || 'EBAY_FR',
      },
    })

    if (!reponse.ok) {
      throw new Error(`eBay a répondu HTTP ${reponse.status} sur la recherche.`)
    }

    const donnees = (await reponse.json()) as {
      itemSummaries?: {
        itemId?: string
        title?: string
        price?: { value?: string; currency?: string }
        image?: { imageUrl?: string }
        condition?: string
        itemWebUrl?: string
      }[]
    }

    return (donnees.itemSummaries ?? []).map((item, index) => ({
      id: item.itemId ?? `ebay-${index}`,
      title: item.title ?? 'Sans titre',
      price: Number(item.price?.value ?? 0),
      currency: item.price?.currency ?? 'EUR',
      image: item.image?.imageUrl ?? '',
      platform: 'ebay' as const,
      condition: item.condition ?? 'Non précisé',
      link: item.itemWebUrl ?? `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}`,
    }))
  },
}
