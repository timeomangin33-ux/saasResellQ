import { redirect } from 'next/navigation'

/**
 * `/deal-finder` était une seconde page « opportunités », plus ancienne et plus
 * pauvre : mêmes appels (`/api/vinted/opportunities`, `/api/vinted/top-categories`),
 * mêmes lignes, moins de colonnes — ni taille, ni vendeur, ni date de mise en
 * ligne, ni tri. Elle n'était liée depuis aucun écran.
 *
 * Deux pages pour une même question, c'est deux endroits à corriger quand le
 * calcul change, et une seule des deux qu'on pense à mettre à jour. La
 * redirection garde valides les liens et favoris qui pointaient ici.
 */
export default function DealFinderRedirect() {
  redirect('/opportunities')
}
