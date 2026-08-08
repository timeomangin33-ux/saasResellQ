export interface MarketplaceProduct {
  id: string
  title: string
  price: number
  image: string
  platform: 'amazon'
  rating: number
  reviews: number
  availability: string
  link: string
}

const AMAZON_IMAGES = [
  'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
  'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
]

const AMAZON_TITLES = [
  'Prime Livraison',
  'Version 2025',
  'Pack 2',
  'Reconditionné comme neuf',
  'Offre premium',
]

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function getAmazonPrice(query: string) {
  const normalized = query.toLowerCase()
  if (/ps5|playstation|xbox|switch|console|nintendo|jeu/.test(normalized)) return 230 + Math.floor(Math.random() * 180)
  if (/iphone|samsung|galaxy|pixel|airpods|macbook|ipad|ordinateur|ordinateur portable/.test(normalized)) return 120 + Math.floor(Math.random() * 560)
  if (/sac|handbag|pochette|gucci|louis|chanel|mini/.test(normalized)) return 80 + Math.floor(Math.random() * 380)
  if (/jordan|air force|nike|adidas|sneaker|chaussures|new balance|converse|vans/.test(normalized)) return 45 + Math.floor(Math.random() * 140)
  if (/veste|manteau|robe|jean|hoodie|pull|chemise/.test(normalized)) return 25 + Math.floor(Math.random() * 95)
  return 35 + Math.floor(Math.random() * 120)
}

function getAmazonKeyword(query: string) {
  const normalized = query.trim()
  return normalized || 'Produit populaire'
}

export const AmazonProvider = {
  accessKey: process.env.AMAZON_ACCESS_KEY || '',
  secretKey: process.env.AMAZON_SECRET_KEY || '',
  region: process.env.AMAZON_REGION || 'us-east-1',

  async searchProducts(query: string): Promise<MarketplaceProduct[]> {
    const base = getAmazonKeyword(query)
    const price = getAmazonPrice(query)
    return Array.from({ length: 6 }, (_, index) => ({
      id: `amz-${index + 1}`,
      title: `${base} ${AMAZON_TITLES[index % AMAZON_TITLES.length]}`,
      price: Math.max(14, price + (index - 2) * 12 + Math.floor(Math.random() * 14)),
      image: AMAZON_IMAGES[index % AMAZON_IMAGES.length],
      platform: 'amazon',
      rating: Number((4 + Math.random() * 0.9).toFixed(1)),
      reviews: 120 + Math.floor(Math.random() * 2460),
      availability: index % 3 === 0 ? 'En stock' : 'Livraison 24h',
      link: `https://www.amazon.fr/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss_${index + 1}`,
    }))
  },
}
