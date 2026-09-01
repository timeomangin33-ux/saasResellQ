/**
 * Les catégories Vinted suivies par défaut.
 *
 * Ce fichier faisait mille sept cents lignes. Il contenait vingt « produits
 * tendance » écrits à la main (« Nike Air Jordan 1 Retro », « Ceinture Gucci
 * Web »…) avec photos de banque d'images, des statistiques inventées par
 * catégorie — 45 820 ventes, 847 970 € de chiffre d'affaires, score de demande
 * 94 —, un générateur d'articles factices, douze mois de courbe de ventes
 * fabriquée, et six fonctions qui servaient tout cela aux pages du site.
 *
 * Rien de tout cela n'a jamais été mesuré. Les pages lisent maintenant les
 * annonces réellement collectées ; ces fonctions n'étaient plus appelées, mais
 * un fichier plein de faux chiffres prêts à l'emploi finit toujours par être
 * rebranché par quelqu'un qui cherche à remplir un tableau vide.
 *
 * Il ne reste que ce qui est vrai : la liste des catégories, leur nom
 * d'affichage, leur adresse et leur emblème. Les chiffres de chaque catégorie
 * viennent de la table `CategoryMarket`, que le robot met à jour.
 */

export interface CategorieVinted {
  id: string
  /** Le nom sous lequel les annonces sont rangées en base. */
  name: string
  /** Le nom dans l'adresse de la page. */
  slug: string
  icon: string
}

/** Conservé sous son ancien nom : c'est ainsi que le reste du code l'importe. */
export type CategoryStats = CategorieVinted

export const VINTED_CATEGORIES: CategorieVinted[] = [
  { id: '1', name: 'Femmes', slug: 'femmes', icon: '👗' },
  { id: '2', name: 'Hommes', slug: 'hommes', icon: '👔' },
  { id: '3', name: 'Enfants', slug: 'enfants', icon: '🧒' },
  { id: '4', name: 'Chaussures', slug: 'chaussures', icon: '👟' },
  { id: '5', name: 'Sacs & Accessoires', slug: 'sacs', icon: '👜' },
  { id: '6', name: 'Électronique', slug: 'electronique', icon: '📱' },
  { id: '7', name: 'Maison & Jardin', slug: 'maison', icon: '🏠' },
  { id: '8', name: 'Beauté & Santé', slug: 'beaute', icon: '💄' },
  { id: '9', name: 'Sport & Loisirs', slug: 'sport', icon: '⚽' },
  { id: '10', name: 'Livres & Médias', slug: 'livres', icon: '📚' },
  { id: '11', name: 'Jeux & Jouets', slug: 'jeux', icon: '🎮' },
  { id: '12', name: 'Montres & Bijoux', slug: 'montres', icon: '⌚' },
  { id: '13', name: 'Vintage', slug: 'vintage', icon: '🧥' },
  { id: '14', name: 'Bijoux', slug: 'bijoux', icon: '💍' },
  { id: '15', name: 'Accessoires', slug: 'accessoires', icon: '🧢' },
]

/** Résout un slug ou un nom affiché vers le nom utilisé en base. */
export function resoudreCategorie(demande: string): string {
  const normalise = demande
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

  const trouvee = VINTED_CATEGORIES.find((c) => {
    const slug = c.slug.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const nom = c.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    return slug === normalise || nom === normalise
  })

  return trouvee?.name ?? demande
}
