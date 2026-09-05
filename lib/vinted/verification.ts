/**
 * « Est-ce que ça se vend ? », vérifié annonce par annonce.
 *
 * C'est la question qui décide d'un achat, et Vinted ne la laisse pas poser
 * directement : le site ne publie aucune transaction. Personne ne peut lire un
 * prix de vente sur Vinted, ni nous ni un concurrent — d'où le vocabulaire tenu
 * partout dans l'application, « prix demandés », jamais « prix de vente ».
 *
 * Trois méthodes ont été essayées, dans cet ordre, et les deux premières ont
 * échoué pour des raisons qui méritent d'être écrites ici : sans elles, la
 * troisième a l'air d'un détour arbitraire.
 *
 * 1. **Conclure par absence du catalogue.** Parcourir toute une catégorie et
 *    considérer comme partie l'annonce qui n'y est plus. Impossible : Vinted
 *    plafonne chaque recherche à 960 résultats — la page 11 répond HTTP 400 —
 *    et le découpage par tranches de prix ne suffit pas sur les grandes
 *    catégories, où la seule tranche 0-5 € sature déjà. Sur un stock qu'on ne
 *    peut pas voir en entier, une absence ne prouve rien.
 *
 * 2. **Relire la page publique de l'annonce.** Elle répond franchement, mais
 *    elle pèse deux mégaoctets, et Vinted la protège : mesuré, la série s'est
 *    fait couper au bout de seize lectures espacées de 1,2 seconde. Une
 *    méthode qui fait bloquer l'adresse IP au bout de seize annonces ne mesure
 *    rien du tout.
 *
 * 3. **Lire la penderie du vendeur**, `/api/v2/wardrobe/{id}/items`. C'est la
 *    bonne : 40 Ko au lieu de 2 Mo, le même guichet JSON que le catalogue —
 *    donc le même débit toléré — et chaque appel renseigne d'un coup *toutes*
 *    les annonces qu'on suit chez ce vendeur. Elle donne en clair `is_closed`,
 *    `is_hidden` et `is_reserved` pour chacune.
 *
 * Reste la précaution qui fait la valeur du chiffre : la vérification a lieu
 * une seule fois par annonce, sept jours après l'avoir vue pour la première
 * fois. Chaque annonce a donc eu exactement la même fenêtre pour partir, et les
 * taux se comparent d'une catégorie à l'autre et d'une semaine à l'autre.
 * Mesurer sur le stock courant donnerait l'inverse — une annonce encore en
 * ligne est par définition une annonce qui n'est pas partie.
 */

import { prisma } from '@/prisma'
import { assurerSession, entetesAvecSession, BASE_VINTED, VintedBlockedError } from './session'

/** Âge de la cohorte vérifiée, en jours. */
export const FENETRE_JOURS = 7
/** Vendeurs interrogés par catégorie et par passage. */
const VENDEURS_PAR_PASSAGE = 25
/** Au-delà, la penderie ne tient pas dans une page et on ne conclut rien. */
const PENDERIE_MAX = 96

export type EtatFinal = 'online' | 'closed' | 'hidden' | 'deleted' | 'unknown'

interface AnnoncePenderie {
  id: number | string
  is_closed?: boolean
  is_hidden?: boolean
  is_draft?: boolean
}

/**
 * Lit la penderie d'un vendeur et rend l'état de chacune de ses annonces.
 *
 * `null` veut dire « pas d'information » et non « rien à vendre » : une
 * penderie trop grande pour une page, ou une réponse inattendue, ne doit pas
 * faire conclure que toutes les annonces de ce vendeur ont disparu.
 */
export async function lirePenderie(sellerId: string): Promise<Map<string, EtatFinal> | null> {
  await assurerSession()
  const reponse = await fetch(
    `${BASE_VINTED}/api/v2/wardrobe/${sellerId}/items?page=1&per_page=${PENDERIE_MAX}`,
    { headers: entetesAvecSession() },
  )

  if (reponse.status === 404) {
    // Compte supprimé ou fermé : ses annonces ne sont plus en vente, et là
    // c'est une information, pas une absence de réponse.
    return new Map()
  }
  if (reponse.status === 429 || reponse.status === 403) {
    throw new VintedBlockedError(reponse.status, 'Vinted freine la lecture des penderies.')
  }
  if (!reponse.ok) return null

  let donnees: { items?: AnnoncePenderie[]; pagination?: { total_entries?: number } }
  try {
    donnees = (await reponse.json()) as typeof donnees
  } catch {
    return null
  }
  if (!Array.isArray(donnees.items)) return null

  // Penderie plus grande qu'une page : les annonces manquantes pourraient être
  // en page 2 plutôt que vendues. On préfère ne rien dire.
  if ((donnees.pagination?.total_entries ?? 0) > PENDERIE_MAX) return null

  const etats = new Map<string, EtatFinal>()
  for (const annonce of donnees.items) {
    const id = String(annonce.id)
    if (annonce.is_closed === true) etats.set(id, 'closed')
    else if (annonce.is_hidden === true || annonce.is_draft === true) etats.set(id, 'hidden')
    else etats.set(id, 'online')
  }
  return etats
}

