export interface MarketplaceResult {
  id: string
  title: string
  platform: 'amazon' | 'ebay'
  price: number
  listingUrl: string
  score: number
  available: boolean
  soldLast30Days: number
}

export interface GoogleTrend {
  keyword: string
  score: number
  category: string
  change: string
}

export const MarketplaceProvider = {
  searchAmazon(query: string): MarketplaceResult[] {
    const base = query.trim() || 'Article populaire'
    return [
      {
        id: 'amz-1',
        title: `${base} Prime - Stock limité`,
        platform: 'amazon',
        price: 74,
        listingUrl: 'https://www.amazon.fr',
        score: 92,
        available: true,
        soldLast30Days: 123,
      },
      {
        id: 'amz-2',
        title: `${base} Edition Collector`,
        platform: 'amazon',
        price: 99,
        listingUrl: 'https://www.amazon.fr',
        score: 87,
        available: true,
        soldLast30Days: 84,
      },
    ]
  },

  searchEbay(query: string): MarketplaceResult[] {
    const base = query.trim() || 'Article rare'
    return [
      {
        id: 'ebay-1',
        title: `${base} - Offres enchères`,
        platform: 'ebay',
        price: 68,
        listingUrl: 'https://www.ebay.fr',
        score: 89,
        available: true,
        soldLast30Days: 71,
      },
      {
        id: 'ebay-2',
        title: `${base} - Vendeur premium`,
        platform: 'ebay',
        price: 81,
        listingUrl: 'https://www.ebay.fr',
        score: 84,
        available: true,
        soldLast30Days: 55,
      },
    ]
  },

  getGoogleTrends(): GoogleTrend[] {
    return [
      { keyword: 'Sneakers rétro', score: 98, category: 'Chaussures', change: '+32%' },
      { keyword: 'Vestes vintage', score: 92, category: 'Femmes', change: '+28%' },
      { keyword: 'PS5 reconditionnée', score: 90, category: 'Électronique', change: '+24%' },
      { keyword: 'Sacs de luxe', score: 88, category: 'Sacs', change: '+19%' },
    ]
  },
}
