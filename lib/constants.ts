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
 *
 * Retiré dans ce sens : les crédits IA, les rapports et les comptes Vinted
 * multiples. Les trois sont inertes en production — les fonctions IA et les
 * rapports appellent un service qui n'est pas configuré, et la connexion d'un
 * compte Vinted lance un navigateur Playwright dont le binaire n'existe pas sur
 * l'hébergement. Vendre une fonction qui repond « momentanement indisponible »
 * coute plus cher que ne pas la vendre.
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
    tokenLabel: '20 veilles · 5 alertes de prix',
    features: [
      'Prix demandés médians et fourchettes sur 15 catégories',
      'Opportunités notées, gain estimé en euros',
      '20 veilles',
      '5 alertes de prix',
      'Support par e-mail',
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
    tokenLabel: '250 veilles · alertes illimitées',
    features: [
      'Tout du forfait Starter',
      'Tendances par catégorie, mesurées sur plusieurs jours',
      '250 veilles',
      'Alertes illimitées',
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
    description: 'Pour suivre un grand nombre de références et leur évolution dans le temps.',
    badge: 'Business',
    highlight: false,
    cta: 'Devenir Business',
    tokenLabel: 'Veilles illimitées · historique des prix',
    features: [
      'Tout du forfait Pro',
      'Historique des prix et courbes par catégorie',
      'Veilles illimitées',
      'Support prioritaire',
    ],
    businessExtras: [],
  },
] as const

/**
 * Ce qu'on montre à quelqu'un qui crée son compte.
 *
 * L'ancienne liste promettait « Agent IA illimité », « Insights et prédictions
 * de marché » et « Export CSV / Excel / PDF ». Aucun des trois n'existe : les
 * agents IA passent par un service qui n'est pas configuré, il n'y a pas de
 * moteur de prédiction, et le seul export écrit du texte brut. Promettre ça à
 * l'inscription, c'est se faire juger sur l'écart dès la première minute.
 */
export const PLAN_FEATURES = [
  'Prix demandés médians par catégorie et par marque',
  'La fourchette où tient la moitié des annonces',
  'Opportunités notées, avec le gain estimé en euros',
  'Veilles et alertes de prix',
  'Historique des prix et courbes par catégorie',
  'Prix demandés uniquement : Vinted ne publie aucune transaction',
] as const
