export const PRICING = {
  amount: 75,
  currency: '€',
  period: 'mois',
  label: '75€/mois',
  planName: 'ResellQ Pro',
} as const

/**
 * Ce que chaque forfait donne réellement, et rien d'autre.
 *
 * Les limites citées ici sont celles que PLAN_LIMITS applique vraiment dans
 * lib/plans.ts. Tout ce qui n'est pas adossé à du code exécuté a été retiré :
 * une page de tarifs est un engagement contractuel, pas un argumentaire.
 */
export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    currency: '€',
    period: 'mois',
    description: 'Pour commencer avec un accès simple et efficace.',
    badge: 'Essentiel',
    highlight: false,
    cta: 'Commencer',
    tokenLabel: '250 crédits IA / mois',
    features: [
      'Prix moyens, médians et tendances par catégorie',
      '20 veilles',
      '5 alertes de prix',
      'Rapports hebdomadaires',
      '1 compte Vinted connecté',
    ],
    businessExtras: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 75,
    currency: '€',
    period: 'mois',
    description: 'Le bon équilibre entre outils et performance.',
    badge: 'Le plus choisi',
    highlight: true,
    cta: 'Passer au Pro',
    tokenLabel: '2 000 crédits IA / mois',
    features: [
      'Tout du forfait Starter',
      '250 veilles',
      'Alertes illimitées',
      'Rapports hebdomadaires et quotidiens',
      'Support prioritaire',
    ],
    businessExtras: [],
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    currency: '€',
    period: 'mois',
    description: 'Pour ceux qui suivent plusieurs comptes et beaucoup de références.',
    badge: 'Business',
    highlight: false,
    cta: 'Devenir Business',
    tokenLabel: '6 000 crédits IA / mois',
    features: [
      'Tout du forfait Pro',
      'Historique des prix et courbes par catégorie',
      'Veilles illimitées',
      'Comptes Vinted illimités',
      'Rapports hebdomadaires, quotidiens et mensuels',
    ],
    businessExtras: [],
  },
] as const

export const PLAN_FEATURES = [
  'Tableau de bord analytique premium',
  'Top ventes sur toutes les catégories',
  'Recherche produit illimitée',
  'Agent IA illimité',
  'Deal Finder et opportunités',
  'Insights et prédictions de marché',
  'Export CSV / Excel / PDF',
  'Listes de suivi et alertes',
  'Support prioritaire',
] as const
