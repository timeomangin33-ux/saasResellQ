import { describe, expect, it } from 'vitest'
import { runVintedBotScan } from '../lib/vinted-bot'

/**
 * Le robot lit le HTML de Vinted avec des expressions régulières sur
 * `data-testid`. Le jour où Vinted change son balisage, l'extraction rend zéro
 * annonce — et comme le scan bascule alors sur son jeu de secours en renvoyant
 * un HTTP 200, rien dans l'application ne signale la panne. Les chiffres se
 * figent et personne ne l'apprend.
 *
 * Ce test est donc volontairement un test d'intégration réel : il interroge
 * Vinted. C'est le seul moyen de détecter un changement de balisage chez eux.
 * S'il échoue, ce n'est pas le test qui est cassé, c'est le produit.
 */
describe('scan Vinted', () => {
  it('rapporte une page pleine depuis le vrai site', async () => {
    const scan = await runVintedBotScan({ query: 'Chaussures', perPage: 96 })

    expect(scan.source, 'bascule sur le jeu de secours : le balisage Vinted a probablement changé').toBe('live')
    expect(scan.items.length, 'une page Vinted contient 96 annonces').toBeGreaterThan(50)

    const identifiants = new Set(scan.items.map((i) => i.id))
    expect(identifiants.size, 'des doublons se sont glissés dans le lot').toBe(scan.items.length)

    const avecPrix = scan.items.filter((i) => i.price > 0)
    expect(avecPrix.length / scan.items.length, 'trop d’annonces sans prix : l’extraction du prix a cassé').toBeGreaterThan(0.9)

    const avecTitre = scan.items.filter((i) => i.title.trim().length > 2)
    expect(avecTitre.length).toBe(scan.items.length)

    // Une entité HTML non décodée signale une régression du décodeur.
    const malDecodees = scan.items.filter((i) => /&#x?[0-9a-f]+;|&[a-z]+;/i.test(i.title))
    expect(malDecodees.map((i) => i.title), 'entités HTML laissées dans les titres').toEqual([])
  }, 60_000)

  it('respecte la quantité demandée', async () => {
    const scan = await runVintedBotScan({ query: 'Montres & Bijoux', perPage: 20 })
    expect(scan.items.length).toBeLessThanOrEqual(20)
  }, 60_000)
})