export interface BilanVerification {
  categorie: string
  /** Penderies effectivement lues. */
  vendeurs: number
  verifiees: number
  parties: number
  enLigne: number
  indeterminees: number
  dureeMs: number
  erreur?: string
}

/**
 * Vérifie la cohorte d'une catégorie en interrogeant les vendeurs concernés.
 *
 * Le regroupement par vendeur n'est pas un détail d'implémentation : c'est lui
 * qui rend la mesure tenable. Vingt-cinq requêtes suffisent à statuer sur bien
 * plus de vingt-cinq annonces, puisqu'un vendeur en a souvent plusieurs, et le
 * volume transféré reste de l'ordre du mégaoctet au lieu de la centaine.
 */
export async function verifierCohorte(
  category: string,
  options: { vendeurs?: number; deadline?: number } = {},
): Promise<BilanVerification> {
  const debut = Date.now()
  const budget = options.vendeurs ?? VENDEURS_PAR_PASSAGE

  const candidats = await prisma.$queryRaw<{ id: string; vintedId: string; sellerId: string }[]>`
    SELECT id, "vintedId", "sellerId"
    FROM "products"
    WHERE category = ${category}
      AND "sellerId" IS NOT NULL
      AND "checkedAt" IS NULL
      AND "createdAt" <= NOW() - (${FENETRE_JOURS} * INTERVAL '1 day')
      AND "createdAt" >  NOW() - (${FENETRE_JOURS + 3} * INTERVAL '1 day')
  `

  // Groupées par vendeur : une requête répond pour toutes les annonces d'un
  // même vendeur d'un coup.
  const parVendeur = new Map<string, { id: string; vintedId: string }[]>()
  for (const c of candidats) {
    const liste = parVendeur.get(c.sellerId) ?? []
    liste.push({ id: c.id, vintedId: c.vintedId })
    parVendeur.set(c.sellerId, liste)
  }

  // Les vendeurs chez qui on suit le plus d'annonces d'abord : à budget de
  // requêtes égal, ce sont eux qui renseignent le plus de cohorte.
  const vendeurs = [...parVendeur.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, budget)

  let lus = 0
  let verifiees = 0
  let parties = 0
  let enLigne = 0
  let indeterminees = 0
  let erreur: string | undefined
  const maintenant = new Date()

  for (const [sellerId, annonces] of vendeurs) {
    if (options.deadline && Date.now() > options.deadline) break

    let etats: Map<string, EtatFinal> | null
    try {
      etats = await lirePenderie(sellerId)
    } catch (err) {
      // Un blocage arrête la série : chaque requête de plus pendant qu'on est
      // filtré ne fait qu'allonger le filtrage.
      erreur = err instanceof Error ? err.message : String(err)
      break
    }
    lus += 1

    for (const annonce of annonces) {
      // Penderie illisible : on ne marque rien, l'annonce restera candidate au
      // passage suivant. Écrire « inconnu » la retirerait de la cohorte pour
      // toujours à cause d'un incident réseau.
      if (etats === null) {
        indeterminees += 1
        continue
      }

      // Absente d'une penderie entièrement lue : l'annonce n'est plus chez son
      // vendeur, donc plus en vente.
      const etat: EtatFinal = etats.get(annonce.vintedId) ?? 'deleted'
      verifiees += 1
      if (etat === 'online') enLigne += 1
      else parties += 1

      await prisma.product
        .update({
          where: { id: annonce.id },
          data: {
            checkedAt: maintenant,
            finalState: etat,
            ...(etat === 'online' ? {} : { status: 'gone', disappearedAt: maintenant }),
          },
        })
        .catch((err: unknown) => console.error('vérification: écriture impossible', err))
    }

    // Le même souffle qu'ailleurs : c'est ce qui distingue un lecteur d'un
    // marteau, du point de vue du filtre anti-robot.
    await new Promise((r) => setTimeout(r, 700))
  }

  return {
    categorie: category,
    vendeurs: lus,
    verifiees,
    parties,
    enLigne,
    indeterminees,
    dureeMs: Date.now() - debut,
    erreur,
  }
}
