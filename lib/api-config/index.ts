// Configuration centralisée pour toutes les APIs externes
// À compléter avec tes vraies clés dans .env.local

export const API_CONFIG = {
  // OpenAI - Pour l'IA Agent
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    baseUrl: 'https://api.openai.com/v1',
  },

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: process.env.GROQ_BASE_URL || '',
  },

  // OpenRouter
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://api.openrouter.ai',
  },

  // Vinted integration via session cookies and scraping
  vinted: {
    baseUrl: 'https://www.vinted.fr',
  },

  // eBay
  ebay: {
    clientId: process.env.EBAY_CLIENT_ID || '',
    clientSecret: process.env.EBAY_CLIENT_SECRET || '',
  },

  // Amazon
  amazon: {
    accessKey: process.env.AMAZON_ACCESS_KEY || '',
    secretKey: process.env.AMAZON_SECRET_KEY || '',
  },

  // Stripe (déjà configuré via STRIPE_*)
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },

  // Supabase (pour la DB optionnelle)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  // PostHog
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
  },
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
}

export function validateApiConfig() {
  const required = ['openai', 'stripe', 'database']
  const missing: string[] = []

  required.forEach((key) => {
    const config = API_CONFIG[key as keyof typeof API_CONFIG]
    if (!config || !Object.values(config).some((v) => v)) {
      missing.push(key)
    }
  })

  return { valid: missing.length === 0, missing }
}
