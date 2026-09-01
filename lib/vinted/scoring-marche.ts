import { prisma } from '@/prisma'

/**
 * La note d'opportunité, calculée sur les données collectées.
 *
 * Pourquoi ce fichier existe : `analysisScore` et `profitMargin` n'étaient
 * remplis que par OpenAI, douze articles par passage. Sur ce projet, le compte
 * OpenAI n'a plus de crédit — chaque appel répond « You have no credits
 * remaining ». Conséquence directe et vérifiée : zéro produit noté sur plus de
 * six mille, donc la page Opportunités, qui filtre sur `profitMargin`, ne
 * rendait rien du tout, et le classement des « top produits » retombait sur
 * « le plus récent ». La fonctionnalité centrale du produit dépendait d'une
 * facture impayée.
 *
 * Le calcul ci-dessous n'appelle personne. Il compare chaque annonce au marché
 * mesuré par le robot, se recalcule à chaque collecte, et s'explique ligne à
 * ligne — ce qu'une note sortie d'un modèle de langage ne fait pas.
 *
 * Deux garde-fous, appris d'une première version qui plaçait en tête des
 * chaussons de bébé à 2 € :
 *
 *  1. La référence de revente est la médiane de la MÊME MARQUE dans la
 *     catégorie, dès qu'il y a assez d'annonces pour que ce chiffre existe.
 *     Comparer une paire à 2 € à la médiane de toute la catégorie « Chaussures »
 *     donne 471 % de marge sur un article que personne ne rachètera à ce
 *     prix-là. On ne compare que ce qui est comparable.
 *  2. Le pourcentage ne compte que si les euros comptent. 400 % de marge sur
 *     un gain de 80 centimes ne paie même pas l'envoi ; les points de marge
 *     sont donc pondérés par le gain absolu.
 *
 * La note se décompose sur 100 :
 *
 *   marge (pondérée par le gain)  0 à 45
 *   demande (favoris par jour)    0 à 25
 *   état                          0 à 15
 *   fiabilité de la référence     0 à 15
 */

/** En dessous de ce nombre d'annonces, la médiane de catégorie ne veut rien dire. */
const ECHANTILLON_MINIMUM = 20

/** Nombre d'annonces d'une marque à partir duquel sa médiane devient utilisable. */
const ECHANTILLON_MARQUE = 8

/** Gain en euros à partir duquel la marge compte pour tous ses points. */
const GAIN_DE_REFERENCE = 10

export interface BilanNotation {
  notes: number
  ignore: 'echantillon-trop-petit' | null
}

export async function noterCategorie(
  categorie: string,
  medianePrix: number | null,
  volumeActif: number,
): Promise<BilanNotation> {
  // Noter contre une médiane calculée sur douze annonces reviendrait à
  // fabriquer des opportunités à partir du bruit. Mieux vaut ne pas noter.
  if (medianePrix === null || medianePrix <= 0 || volumeActif < ECHANTILLON_MINIMUM) {
    return { notes: 0, ignore: 'echantillon-trop-petit' }
  }

  const notes = await prisma.$executeRaw`
    WITH reference_marque AS (
      SELECT brand,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::float8 AS mediane,
             PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY price)::float8 AS plancher,
             COUNT(*) AS n
      FROM products
      WHERE category = ${categorie}
        AND status = 'active'
        AND brand IS NOT NULL
        AND brand <> 'Sans marque'
      GROUP BY brand
    ),
    base AS (
      SELECT
        p.id,
        p.brand,
        p.condition,
        -- Ce que l'acheteur paie réellement. Sans total connu, le prix nu est
        -- une approximation basse mais honnête.
        COALESCE(NULLIF(p."totalPrice", 0), p.price) AS cout,
        -- La médiane de la marque quand elle existe, celle de la catégorie
        -- sinon.
        CASE
          WHEN rm.n >= ${ECHANTILLON_MARQUE} THEN rm.mediane
          ELSE ${medianePrix}::float8
        END AS reference,
        CASE
          WHEN rm.n >= ${ECHANTILLON_MARQUE} THEN 15
          WHEN p.brand IS NOT NULL AND p.brand <> 'Sans marque' THEN 7
          -- Un article sans marque ne se compare à rien : on ne prétend pas
          -- savoir à quel prix il se revend.
          ELSE 0
        END AS pts_fiabilite,
        -- Une annonce nettement moins chère que les 10 % les moins chères de sa
        -- marque n'est presque jamais une bonne affaire : c'est un article
        -- incomplet, abîmé, ou un appât (« iPhone 16 à 1 € », « Nike Dunk,
        -- pied gauche uniquement » — les deux relevés en base). On garde ces
        -- lignes, mais on cesse de les présenter comme des opportunités.
        CASE
          WHEN rm.n >= ${ECHANTILLON_MARQUE}
           AND COALESCE(NULLIF(p."totalPrice", 0), p.price) < rm.plancher
          THEN 0.25
          ELSE 1.0
        END AS facteur_anomalie,
        -- Jours passés en ligne. Une annonce sans date connue est traitée comme
        -- vieille d'un jour : cela évite de diviser par zéro et n'invente
        -- aucune popularité.
        GREATEST(
          1.0,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(p."listedAt", p."createdAt"))) / 86400.0
        ) AS jours,
        COALESCE(p."favouriteCount", 0) AS favoris
      FROM products p
      LEFT JOIN reference_marque rm ON rm.brand = p.brand
      WHERE p.category = ${categorie} AND p.status = 'active'
    ),
    calcul AS (
      SELECT
        id,
        pts_fiabilite,
        facteur_anomalie,
        (reference - cout) AS gain,
        ((reference - cout) / NULLIF(cout, 0)) * 100 AS marge,
        LEAST(25, (favoris / jours) * 5) AS pts_demande,
        CASE condition
          WHEN 'new' THEN 15
          WHEN 'like_new' THEN 12
          WHEN 'good' THEN 8
          WHEN 'fair' THEN 4
          ELSE 6
        END AS pts_etat
      FROM base
    ),
    note AS (
      SELECT
        id,
        marge,
        -- Les points de marge suivent une courbe qui s'aplatit au lieu de
        -- buter sur un plafond : avec un simple LEAST(45, marge), toutes les
        -- annonces au-dessus de 45 % de marge recevaient la même note et le
        -- classement ne distinguait plus rien — huit premières places à 75/100
        -- exactement. Ici 60 % vaut 28 points, 120 % en vaut 39, 400 % en vaut
        -- 45 : l'ordre est conservé partout.
        --
        -- Le tout pondéré par le gain absolu : un pourcentage énorme sur
        -- quelques centimes ne paie même pas l'envoi.
        45 * (1 - EXP(-GREATEST(0, marge) / 60.0))
          * LEAST(1.0, GREATEST(0, gain) / ${GAIN_DE_REFERENCE}::float8)
          * facteur_anomalie AS pts_marge,
        pts_demande,
        pts_etat,
        pts_fiabilite
      FROM calcul
      WHERE marge IS NOT NULL
    )
    UPDATE products p
    SET "profitMargin" = ROUND(LEAST(999, GREATEST(-100, note.marge))::numeric, 1),
        "analysisScore" = ROUND(
          LEAST(100, note.pts_marge + note.pts_demande + note.pts_etat + note.pts_fiabilite)::numeric,
          1
        )
    FROM note
    WHERE p.id = note.id
  `

  return { notes, ignore: null }
}
