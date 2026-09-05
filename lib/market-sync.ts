import { Prisma } from '@prisma/client'
import { prisma } from '@/prisma'
import type { AnnonceVinted } from '@/lib/vinted/api'
import { noterCategorie } from '@/lib/vinted/scoring-marche'
import { calculerTendance, HISTORIQUE_MINIMUM } from '@/lib/vinted/tendance'
import { mesurerRotation, COHORTE_MINIMUM } from '@/lib/vinted/rotation'

/**
 * Vinted affiche l'état en clair. On le range dans le vocabulaire interne
 * (`new`, `like_new`, `good`, `fair`), qui est ce que le reste de
 * l'application interroge. La normalisation se fait sans accents ni casse :
 * selon la page, Vinted écrit « Très bon état » ou « Tres bon etat ».
 */
const ETATS: Record<string, string> = {
  'neuf avec etiquette': 'new',
  'neuf sans etiquette': 'new',
  neuf: 'new',
  'tres bon etat': 'like_new',
  'bon etat': 'good',
  satisfaisant: 'fair',
}

function sansAccents(valeur: string) {
  return valeur.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function normaliserEtat(brut: string) {
  return ETATS[sansAccents(brut)] ?? 'good'
}

/** Variation brute entre deux relevés. Reste utilisée pour le volume, dont la
 *  lecture ne prétend pas à une tendance. */
function variation(nouveau: number, ancien: number | null | undefined) {
  if (ancien === null || ancien === undefined || ancien === 0) return null
  return ((nouveau - ancien) / ancien) * 100
}

/**
 * Une annonce non revue depuis ce délai sort des agrégats.
 *
 * Une annonce vendue ou retirée disparaît simplement des résultats Vinted :
 * rien ne vient nous le dire. Sans péremption, la table accumule des fantômes
 * et les médianes finissent par décrire un marché qui n'existe plus.
 */
export const JOURS_AVANT_PEREMPTION = 7

export interface BilanPersistance {
  annoncesEcrites: number
  perimees: number
  volumeActif: number
  prixMoyen: number | null
  prixMedian: number | null
  /** Annonces dont la note d'opportunité a été recalculée sur ce passage. */
  notees: number
  /** Annonces absentes du balayage, en attente de confirmation. */
  absentes: number
  /** Annonces déclarées disparues à l'issue de ce balayage. */
  disparues: number
}

/**
 * Contexte d'un balayage.
 *
 * Sa présence change la nature de ce qui est écrit : sans lui, on ne sait que
 * ce qu'on a vu ; avec lui, on sait aussi ce qu'on *n'a pas* vu, ce qui est la
 * seule façon de constater une disparition.
 *
 * `zones` est la liste des tranches de prix parcourues *en entier*. La nuance
 * est tout le sujet : Vinted plafonne chaque recherche à 960 résultats, donc
 * une tranche qui en rend 960 n'a pas été vue en entier et une annonce absente
 * peut très bien s'y trouver encore. Seules les tranches sous le plafond
 * autorisent la conclusion « cette annonce est partie ».
 */
export interface ContexteBalayage {
  zones: { from: number; to: number }[]
}

/**
 * Écrit les annonces lues et rafraîchit les agrégats de la catégorie.
 *
 * Ce que le robot ne fait plus : écrire des annonces qu'il n'a pas lues. La
 * fonction n'est appelée qu'avec des annonces réelles, et les colonnes sans
 * valeur restent nulles plutôt que de recevoir un chiffre plausible mais
 * inventé.
 */
export async function persistVintedScanResults(
  items: AnnonceVinted[],
  category: string,
  balayage?: ContexteBalayage,
): Promise<BilanPersistance> {
  const maintenant = new Date()
  // Pris avant la première écriture : c'est la frontière qui sépare « revue
  // pendant ce balayage » de « pas revue ».
  const debutEcriture = new Date(Date.now() - 1000)

  if (items.length === 0) {
    return {
      annoncesEcrites: 0,
      perimees: 0,
      volumeActif: 0,
      prixMoyen: null,
      prixMedian: null,
      notees: 0,
      absentes: 0,
      disparues: 0,
    }
  }

  // Cent upserts à la file, c'est cent allers-retours vers Neon, soit une
  // dizaine de secondes par catégorie — assez pour que le cron se fasse couper
  // avant d'avoir tout traité. Par lots parallèles, on tombe sous la seconde,
  // sans saturer le pool de connexions.
  const TAILLE_LOT = 25
  let ecrites = 0

  for (let i = 0; i < items.length; i += TAILLE_LOT) {
    const lot = items.slice(i, i + TAILLE_LOT)
    const resultats = await Promise.allSettled(
      lot.map((item) => {
        const commun = {
          title: item.title,
          description: item.description || null,
          price: item.price,
          totalPrice: item.totalPrice || null,
          currency: item.currency || 'EUR',
          category,
          brand: item.brand || null,
          size: item.size || null,
          condition: normaliserEtat(item.condition),
          seller: item.sellerLogin,
          sellerId: item.sellerId ? String(item.sellerId) : null,
          imageUrl: item.image || null,
          url: item.url,
          favouriteCount: item.favouriteCount,
          viewCount: item.viewCount,
          listedAt: item.listedAt,
          lastSeenAt: maintenant,
          status: 'active',
          // Revue : le compteur d'absences repart de zéro, et une éventuelle
          // disparition constatée plus tôt est annulée — une annonce remise en
          // ligne n'est pas une annonce partie.
          missedSweeps: 0,
          disappearedAt: null,
        }
        return prisma.product.upsert({
          where: { vintedId: item.id },
          update: { ...commun, updatedAt: maintenant },
          create: { vintedId: item.id, ...commun },
        })
      }),
    )

    for (const r of resultats) {
      if (r.status === 'fulfilled') ecrites += 1
      else console.error('market-sync: annonce non écrite', r.reason)
    }
  }

  // ------------------------------------------------------------------
  // Ce que le balayage complet permet de conclure : la disparition.
  // ------------------------------------------------------------------
  //
  // Une annonce vendue ou retirée ne laisse aucune trace chez Vinted : elle
  // cesse simplement d'apparaître. Tant que le robot ne lisait que la première
  // page, l'absence ne prouvait rien — une annonce pouvait très bien avoir
  // glissé en page 4. Après un balayage qui va au bout de la pagination,
  // l'absence devient une information.
  //
  // Une seule absence ne suffit toujours pas. Le catalogue bouge pendant le
  // balayage, et une annonce peut passer entre deux pages au moment où on les
  // lit. On compte donc les absences, et on ne conclut qu'à la deuxième
  // consécutive : deux décalages de pagination successifs sur la même annonce
  // sont bien plus improbables qu'une vente.
  let absentes = 0
  let disparues = 0

  if (balayage && balayage.zones.length > 0) {
    // Une annonce ne compte comme absente que si son prix tombe dans une
    // tranche qu'on a parcourue en entier. Ailleurs, on n'a simplement pas
    // regardé, et compter l'absence reviendrait à déclarer vendues des annonces
    // qu'on n'a jamais cherchées.
    for (const zone of balayage.zones) {
      const absence = await prisma.$executeRaw`
        UPDATE "products"
        SET "missedSweeps" = "missedSweeps" + 1
        WHERE category = ${category}
          AND status = 'active'
          AND ("lastSeenAt" IS NULL OR "lastSeenAt" < ${debutEcriture})
          AND price >= ${zone.from}
          AND price < ${zone.to}
      `
      absentes += Number(absence)
    }

    // Deux absences de suite, et pas une seule. Le catalogue bouge pendant le
    // balayage : une annonce peut se glisser entre deux pages au moment précis
    // où on les lit. Ce décalage arrive ; qu'il se reproduise sur la même
    // annonce au balayage suivant est bien moins probable qu'une vente.
    const partis = await prisma.product.updateMany({
      where: { category, status: 'active', missedSweeps: { gte: 2 } },
      data: { status: 'gone', disappearedAt: maintenant },
    })
    disparues = partis.count
  }

  // Le délai est large exprès : les catégories passent à tour de rôle et pas
  // forcément toutes les heures. Ce filet ne sert plus qu'aux catégories qu'un
  // balayage complet n'a pas encore couvertes ; ailleurs, c'est la disparition
  // constatée qui fait le travail, et elle le fait mieux.
  const limite = new Date(Date.now() - JOURS_AVANT_PEREMPTION * 86_400_000)
  const { count: perimees } = await prisma.product.updateMany({
    where: {
      category,
      status: 'active',
      OR: [{ lastSeenAt: { lt: limite } }, { lastSeenAt: null, updatedAt: { lt: limite } }],
    },
    data: { status: 'stale' },
  })

  // Volume suivi : combien d'annonces de cette catégorie sont encore en ligne à
  // notre connaissance. C'est un compte de ce qu'on suit, pas la taille du
  // marché — Vinted ne la publie pas — et l'interface le dit ainsi.
  const [compte] = await prisma.$queryRaw<{ volume: bigint }[]>`
    SELECT COUNT(*) AS volume FROM "products"
    WHERE category = ${category} AND status = 'active'
  `
  const volumeActif = Number(compte?.volume ?? 0)

  // ------------------------------------------------------------------
  // Les prix de référence viennent du balayage, jamais de la table.
  // ------------------------------------------------------------------
  //
  // La table `products` est une accumulation : ce qu'on y trouve dépend de ce
  // que le robot a croisé, dans l'ordre où il l'a croisé. Sa composition
  // change donc à chaque évolution du collecteur, et sa médiane avec. Observé
  // en conditions réelles : un passage lisant les moins chères d'abord y a
  // déversé des milliers d'annonces à 1-3 €, et la médiane de toutes les
  // catégories est tombée à 2 € — un chiffre parfaitement calculé sur un
  // échantillon qui ne représentait rien.
  //
  // Le balayage, lui, est un échantillon défini : les mêmes tranches de prix,
  // le même nombre de pages par tranche, à chaque passage. Sa médiane est
  // comparable d'un jour à l'autre, ce qui est exactement la propriété qui
  // manquait. On ne met donc à jour les prix de référence que lors d'un
  // balayage ; un simple rafraîchissement des nouveautés écrit les annonces
  // mais ne touche pas aux agrégats, parce que les nouveautés du jour ne sont
  // pas le marché.
  if (!balayage) {
    await prisma.categoryMarket
      .updateMany({ where: { category }, data: { volumeActive: volumeActif, lastAnalyzedAt: maintenant } })
      .catch((err: unknown) => console.error('market-sync: volume non mis à jour', err))

    let notesRefresh = 0
    try {
      const marche = await prisma.categoryMarket.findUnique({ where: { category } })
      const bilan = await noterCategorie(category, marche?.medianPrice ?? null, volumeActif)
      notesRefresh = bilan.notes
    } catch (err) {
      console.error(`market-sync: notation impossible pour ${category}`, err)
    }
    return {
      annoncesEcrites: ecrites,
      perimees,
      volumeActif,
      prixMoyen: null,
      prixMedian: null,
      notees: notesRefresh,
      absentes,
      disparues,
    }
  }

  const prixEchantillon = items.map((i) => i.price).filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b)
  const milieu = Math.floor(prixEchantillon.length / 2)
  const prixMedian =
    prixEchantillon.length === 0
      ? null
      : prixEchantillon.length % 2 === 1
        ? prixEchantillon[milieu]
        : (prixEchantillon[milieu - 1] + prixEchantillon[milieu]) / 2
  const prixMoyen =
    prixEchantillon.length === 0
      ? null
      : prixEchantillon.reduce((t, p) => t + p, 0) / prixEchantillon.length

  if (prixEchantillon.length > 0 && prixMoyen !== null && prixMedian !== null) {
    // Le point du jour d'abord, la tendance ensuite : la tendance se lit dans
    // l'historique, et l'historique doit contenir la journée en cours, sinon on
    // compare les trois derniers jours à une fenêtre qui ignore aujourd'hui.
    const jour = new Date()
    jour.setUTCHours(0, 0, 0, 0)
    const pointDuJour = {
      avgPrice: prixMoyen,
      medianPrice: prixMedian,
      volumeActive: volumeActif,
      // Sur combien d'annonces la médiane du jour a été calculée. C'est la
      // taille du balayage, pas celle de la table : deux nombres différents
      // qu'il serait facile de confondre, et l'un des deux ne veut rien dire.
      sampleSize: prixEchantillon.length,
    }
    await prisma.categoryMarketDaily.upsert({
      where: { category_day: { category, day: jour } },
      update: pointDuJour,
      create: { category, day: jour, ...pointDuJour },
    })

    const precedent = await prisma.categoryMarket.findUnique({ where: { category } })

    // La tendance ne se déduit plus du passage précédent — c'est ce qui la
    // faisait s'inverser d'un jour à l'autre. Elle se lit sur des fenêtres de
    // plusieurs jours, avec une zone morte qui empêche la flèche de battre.
    // Couverture : part des annonces actives dont le prix tombe dans une
    // tranche vue en entier. C'est la seule mesure de couverture qui veuille
    // dire quelque chose, puisque Vinted ne publie pas la taille réelle d'une
    // catégorie — `total_entries` vaut 960 partout, c'est le plafond et non un
    // compte.
    let couvertureDesZones: number | null = null
    if (balayage && balayage.zones.length > 0 && volumeActif > 0) {
      const conditions = balayage.zones.map((z) => Prisma.sql`(price >= ${z.from} AND price < ${z.to})`)
      const [couverture] = await prisma.$queryRaw<{ dedans: bigint }[]>`
        SELECT COUNT(*) AS dedans
        FROM "products"
        WHERE category = ${category} AND status = 'active'
          AND (${Prisma.join(conditions, ' OR ')})
      `
      couvertureDesZones = Math.min(1, Number(couverture?.dedans ?? 0) / volumeActif)
    }

    const tendance = await calculerTendance(category, precedent?.trendDirection)
    const rotation = await mesurerRotation(category)
    const qualite = evaluerQualite({ volumeActif, tendance, rotation, balayage })

    const instantane = {
      avgPrice: prixMoyen,
      medianPrice: prixMedian,
      volumeActive: volumeActif,
      trendDirection: tendance.direction,
      priceChangePercent: tendance.variation,
      volumeChangePercent: variation(volumeActif, precedent?.volumeActive),
      historyDays: tendance.historyDays,
      sellThroughRate: rotation.taux,
      sellThroughSample: rotation.cohorte,
      medianDaysToDisappear: rotation.joursMedian,
      confidence: qualite.confidence,
      publishable: qualite.publishable,
      qualityNote: qualite.note,
      lastAnalyzedAt: maintenant,
      ...(balayage ? { lastSweepAt: maintenant, sweepCoverage: couvertureDesZones } : {}),
    }

    await prisma.categoryMarket.upsert({
      where: { category },
      update: instantane,
      create: { category, ...instantane },
    })
  }

  // La note d'opportunité se recalcule ici, une fois la médiane de la catégorie
  // connue : c'est elle qui sert de référence de revente. Le faire à chaque
  // passage, plutôt qu'une fois à l'écriture, garantit que la note d'une
  // annonce suit le marché — une bonne affaire d'hier ne l'est plus quand toute
  // la catégorie a baissé.
  let notees = 0
  try {
    const bilan = await noterCategorie(category, prixMedian, volumeActif)
    notees = bilan.notes
  } catch (err) {
    // Une notation ratée ne doit pas perdre la collecte : les annonces sont
    // déjà écrites, et la note sera recalculée au passage suivant.
    console.error(`market-sync: notation impossible pour ${category}`, err)
  }

  return { annoncesEcrites: ecrites, perimees, volumeActif, prixMoyen, prixMedian, notees, absentes, disparues }
}

