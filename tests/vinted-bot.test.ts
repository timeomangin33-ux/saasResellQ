import { describe, expect, it } from 'vitest'
import { runVintedBotScan } from '../lib/vinted-bot'

/**
 * Test d'intégration : celui-ci interroge le vrai Vinted.
 *
 * C'est volontaire. Le robot dépend d'un service tiers qui peut changer son
 * format, expirer une session ou filtrer notre adresse IP — trois pannes
 * qu'aucun test hors ligne ne détecte. S'il échoue, ce n'est pas le test qui
 * est cassé, c'est le produit.
 *
 * Il est ignoré quand `VINTED_TESTS_RESEAU` n'est pas positionné, pour qu'une
 * machine sans accès réseau ne fasse pas échouer la suite pour une mauvaise
 * raison. Sur un poste connecté :
 *
 *   VINTED_TESTS_RESEAU=1 npm test
 *
 * La commande `npm run bot:check` fait la même vérification, en plus détaillé.
 */
const enLigne = process.env.VINTED_TESTS_RESEAU === '1'
const seulementEnLigne = enLigne ? it : it.skip

describe('scan Vinted (réseau)', () => {
  seulementEnLigne(
    'rapporte une page pleine depuis le vrai site',
    async () => {
      const scan = await runVintedBotScan({ query: 'Chaussures', perPage: 96 })

      expect(scan.success, `échec de lecture : ${scan.message}`).toBe(true)
      expect(scan.source, 'lecture dégradée : l\'API a refusé la session').toBe('api')
      expect(scan.items.length, 'une page Vinted contient 96 annonces').toBeGreaterThan(50)

      const identifiants = new Set(scan.items.map((i) => i.id))
      expect(identifiants.size, 'des doublons se sont glissés dans le lot').toBe(scan.items.length)

      const part = (predicat: (i: (typeof scan.items)[number]) => boolean) =>
        scan.items.filter(predicat).length / scan.items.length

      expect(part((i) => i.price > 0), 'trop d\'annonces sans prix').toBeGreaterThan(0.95)
      expect(part((i) => i.title.trim().length > 2), 'des titres vides').toBe(1)
      expect(part((i) => Boolean(i.url.includes('/items/'))), 'des liens cassés').toBe(1)
      expect(part((i) => Boolean(i.sellerLogin)), 'le vendeur n\'est plus lu').toBeGreaterThan(0.9)
      expect(part((i) => i.listedAt !== null), 'la date de mise en ligne n\'est plus lue').toBeGreaterThan(0.9)

      // Une entité HTML non décodée signale une régression du décodeur.
      const malDecodees = scan.items.filter((i) => /&#x?[0-9a-f]+;|&[a-z]+;/i.test(i.title))
      expect(malDecodees.map((i) => i.title), 'entités HTML laissées dans les titres').toEqual([])
    },
    60_000,
  )

  seulementEnLigne(
    'respecte la quantité demandée',
    async () => {
      const scan = await runVintedBotScan({ query: 'Montres & Bijoux', perPage: 20 })
      expect(scan.items.length).toBeLessThanOrEqual(20)
    },
    60_000,
  )

  seulementEnLigne(
    'filtre par prix quand on le lui demande',
    async () => {
      const scan = await runVintedBotScan({ query: 'nike', perPage: 96, priceFrom: 10, priceTo: 30 })
      expect(scan.success).toBe(true)
      // Vinted applique le filtre côté serveur : une annonce hors bornes
      // signifierait que les paramètres ne sont plus transmis.
      const horsBornes = scan.items.filter((i) => i.price < 10 || i.price > 30)
      expect(horsBornes.map((i) => `${i.title} — ${i.price} €`)).toEqual([])
    },
    60_000,
  )
})
