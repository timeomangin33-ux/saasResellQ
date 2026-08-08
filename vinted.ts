// Service Vinted - Données de marché en temps réel
// En production: connecter à l'API Vinted ou un scraper

export interface VintedItem {
  id: string
  title: string
  price: number
  brand: string
  size: string
  category: string
  subcategory?: string
  views: number
  favorites: number
  sold: boolean
  soldAt?: Date
  listedAt: Date
  image: string
  seller: string
  condition: string
  profit_margin?: number
  demand_score?: number
}

export interface CategoryStats {
  id: string
  name: string
  slug: string
  icon: string
  totalSales: number
  averagePrice: number
  totalRevenue: number
  growthRate: number
  topBrands: string[]
  demandScore: number
}

export interface TrendingItem {
  id: string
  title: string
  price: number
  originalPrice?: number
  brand: string
  category: string
  image: string
  url?: string
  seller?: string
  sales: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  profitMargin: number
  demandScore: number
  timesSold: number
}

// Catégories Vinted complètes
export const VINTED_CATEGORIES: CategoryStats[] = [
  {
    id: '1',
    name: 'Femmes',
    slug: 'femmes',
    icon: '👗',
    totalSales: 45820,
    averagePrice: 18.5,
    totalRevenue: 847970,
    growthRate: 12.4,
    topBrands: ['Zara', 'H&M', 'Mango', 'Shein', 'ASOS'],
    demandScore: 94,
  },
  {
    id: '2',
    name: 'Hommes',
    slug: 'hommes',
    icon: '👔',
    totalSales: 28340,
    averagePrice: 22.3,
    totalRevenue: 631982,
    growthRate: 8.7,
    topBrands: ['Nike', 'Adidas', 'Zara', 'H&M', 'Pull&Bear'],
    demandScore: 82,
  },
  {
    id: '3',
    name: 'Enfants',
    slug: 'enfants',
    icon: '🧒',
    totalSales: 32150,
    averagePrice: 12.8,
    totalRevenue: 411520,
    growthRate: 15.2,
    topBrands: ['Zara Kids', 'H&M', 'Tape à l\'œil', 'Sergent Major', 'Gap'],
    demandScore: 88,
  },
  {
    id: '4',
    name: 'Chaussures',
    slug: 'chaussures',
    icon: '👟',
    totalSales: 19870,
    averagePrice: 35.6,
    totalRevenue: 707372,
    growthRate: 18.9,
    topBrands: ['Nike', 'Adidas', 'New Balance', 'Converse', 'Vans'],
    demandScore: 91,
  },
  {
    id: '5',
    name: 'Sacs & Accessoires',
    slug: 'sacs',
    icon: '👜',
    totalSales: 15430,
    averagePrice: 48.2,
    totalRevenue: 743726,
    growthRate: 22.1,
    topBrands: ['Louis Vuitton', 'Gucci', 'Michael Kors', 'Longchamp', 'Coach'],
    demandScore: 95,
  },
  {
    id: '6',
    name: 'Électronique',
    slug: 'electronique',
    icon: '📱',
    totalSales: 8920,
    averagePrice: 125.4,
    totalRevenue: 1118568,
    growthRate: 31.5,
    topBrands: ['Apple', 'Samsung', 'Sony', 'Nintendo', 'Bose'],
    demandScore: 97,
  },
  {
    id: '7',
    name: 'Maison & Jardin',
    slug: 'maison',
    icon: '🏠',
    totalSales: 11250,
    averagePrice: 28.9,
    totalRevenue: 325125,
    growthRate: 9.3,
    topBrands: ['IKEA', 'Zara Home', 'H&M Home', 'Maisons du Monde', 'La Redoute'],
    demandScore: 73,
  },
  {
    id: '8',
    name: 'Beauté & Santé',
    slug: 'beaute',
    icon: '💄',
    totalSales: 9840,
    averagePrice: 15.6,
    totalRevenue: 153504,
    growthRate: 25.8,
    topBrands: ['Charlotte Tilbury', 'MAC', 'Urban Decay', 'Fenty', 'Dior Beauty'],
    demandScore: 86,
  },
  {
    id: '9',
    name: 'Sport & Loisirs',
    slug: 'sport',
    icon: '⚽',
    totalSales: 13670,
    averagePrice: 32.1,
    totalRevenue: 438807,
    growthRate: 14.6,
    topBrands: ['Nike', 'Adidas', 'Decathlon', 'Under Armour', 'The North Face'],
    demandScore: 85,
  },
  {
    id: '10',
    name: 'Livres & Médias',
    slug: 'livres',
    icon: '📚',
    totalSales: 22340,
    averagePrice: 6.8,
    totalRevenue: 151912,
    growthRate: 3.2,
    topBrands: [],
    demandScore: 62,
  },
  {
    id: '11',
    name: 'Jeux & Jouets',
    slug: 'jeux',
    icon: '🎮',
    totalSales: 7850,
    averagePrice: 22.4,
    totalRevenue: 175840,
    growthRate: 11.7,
    topBrands: ['LEGO', 'Nintendo', 'Playmobil', 'Barbie', 'Hot Wheels'],
    demandScore: 79,
  },
  {
    id: '12',
    name: 'Montres & Bijoux',
    slug: 'montres',
    icon: '⌚',
    totalSales: 6430,
    averagePrice: 85.3,
    totalRevenue: 548479,
    growthRate: 28.4,
    topBrands: ['Casio', 'Swatch', 'Daniel Wellington', 'Fossil', 'Tissot'],
    demandScore: 92,
  },
  {
    id: '13',
    name: 'Vintage',
    slug: 'vintage',
    icon: '🧥',
    totalSales: 5120,
    averagePrice: 42.7,
    totalRevenue: 218624,
    growthRate: 34.1,
    topBrands: ['Levi\'s', 'The North Face', 'Arc\'teryx', 'MCM', 'Gucci'],
    demandScore: 93,
  },
  {
    id: '14',
    name: 'Bijoux',
    slug: 'bijoux',
    icon: '💍',
    totalSales: 3240,
    averagePrice: 61.2,
    totalRevenue: 198053,
    growthRate: 27.2,
    topBrands: ['Swarovski', 'Missoma', 'Sophie Bille Brahe', 'Tiffany', 'Cartier'],
    demandScore: 90,
  },
  {
    id: '15',
    name: 'Accessoires',
    slug: 'accessoires',
    icon: '🧢',
    totalSales: 4480,
    averagePrice: 26.4,
    totalRevenue: 118272,
    growthRate: 21.5,
    topBrands: ['Ray-Ban', 'Gucci', 'Smythson', 'Longchamp', 'Fendi'],
    demandScore: 89,
  },
]