/**
 * Volume actif en dessous duquel une médiane ne veut rien dire.
 *
 * Trente annonces, ce n'est pas un marché, c'est un échantillon. Afficher
 * « prix médian 42 € » sur cette base donne un chiffre précis et faux.
 */
const VOLUME_MINIMUM_PUBLIABLE = 60

/**
 * Faut-il mettre cette catégorie en avant ?
 *
 * Le principe est de ne rien afficher dont on ne puisse pas dire d'où ça vient.
 * Une catégorie n'est mise en avant que si les trois piliers tiennent : assez
 * d'annonces pour que la médiane soit une médiane, assez d'historique pour que
 * la tendance soit une tendance, et une rotation qui n'est pas un cimetière.
 *
 * Le troisième pilier a une nuance : au démarrage d'une catégorie, la rotation
 * n'est pas encore *mesurée*, ce qui n'est pas la même chose que mesurée et
 * mauvaise. Dans ce cas la catégorie reste publiable si le reste tient, mais
 * elle est marquée « en-mesure » et la phrase le dit. Le jour où la mesure
 * tombe, une rotation faible la fait sortir.
 */
export function evaluerQualite(entree: {
  volumeActif: number
  tendance: { direction: string; historyDays: number; explication: string }
  rotation: { taux: number | null; cohorte: number; explication: string }
  balayage?: ContexteBalayage
}): { publishable: boolean; confidence: 'confirme' | 'en-mesure' | 'insuffisant'; note: string } {
  const manques: string[] = []

  if (entree.volumeActif < VOLUME_MINIMUM_PUBLIABLE) {
    manques.push(
      `seulement ${entree.volumeActif} annonce${entree.volumeActif > 1 ? 's' : ''} active${entree.volumeActif > 1 ? 's' : ''} ` +
        `(${VOLUME_MINIMUM_PUBLIABLE} nécessaires pour une médiane fiable)`,
    )
  }
  if (entree.tendance.direction === 'inconnue') {
    manques.push(
      `${entree.tendance.historyDays} jour${entree.tendance.historyDays > 1 ? 's' : ''} de relevés ` +
        `sur ${HISTORIQUE_MINIMUM} nécessaires pour une tendance`,
    )
  }
  // Une rotation mesurée et faible est un motif d'exclusion à part entière :
  // une catégorie où presque rien ne part ne se revend pas, quel que soit
  // l'écart de prix affiché.
  if (entree.rotation.taux !== null && entree.rotation.taux < 0.1) {
    manques.push(`rotation trop faible (${Math.round(entree.rotation.taux * 100)} % du stock part en 7 jours)`)
  }

  if (manques.length > 0) {
    return {
      publishable: false,
      confidence: 'insuffisant',
      note: `Pas encore assez fiable pour être conseillée : ${manques.join(' ; ')}.`,
    }
  }

  const rotationMesuree = entree.rotation.taux !== null
  const balaye = entree.balayage !== undefined

  if (!rotationMesuree || !balaye) {
    const attentes: string[] = []
    if (!rotationMesuree) {
      attentes.push(
        `rotation en cours de mesure (${entree.rotation.cohorte} annonce${entree.rotation.cohorte > 1 ? 's' : ''} ` +
          `suivie${entree.rotation.cohorte > 1 ? 's' : ''} sur ${COHORTE_MINIMUM})`,
      )
    }
    if (!balaye) attentes.push('catalogue pas encore parcouru en entier')
    return {
      publishable: true,
      confidence: 'en-mesure',
      note: `${entree.tendance.explication} ${attentes.join(', ')}.`,
    }
  }

  return {
    publishable: true,
    confidence: 'confirme',
    note: `${entree.tendance.explication} ${entree.rotation.explication}`,
  }
}
