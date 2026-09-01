/**
 * Amazon.
 *
 * Comme pour eBay, ce fichier fabriquait ses résultats : titres assemblés,
 * prix tirés au hasard, photos de banque d'images. Rien de ce qu'il rendait
 * n'avait été lu sur Amazon.
 *
 * L'accès aux prix Amazon passe par la Product Advertising API, qui demande
 * une clé, un secret et un identifiant d'affiliation, et n'est ouverte qu'aux
 * comptes affiliés actifs. Tant que ces identifiants ne sont pas fournis,
 * l'intégration se déclare indisponible plutôt que d'inventer.
 */

import { MarketplaceNonConfigure } from './ebay.provider'

export interface AmazonListing {
  id: string
  title: string
  price: number
  currency: string
  image: string
  platform: 'amazon'
  condition: string
  link: string
}

export const AmazonProvider = {
  estConfigure() {
    return Boolean(
      process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY && process.env.AMAZON_PARTNER_TAG,
    )
  },

  async searchListings(_query: string): Promise<AmazonListing[]> {
    if (!AmazonProvider.estConfigure()) {
      throw new MarketplaceNonConfigure('Amazon', [
        'AMAZON_ACCESS_KEY',
        'AMAZON_SECRET_KEY',
        'AMAZON_PARTNER_TAG',
      ])
    }

    // La signature SigV4 de la Product Advertising API demande son propre
    // chantier. Tant qu'il n'est pas fait, mieux vaut le dire que de rendre
    // des lignes inventées : un prix Amazon faux fausse toute comparaison de
    // marge, qui est la raison d'être de cette page.
    throw new MarketplaceNonConfigure('Amazon', ['implémentation Product Advertising API'])
  },
}

export { MarketplaceNonConfigure }
