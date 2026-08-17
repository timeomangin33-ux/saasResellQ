export const PLAN_CONFIG = {
  FREE: {
    label: 'Découverte',
    credits: 0,
    price: 0,
    features: ['Accès limité au tableau de bord', "Pas d'analyse IA"],
  },
  STARTER: {
    label: 'Starter',
    credits: 250,
    price: 29,
    features: [
      '250 crédits IA par mois',
      'Analyses de marché essentielles',
      "Alertes de prix jusqu'à 5",
      'Rapports hebdomadaires',
      'Support par email',
    ],
  },
  PRO: {
    label: 'Pro',
    credits: 2000,
    price: 75,
    features: [
      '2 000 crédits IA par mois',
      'Analyses avancées',
      'Alertes illimitées',
      'Rapports quotidiens',
      'Support prioritaire',
      'Watchlists intelligentes',
    ],
  },
  BUSINESS: {
    label: 'Business',
    credits: 6000,
    price: 149,
    features: [
      '6 000 crédits IA par mois',
      'Tout du forfait Pro',
      'Multi-comptes Vinted',
      'Intégrations API et webhooks',
      'Automations avancées',
      'Accès Device Lab',
      'Support 24/7 prioritaire',
    ],
  },
} as const

export type PlanKey = keyof typeof PLAN_CONFIG

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