// Top ventes simulées
export const TRENDING_ITEMS: TrendingItem[] = [
  {
    id: '1',
    title: 'Nike Air Force 1 Blanc',
    price: 65,
    originalPrice: 110,
    brand: 'Nike',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    sales: 847,
    trend: 'up',
    trendPercent: 34.2,
    profitMargin: 41,
    demandScore: 98,
    timesSold: 847,
  },
  {
    id: '2',
    title: 'Veste Levi\'s 501 Vintage',
    price: 45,
    originalPrice: 120,
    brand: 'Levi\'s',
    category: 'Femmes',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
    sales: 623,
    trend: 'up',
    trendPercent: 28.7,
    profitMargin: 62,
    demandScore: 96,
    timesSold: 623,
  },
  {
    id: '3',
    title: 'iPhone 13 Pro 256GB',
    price: 580,
    originalPrice: 1179,
    brand: 'Apple',
    category: 'Électronique',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400',
    sales: 412,
    trend: 'up',
    trendPercent: 45.1,
    profitMargin: 38,
    demandScore: 99,
    timesSold: 412,
  },
  {
    id: '4',
    title: 'Sac Louis Vuitton Speedy',
    price: 420,
    originalPrice: 1200,
    brand: 'Louis Vuitton',
    category: 'Sacs & Accessoires',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    sales: 289,
    trend: 'up',
    trendPercent: 52.3,
    profitMargin: 65,
    demandScore: 97,
    timesSold: 289,
  },
  {
    id: '5',
    title: 'Adidas Gazelle OG',
    price: 55,
    originalPrice: 100,
    brand: 'Adidas',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400',
    sales: 756,
    trend: 'up',
    trendPercent: 22.8,
    profitMargin: 45,
    demandScore: 94,
    timesSold: 756,
  },
  {
    id: '6',
    title: 'Manteau Zara Camel',
    price: 35,
    originalPrice: 89,
    brand: 'Zara',
    category: 'Femmes',
    image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400',
    sales: 534,
    trend: 'up',
    trendPercent: 18.4,
    profitMargin: 35,
    demandScore: 91,
    timesSold: 534,
  },
  {
    id: '7',
    title: 'AirPods Pro 2ème Gen',
    price: 145,
    originalPrice: 279,
    brand: 'Apple',
    category: 'Électronique',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400',
    sales: 378,
    trend: 'up',
    trendPercent: 38.9,
    profitMargin: 48,
    demandScore: 96,
    timesSold: 378,
  },
  {
    id: '8',
    title: 'Hoodie Champion Vintage',
    price: 28,
    originalPrice: 65,
    brand: 'Champion',
    category: 'Hommes',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
    sales: 892,
    trend: 'stable',
    trendPercent: 2.1,
    profitMargin: 57,
    demandScore: 89,
    timesSold: 892,
  },
  {
    id: '9',
    title: 'New Balance 574 Gris',
    price: 48,
    originalPrice: 95,
    brand: 'New Balance',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    sales: 645,
    trend: 'up',
    trendPercent: 41.6,
    profitMargin: 49,
    demandScore: 95,
    timesSold: 645,
  },
  {
    id: '10',
    title: 'Robe Vintage Fleurie',
    price: 22,
    originalPrice: 55,
    brand: 'Vintage',
    category: 'Femmes',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    sales: 423,
    trend: 'up',
    trendPercent: 15.7,
    profitMargin: 60,
    demandScore: 87,
    timesSold: 423,
  },
  {
    id: '11',
    title: 'Montre Casio Vintage Gold',
    price: 35,
    originalPrice: 75,
    brand: 'Casio',
    category: 'Montres & Bijoux',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
    sales: 312,
    trend: 'up',
    trendPercent: 29.4,
    profitMargin: 53,
    demandScore: 90,
    timesSold: 312,
  },
  {
    id: '12',
    title: 'Jordan 1 Retro High',
    price: 185,
    originalPrice: 180,
    brand: 'Jordan',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
    sales: 198,
    trend: 'up',
    trendPercent: 67.3,
    profitMargin: 72,
    demandScore: 99,
    timesSold: 198,
  },
  {
    id: '13',
    title: 'Pantalon Carhartt WIP',
    price: 42,
    originalPrice: 130,
    brand: 'Carhartt',
    category: 'Hommes',
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
    sales: 287,
    trend: 'up',
    trendPercent: 24.5,
    profitMargin: 67,
    demandScore: 88,
    timesSold: 287,
  },
  {
    id: '14',
    title: 'Doudoune The North Face',
    price: 78,
    originalPrice: 200,
    brand: 'The North Face',
    category: 'Sport & Loisirs',
    image: 'https://images.unsplash.com/photo-1547624643-3bf761b09502?w=400',
    sales: 356,
    trend: 'up',
    trendPercent: 33.8,
    profitMargin: 61,
    demandScore: 93,
    timesSold: 356,
  },
  {
    id: '15',
    title: 'Set LEGO Technic',
    price: 45,
    originalPrice: 120,
    brand: 'LEGO',
    category: 'Jeux & Jouets',
    image: 'https://images.unsplash.com/photo-1521185496955-15097b20c5fe?w=400',
    sales: 234,
    trend: 'stable',
    trendPercent: 5.2,
    profitMargin: 62,
    demandScore: 82,
    timesSold: 234,
  },
  {
    id: '16',
    title: 'Vans Old Skool Noir',
    price: 38,
    originalPrice: 80,
    brand: 'Vans',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400',
    sales: 567,
    trend: 'up',
    trendPercent: 19.2,
    profitMargin: 52,
    demandScore: 90,
    timesSold: 567,
  },
  {
    id: '17',
    title: 'Blazer H&M Premium',
    price: 25,
    originalPrice: 60,
    brand: 'H&M',
    category: 'Femmes',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    sales: 389,
    trend: 'stable',
    trendPercent: 3.8,
    profitMargin: 58,
    demandScore: 84,
    timesSold: 389,
  },
  {
    id: '18',
    title: 'Samsung Galaxy S23',
    price: 420,
    originalPrice: 899,
    brand: 'Samsung',
    category: 'Électronique',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
    sales: 267,
    trend: 'up',
    trendPercent: 28.1,
    profitMargin: 53,
    demandScore: 93,
    timesSold: 267,
  },
  {
    id: '19',
    title: 'Ceinture Gucci Web',
    price: 120,
    originalPrice: 390,
    brand: 'Gucci',
    category: 'Sacs & Accessoires',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    sales: 178,
    trend: 'up',
    trendPercent: 44.7,
    profitMargin: 69,
    demandScore: 96,
    timesSold: 178,
  },
  {
    id: '20',
    title: 'Tshirt Vetements Oversized',
    price: 55,
    originalPrice: 280,
    brand: 'Vetements',
    category: 'Hommes',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400',
    sales: 145,
    trend: 'up',
    trendPercent: 78.4,
    profitMargin: 80,
    demandScore: 98,
    timesSold: 145,
  },
]

