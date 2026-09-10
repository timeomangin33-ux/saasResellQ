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
const ECHANTILLON_MARQUE = 25

/**
 * Plafond de la référence de revente, exprimé en multiples du troisième
 * quartile de la catégorie.
 *
 * Le champ « marque » de Vinted est saisi par le vendeur, jamais vérifié. En
 * tête des opportunités du tableau de bord figurait « Versage H&M
 * Absatzschuhe », marque déclarée Versace : une chaussure H&M à 50 €, évaluée
 * contre la médiane des Versace de la catégorie, donc annoncée à +232 € de gain
 * et 464 % de marge. Le calcul était exact, la prémisse était fausse.
 *
 * On ne peut pas vérifier une marque à partir d'un titre. On peut en revanche
 * refuser de promettre un gain que la catégorie entière ne justifie pas : dans
 * « Chaussures », dont la moitié des annonces tient entre 8 et 35 €, une
 * revente estimée à 282 € n'est pas défendable, quelle que soit l'étiquette.
 * Le plafond coûte quelques vraies affaires de luxe ; l'inverse coûte la
 * crédibilité de toute la liste.
 */
const PLAFOND_REFERENCE_P75 = 3

/**
 * Rapport minimum entre le prix d'une annonce et la médiane de sa marque
 * au-dessous duquel on cesse de la présenter comme une opportunité.
 *
 * Une marque n'est pas une gamme de prix : « Apple » recouvre un câble à 15 €
 * et un ordinateur à 900 €, et rien dans les données ne dit lequel on regarde.
 * En deçà de ce rapport, l'écart entre l'annonce et la médiane s'explique
 * bien plus probablement par la nature de l'objet que par une bonne affaire.
 *
 * Le test porte sur la référence réellement utilisée, marque ou catégorie, et
 * pas seulement sur celle de la marque. La première version ne gardait que le
 * cas des marques bien représentées, et laissait donc passer exactement ce
 * qu'elle visait : « Collier Neuf Plage », 1 €, 746 % de marge, noté 92 sur
 * 100 en tête du classement — la marque « Plage » comptant trop peu d'annonces
 * pour déclencher le moindre garde-fou.
 */
const RAPPORT_MINIMUM_MARQUE = 0.3

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
    WITH reference_categorie AS (
      SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::float8 AS p75
      FROM products
      WHERE category = ${categorie} AND status = 'active' AND price > 0
    ),
    reference_marque AS (
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
        -- La médiane de la marque quand son échantillon est assez grand, celle
        -- de la catégorie sinon — le tout plafonné par la dispersion de la
        -- catégorie. Le seuil d'échantillon est passé de 8 à 25 annonces :
        -- une médiane tirée de huit annonces d'une marque de luxe, dont une
        -- partie sont des contrefaçons ou des erreurs d'étiquetage, n'est pas
        -- une médiane, c'est du bruit avec deux décimales.
        LEAST(
          CASE
            WHEN rm.n >= ${ECHANTILLON_MARQUE} THEN rm.mediane
            ELSE ${medianePrix}::float8
          END,
          -- Le plafond n'a de sens que si la catégorie a une dispersion connue.
          COALESCE(rc.p75 * ${PLAFOND_REFERENCE_P75}::float8, ${medianePrix}::float8 * 4)
        ) AS reference,
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
          -- Un article vendu très en dessous du niveau habituel de sa marque
          -- n'est probablement pas le même genre d'article. Une marque large
          -- couvre des objets sans rapport : « Apple » va du câble USB-C à
          -- 15 € au MacBook, et la médiane de la marque valorisait ce câble à
          -- 82 €, soit +67 € de gain annoncé. Le rapport de prix est le seul
          -- signal disponible pour distinguer l'accessoire du produit
          -- principal, faute de pouvoir lire ce qu'est réellement l'objet.
          WHEN COALESCE(NULLIF(p."totalPrice", 0), p.price) <
               (CASE
                  WHEN rm.n >= ${ECHANTILLON_MARQUE} THEN rm.mediane
                  ELSE ${medianePrix}::float8
                END) * ${RAPPORT_MINIMUM_MARQUE}::float8
          THEN 0.4
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
      CROSS JOIN reference_categorie rc
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
