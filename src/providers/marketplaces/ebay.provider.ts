export interface EbayListing {
  id: string
  title: string
  price: number
  image: string
  platform: 'ebay', condition: string
  bids?: number
  link: string
}

const EBAY_IMAGES = [
  'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
  'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400',
]

const EBAY_TITLES = [
  'Enchère en cours',
  'Vendeur Top',
  'Occasion premium',
  'Neuf avec garantie',
  'Meilleure offre',
]

function getEbayPrice(query: string) {
  const normalized = query.toLowerCase()
  if (/ps5|playstation|xbox|switch|console|nintendo|jeu/.test(normalized)) return 210 + Math.floor(Math.random() * 140)
  if (/iphone|samsung|galaxy|pixel|airpods|macbook|ipad|ordinateur|portable/.test(normalized)) return 110 + Math.floor(Math.random() * 520)
  if (/sac|handbag|pochette|gucci|louis|chanel/.test(normalized)) return 70 + Math.floor(Math.random() * 320)
  if (/jordan|air force|nike|adidas|sneaker|chaussures|new balance|converse|vans/.test(normalized)) return 40 + Math.floor(Math.random() * 120)
  if (/veste|manteau|robe|jean|hoodie|pull|chemise/.test(normalized)) return 20 + Math.floor(Math.random() * 80)
  return 30 + Math.floor(Math.random() * 110)
}

function getEbaySearchKeyword(query: string) {
  return query.trim() || 'Article recherché'
}

export const EbayProvider = {
  clientId: process.env.EBAY_CLIENT_ID || '',
  clientSecret: process.env.EBAY_CLIENT_SECRET || '',
  baseUrl: 'https://api.ebay.com',

  async searchListings(query: string): Promise<EbayListing[]> {
    const base = getEbaySearchKeyword(query)
    const price = getEbayPrice(query)
    return Array.from({ length: 6 }, (_, index) => ({
      id: `ebay-${index + 1}`,
      title: `${base} ${EBAY_TITLES[index % EBAY_TITLES.length]}`,
      price: Math.max(12, price + (index - 1) * 10 + Math.floor(Math.random() * 12)),
      image: EBAY_IMAGES[index % EBAY_IMAGES.length],
      platform: 'ebay',
      condition: index % 2 === 0 ? 'Neuf' : 'Occasion',
      bids: index % 2 === 0 ? undefined : 8 + Math.floor(Math.random() * 18),
      link: `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=${index + 1}`,
    }))
  },
}