export interface TrendingBrand {
  brand: string
  category: string
  productCount: number
  totalSales: number
  averageDemandScore: number
}

export type ScoredTrendingItem = TrendingItem & { score: number }

export function getTopProducts(limit = 20): ScoredTrendingItem[] {
  // Build a candidate pool starting with trending items
  const pool: TrendingItem[] = [...TRENDING_ITEMS]

  // If we don't have enough real trending items, generate placeholders across all categories
  if (pool.length < limit) {
    const perCategory = Math.max(1, Math.ceil((limit - pool.length) / Math.max(1, VINTED_CATEGORIES.length)))
    for (const cat of VINTED_CATEGORIES) {
      pool.push(...generatePlaceholderProducts(cat.name, perCategory))
      if (pool.length >= limit * 3) break // safety cap to avoid huge pools
    }
  }

  // Deduplicate by id (keep first seen)
  const seen = new Set<string>()
  const uniquePool = pool.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  // Score and sort
  return uniquePool
    .map((item) => ({
      ...item,
      score: item.sales * (item.demandScore / 100) + item.profitMargin * 7 + (item.trendPercent || 0) * 0.5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function getTopCategories(limit = 20) {
  return [...VINTED_CATEGORIES]
    .sort((a, b) => b.demandScore - a.demandScore || b.totalSales - a.totalSales)
    .slice(0, limit)
}

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const CATEGORY_PLACEHOLDER_TEMPLATES: Record<string, string[]> = {
  femmes: ['Robe', 'T-shirt', 'Jean', 'Veste', 'Robe de soirée', 'Top', 'Jupe', 'Pull', 'Short', 'Blazer'],
  hommes: ['T-shirt', 'Jean', 'Veste', 'Sneakers', 'Chemise', 'Pantalon', 'Pull', 'Hoodie', 'Short', 'Blouson'],
  enfants: ['Pyjama', 'Baskets', 'Jean', 'T-shirt', 'Robe', 'Pull', 'Combinaison', 'Short', 'Veste', 'Chaussons'],
  chaussures: ['Sneakers', 'Bottines', 'Sandales', 'Mocassins', 'Baskets', 'Tongs', 'Chaussures de ville', 'Derbies', 'Bottes', 'Loafers'],
  sacs: ['Sac à main', 'Sac bandoulière', 'Sac cabas', 'Pochette', 'Sac de voyage', 'Tote bag', 'Sac ceinture', 'Pochettes', 'Portefeuille', 'Sac à dos'],
  electronique: ['Smartphone', 'Écouteurs', 'Chargeur', 'Tablette', 'Appareil photo', 'Montre connectée', 'Enceinte', 'Console', 'Casque', 'Caméra'],
  maison: ['Lampe', 'Tapis', 'Cadre', 'Coussin', 'Couverture', 'Service de vaisselle', 'Bougie', 'Miroir', 'Rideaux', 'Support de plantes'],
  beaute: ['Parfum', 'Sérum', 'Crème', 'Fond de teint', 'Rouge à lèvres', 'Palette', 'Mascara', 'Baume', 'Huile', 'Masque'],
  sport: ['Maillot', 'Baskets', 'Short', 'Sweat', 'Veste de sport', 'Bouteille', 'Casquette', 'Sacs de sport', 'Tapis de yoga', 'Lunettes de natation'],
  livres: ['Roman', 'BD', 'Guide pratique', 'Livre de cuisine', 'Manga', 'Livre jeunesse', 'Essai', 'Album', 'Livre vintage', 'Best-seller'],
  jeux: ['Peluche', 'Jeu de société', 'Figurine', 'Puzzle', 'Voiture miniature', 'Doll', 'Jeu éducatif', 'Poupée', 'Casse-tête', 'Kit créatif'],
  jouets: ['Peluche', 'Jeu de société', 'Figurine', 'Puzzle', 'Voiture miniature', 'Doll', 'Jeu éducatif', 'Poupée', 'Casse-tête', 'Kit créatif'],
  montres: ['Montre Casio', 'Montre Swatch', 'Bracelet', 'Collier fin', 'Bague'],
  bijoux: ['Collier', 'Boucles d&apos;oreilles', 'Montre fine', 'Bracelet', 'Bague'],
  accessoires: ['Ceinture', 'Lunettes', 'Chapeau', 'Gants', 'Foulard'],
  vintage: ['Veste vintage', 'Sac rétro', 'Accessoire ancien', 'Jean Levi\'s', 'Chemise rétro']
}

const getCategoryPlaceholderBrands = (categoryName: string) => {
  const matched = VINTED_CATEGORIES.find((item) => normalizeText(item.name) === normalizeText(categoryName) || normalizeText(item.slug) === normalizeText(categoryName))
  if (matched && matched.topBrands.length > 0) {
    return matched.topBrands
  }

  return ['Marque X', 'Brandy', 'Vintage', 'Local', 'Premium']
}

const generatePlaceholderProducts = (categoryName: string, count: number): TrendingItem[] => {
  const normalizedCategory = normalizeText(categoryName)
  const templates = CATEGORY_PLACEHOLDER_TEMPLATES[normalizedCategory] ?? ['Produit', 'Article', 'Lot', 'Édition limitée', 'Vintage']
  const brands = getCategoryPlaceholderBrands(categoryName)
  const averagePrice = Math.max(10, Math.round((VINTED_CATEGORIES.find((item) => normalizeText(item.name) === normalizedCategory || normalizeText(item.slug) === normalizedCategory)?.averagePrice || 20) * 1.1))

  return Array.from({ length: count }, (_, index) => {
    const title = `${templates[index % templates.length]} ${brands[index % brands.length]}`
    const price = Math.max(1, Math.round((averagePrice * (0.8 + (index % 5) * 0.08)) * 10) / 10)
    const demandScore = 60 + (index % 40)
    const trendPercent = 10 + (index % 25)
    const profitMargin = Math.round(25 + (index % 35))

    return {
      id: `placeholder-${normalizedCategory}-${index + 1}`,
      title,
      price,
      brand: brands[index % brands.length],
      category: categoryName,
      image: `https://images.unsplash.com/photo-1503602642458-232111445657?w=400&auto=format&fit=crop&q=80&${index}`,
      url: '#',
      seller: 'Vendeur Vinted',
      sales: 20 + index * 3,
      trend: 'up' as const,
      trendPercent,
      profitMargin,
      demandScore,
      timesSold: 50 + index * 5,
    }
  })
}

export function getProductsByCategory(category: string, limit = 20) {
  if (!category) {
    return getTopProducts(limit)
  }

  const normalizedCategory = normalizeText(category)
  const matchedCategory = VINTED_CATEGORIES.find((item) =>
    normalizeText(item.slug) === normalizedCategory || normalizeText(item.name) === normalizedCategory
  )

  const scoredItems = [...TRENDING_ITEMS]
    .filter((item) => {
      const itemCategory = normalizeText(item.category)
      const itemBrand = normalizeText(item.brand)
      const matchesCategory = itemCategory === normalizedCategory || (matchedCategory && itemCategory === normalizeText(matchedCategory.name))
      return matchesCategory || itemBrand === normalizedCategory
    })
    .map((item) => ({
      ...item,
      score: item.sales * (item.demandScore / 100) + item.profitMargin * 8 + item.trendPercent * 0.8,
    }))

  const topItems = scoredItems.sort((a, b) => b.score - a.score).slice(0, limit)
  if (topItems.length >= limit) {
    return topItems
  }

  const placeholders = generatePlaceholderProducts(matchedCategory?.name ?? category, limit - topItems.length)
  return [...topItems, ...placeholders]
}

export function getTrendingBrands(limit = 20) {
  const map = new Map<string, { brand: string; category: string; productCount: number; totalSales: number; demandScore: number }>()

  TRENDING_ITEMS.forEach((item) => {
    const key = item.brand.toLowerCase()
    const entry = map.get(key)

    if (entry) {
      entry.productCount += 1
      entry.totalSales += item.sales
      entry.demandScore += item.demandScore
    } else {
      map.set(key, {
        brand: item.brand,
        category: item.category,
        productCount: 1,
        totalSales: item.sales,
        demandScore: item.demandScore,
      })
    }
  })

  return Array.from(map.values())
    .map((brand) => ({
      ...brand,
      averageDemandScore: Math.round((brand.demandScore / brand.productCount) * 10) / 10,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit)
}

// Données graphique des 12 derniers mois
export const SALES_CHART_DATA = [
  { month: 'Jan', sales: 12400, revenue: 248000, items: 1240 },
  { month: 'Fév', sales: 14200, revenue: 284000, items: 1420 },
  { month: 'Mar', sales: 15800, revenue: 316000, items: 1580 },
  { month: 'Avr', sales: 16500, revenue: 330000, items: 1650 },
  { month: 'Mai', sales: 18200, revenue: 364000, items: 1820 },
  { month: 'Jun', sales: 19800, revenue: 396000, items: 1980 },
  { month: 'Jul', sales: 17600, revenue: 352000, items: 1760 },
  { month: 'Aoû', sales: 16900, revenue: 338000, items: 1690 },
  { month: 'Sep', sales: 20100, revenue: 402000, items: 2010 },
  { month: 'Oct', sales: 22400, revenue: 448000, items: 2240 },
  { month: 'Nov', sales: 25800, revenue: 516000, items: 2580 },
  { month: 'Déc', sales: 28900, revenue: 578000, items: 2890 },
]

export async function searchVintedItems(query: string, category?: string): Promise<TrendingItem[]> {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return getTopProducts(8)
  }

  const categoryKeywords: Record<string, string[]> = {
    chaussures: ['sneaker', 'air force', 'jordan', 'adidas', 'nike', 'converse', 'vans', 'basket'],
    'sacs & accessoires': ['sac', 'handbag', 'pochette', 'louis', 'gucci', 'chanel', 'bag'],
    vêtements: ['veste', 'manteau', 'robe', 'jean', 'pull', 'hoodie', 'top', 'chemise'],
    électronique: ['iphone', 'samsung', 'galaxy', 'ps5', 'playstation', 'nintendo', 'airpods', 'macbook', 'console'],
    montres: ['montre', 'casio', 'swatch', 'seiko'],
  }

  const brandKeywords: Record<string, string> = {
    nike: 'Nike',
    adidas: 'Adidas',
    levis: 'Levi\'s',
    gucci: 'Gucci',
    'louis vuitton': 'Louis Vuitton',
    apple: 'Apple',
    champion: 'Champion',
    jordan: 'Jordan',
    casio: 'Casio',
    converse: 'Converse',
  }

  const resolveCategory = () => {
    for (const [categoryKey, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => normalizedQuery.includes(keyword))) {
        return categoryKey === 'vêtements' ? 'Femmes' : categoryKey === 'montres' ? 'Montres & Bijoux' : categoryKey === 'chaussures' ? 'Chaussures' : categoryKey === 'sacs & accessoires' ? 'Sacs & Accessoires' : 'Électronique'
      }
    }
    return undefined
  }

  const resolveBrand = () => {
    for (const [keyword, brand] of Object.entries(brandKeywords)) {
      if (normalizedQuery.includes(keyword)) {
        return brand
      }
    }
    return undefined
  }

  const targetCategory = resolveCategory()
  const targetBrand = resolveBrand()

  const results = TRENDING_ITEMS.filter((item) => {
    const matchesTitle = item.title.toLowerCase().includes(normalizedQuery)
    const matchesBrand = item.brand.toLowerCase().includes(normalizedQuery)
    const matchesCategoryName = item.category.toLowerCase().includes(normalizedQuery)
    const matchesResolvedBrand = targetBrand ? item.brand === targetBrand : false
    const matchesResolvedCategory = targetCategory ? item.category === targetCategory : false
    const matchesUserCategory = !category || item.category.toLowerCase() === category.toLowerCase()
    return (matchesTitle || matchesBrand || matchesCategoryName || matchesResolvedBrand || matchesResolvedCategory) && matchesUserCategory
  })

  if (results.length > 0) {
    return results.slice(0, 12)
  }

  const fallback = TRENDING_ITEMS.filter((item) => {
    if (targetBrand && item.brand === targetBrand) return true
    if (targetCategory && item.category === targetCategory) return true
    return false
  }).slice(0, 8)

  if (fallback.length > 0) {
    return fallback
  }

  return TRENDING_ITEMS.slice(0, 8).map((item, index) => ({
    ...item,
    title: `${query.trim()} ${index === 0 ? 'Vintage' : 'Edition limitée'}`,
  }))
}

export function getOpportunities(): TrendingItem[] {
  return TRENDING_ITEMS.filter(item => item.profitMargin > 50 && item.demandScore > 85)
    .sort((a, b) => b.profitMargin - a.profitMargin)
}
