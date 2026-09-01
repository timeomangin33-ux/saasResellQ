import { describe, expect, it } from 'vitest'
import { normaliserAnnonce } from '../lib/vinted/api'
import { decoderEntitesHtml, extraireAnnoncesDuHtml } from '../lib/vinted/html'

/**
 * Ces tests ne touchent pas le réseau. Ils gardent la traduction entre ce que
 * Vinted renvoie et ce que l'application manipule — c'est là que se logent les
 * régressions silencieuses : un champ renommé chez eux, et des lignes vides
 * partent en base sans que rien ne proteste.
 *
 * L'échantillon ci-dessous est une vraie réponse de `/api/v2/catalog/items`,
 * réduite aux champs que l'on lit.
 */
const ANNONCE_REELLE = {
  id: 9794885662,
  title: 'Veste sans manche Nike',
  price: { amount: '20.0', currency_code: 'EUR' },
  total_item_price: { amount: '21.7', currency_code: 'EUR' },
  service_fee: { amount: '1.7', currency_code: 'EUR' },
  brand_title: 'Nike',
  size_title: 'M',
  status: 'Très bon état',
  path: '/items/9794885662-veste-sans-manche-nike',
  url: 'https://www.vinted.fr/items/9794885662-veste-sans-manche-nike',
  favourite_count: 2,
  view_count: 14,
  promoted: false,
  user: { id: 12345, login: 'vendeuse42' },
  photo: {
    url: 'https://images1.vinted.net/t/05_003d7/f800/1787830480.jpeg',
    high_resolution: { timestamp: 1787830480 },
  },
}

describe('normaliserAnnonce', () => {
  it('traduit une annonce réelle sans rien perdre', () => {
    const a = normaliserAnnonce(ANNONCE_REELLE, 'Hommes')
    expect(a).not.toBeNull()
    expect(a!.id).toBe('9794885662')
    expect(a!.title).toBe('Veste sans manche Nike')
    expect(a!.price).toBe(20)
    // Le prix payé n'est pas le prix affiché : la protection acheteurs s'ajoute.
    // C'est ce montant-là qui décide si une revente est rentable.
    expect(a!.totalPrice).toBe(21.7)
    expect(a!.serviceFee).toBe(1.7)
    expect(a!.brand).toBe('Nike')
    expect(a!.size).toBe('M')
    expect(a!.condition).toBe('Très bon état')
    expect(a!.sellerLogin).toBe('vendeuse42')
    expect(a!.favouriteCount).toBe(2)
    expect(a!.viewCount).toBe(14)
    expect(a!.listedAt?.getTime()).toBe(1787830480 * 1000)
    expect(a!.category).toBe('Hommes')
  })

  it('rejette une annonce sans identifiant ou sans titre plutôt que d\'écrire une ligne vide', () => {
    expect(normaliserAnnonce({ ...ANNONCE_REELLE, id: null }, 'Hommes')).toBeNull()
    expect(normaliserAnnonce({ ...ANNONCE_REELLE, title: '   ' }, 'Hommes')).toBeNull()
    expect(normaliserAnnonce(null, 'Hommes')).toBeNull()
    expect(normaliserAnnonce('pas un objet', 'Hommes')).toBeNull()
  })

  it('survit aux champs absents sans inventer de valeur', () => {
    const a = normaliserAnnonce({ id: 1, title: 'Article nu' }, 'Divers')
    expect(a).not.toBeNull()
    expect(a!.price).toBe(0)
    expect(a!.brand).toBe('Sans marque')
    // Pas d'image de remplacement : vide veut dire « pas de photo ».
    expect(a!.image).toBe('')
    expect(a!.sellerLogin).toBeNull()
    expect(a!.listedAt).toBeNull()
    expect(a!.url).toContain('/items/1')
  })

  it('reprend le prix nu quand Vinted ne donne pas le total', () => {
    const a = normaliserAnnonce({ ...ANNONCE_REELLE, total_item_price: null }, 'Hommes')
    expect(a!.totalPrice).toBe(20)
  })
})

describe('décodage HTML', () => {
  it('décode les apostrophes hexadécimales, que Vinted écrit ainsi', () => {
    expect(decoderEntitesHtml('Bo&icirc;te d&#x27;origine')).toBe("Boîte d'origine")
  })

  it('ne décode pas deux fois une esperluette échappée', () => {
    expect(decoderEntitesHtml('Sacs &amp;#39; Accessoires')).toBe("Sacs &#39; Accessoires")
  })
})

describe('extraction depuis le HTML', () => {
  const html = `
    <div data-testid="product-item-id-123">
      <a href="/items/123-nike-air"><img src="https://images1.vinted.net/t/photo.jpeg"
      alt="Nike Air Force, marque: Nike, état: Très bon état, taille: 42, 25,00 €, 26,75 € Protection acheteurs incluse"></a>
    </div>
    <div data-testid="product-item-id-124">
      <a href="/items/124-logo"><img src="https://images1.vinted.net/logo.jpeg" alt="Logo Vinted"></a>
    </div>`

  it('lit une annonce complète', () => {
    const [a] = extraireAnnoncesDuHtml(html, 'Chaussures')
    expect(a.id).toBe('123')
    expect(a.title).toBe('Nike Air Force')
    expect(a.brand).toBe('Nike')
    expect(a.price).toBe(25)
    expect(a.totalPrice).toBe(26.75)
    expect(a.size).toBe('42')
    expect(a.url).toBe('https://www.vinted.fr/items/123-nike-air')
  })

  it('ignore le logo et tout ce qui n\'est pas une annonce', () => {
    expect(extraireAnnoncesDuHtml(html, 'Chaussures')).toHaveLength(1)
  })

  it('ne rend rien quand le balisage change, plutôt que du bruit', () => {
    expect(extraireAnnoncesDuHtml('<div class="autre-chose"></div>', 'Chaussures')).toEqual([])
  })
})
