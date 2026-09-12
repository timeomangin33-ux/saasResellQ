/**
 * Ce que chaque forfait donne, et uniquement ce qui s'exécute.
 *
 * Trois promesses ont ete retirees de ces listes, apres verification dans le
 * code plutot que dans l'intention :
 *
 *  - les credits IA et les rapports. Toutes les fonctions IA passent par des
 *    agents n8n et `N8N_WEBHOOK_BASE_URL` n'est configure nulle part : chaque
 *    appel debitait des credits puis repondait « momentanement indisponible ».
 *  - le multi-comptes Vinted. `lib/playwright-vinted.ts` fait
 *    `chromium.launch()`, et le binaire Chromium n'existe pas sur l'hebergement
 *    serverless : la connexion d'un compte ne peut pas aboutir en production.
 *
 * Le champ `credits` reste : le compteur interne s'en sert. Ce sont les
 * *promesses de vente* qui disparaissent, pas la mecanique. Le jour ou ces
 * fonctions repondent vraiment, on remet les lignes.
 */
export const PLAN_CONFIG = {
  FREE: {
    label: 'Découverte',
    credits: 0,
    price: 0,
    features: ['Prix demandés par catégorie et par marque', 'Ni veille ni alerte'],
  },
  STARTER: {
    label: 'Starter',
    credits: 250,
    price: 29,
    features: [
      'Prix demandés médians et fourchettes sur 15 catégories',
      'Opportunités notées, gain estimé en euros',
      "Alertes de prix jusqu'à 5",
      "Veilles jusqu'à 20 articles",
      'Support par e-mail',
    ],
  },
  PRO: {
    label: 'Pro',
    credits: 2000,
    price: 75,
    features: [
      'Tout du forfait Starter',
      'Tendances par catégorie, mesurées sur plusieurs jours',
      'Alertes illimitées',
      'Veilles jusqu\'à 250',
      'Support prioritaire',
    ],
  },
  BUSINESS: {
    label: 'Business',
    credits: 6000,
    price: 149,
    features: [
      'Tout du forfait Pro',
      'Historique des prix et courbes par catégorie',
      'Veilles illimitées',
      'Support prioritaire',
    ],
  },
} as const

export type PlanKey = keyof typeof PLAN_CONFIG

/**
 * Concrete, enforced limits per plan — these back the feature bullets shown
 * on the pricing page (e.g. "Alertes de prix jusqu'à 5", "Watchlist 20
 * articles"), which previously weren't actually checked anywhere.
 */
export const PLAN_LIMITS = {
  FREE: { watchlists: 0, alerts: 0, vintedAccounts: 0, reportTypes: [] as string[] },
  STARTER: { watchlists: 20, alerts: 5, vintedAccounts: 1, reportTypes: ['weekly'] as string[] },
  PRO: { watchlists: 250, alerts: Infinity, vintedAccounts: 1, reportTypes: ['weekly', 'daily'] as string[] },
  BUSINESS: { watchlists: Infinity, alerts: Infinity, vintedAccounts: Infinity, reportTypes: ['weekly', 'daily', 'monthly'] as string[] },
} as const

export function getPlanLimits(plan?: string) {
  return PLAN_LIMITS[normalizePlan(plan)]
}

export function normalizePlan(plan?: string): PlanKey {
  if (!plan) return 'FREE'
  const normalized = plan.toString().trim().toUpperCase()
  if (normalized === '29' || normalized === 'STARTER') return 'STARTER'
  if (normalized === '149' || normalized === 'BUSINESS') return 'BUSINESS'
  if (normalized === '75' || normalized === 'PRO') return 'PRO'
  return 'FREE'
}

export function planFromCheckout(plan?: string): PlanKey {
  return normalizePlan(plan)
}

export function getPlanConfig(plan?: string) {
  const planKey = normalizePlan(plan)
  return PLAN_CONFIG[planKey]
}

export function nextMonthlyReset(from = new Date()) {
  const next = new Date(from)
  next.setMonth(next.getMonth() + 1)
  return next
}
