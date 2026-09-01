import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'

/**
 * Les chiffres publics de la page de démonstration.
 *
 * La page affichait des constantes : « 73/100 opportunités du jour »,
 * « +410 € de marge potentielle », « +18 % d'indice de demande » et une courbe
 * de sept points écrite à la main. Un visiteur les lisait comme la production
 * réelle du produit. Ils ne mesuraient rien et ne bougeaient jamais.
 *
 * Cette route rend les mêmes indicateurs, calculés sur les annonces réellement
 * collectées. Elle ne divulgue aucune annonce précise — ni titre, ni lien, ni
 * vendeur : c'est justement ce qu'on vend. Seulement des agrégats.
 */

// Cinq minutes de cache : la page est publique et la donnée bouge à l'heure.
export const revalidate = 300

/** Au-dessus de cette note, on parle d'opportunité. */
const SEUIL_OPPORTUNITE = 70

export async function GET() {
  try {
    const [annoncesSuivies, categoriesSuivies, opportunites, meilleures, derniere, historique] =
      await Promise.all([
        prisma.product.count({ where: { status: 'active' } }),
        prisma.categoryMarket.count(),
        prisma.product.count({ where: { status: 'active', analysisScore: { gte: SEUIL_OPPORTUNITE } } }),
        prisma.product.findMany({
          where: { status: 'active', analysisScore: { gte: SEUIL_OPPORTUNITE } },
          orderBy: { analysisScore: 'desc' },
          take: 10,
          select: { price: true, totalPrice: true, profitMargin: true },
        }),
        prisma.product.findFirst({
          where: { lastSeenAt: { not: null } },
          orderBy: { lastSeenAt: 'desc' },
          select: { lastSeenAt: true },
        }),
        prisma.categoryMarketDaily.findMany({
          where: { day: { gte: new Date(Date.now() - 7 * 86_400_000) } },
          orderBy: { day: 'asc' },
          select: { day: true, volumeActive: true },
        }),
      ])

    // Le gain cumulé des dix meilleures annonces : « ce que ces dix-là
    // rapporteraient si on les revendait au prix médian de leur marque ».
    const gainTop10 =
      Math.round(
        meilleures.reduce((total, p) => {
          const cout = p.totalPrice ?? p.price
          return total + cout * ((p.profitMargin ?? 0) / 100)
        }, 0),
      ) || 0

    // Un point par jour : le nombre d'annonces suivies, toutes catégories
    // confondues. C'est ce que le robot voit du marché, jour après jour.
    const parJour = new Map<string, number>()
    for (const point of historique) {
      const cle = point.day.toISOString().slice(0, 10)
      parJour.set(cle, (parJour.get(cle) ?? 0) + (point.volumeActive ?? 0))
    }
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const courbe = [...parJour.entries()].map(([iso, valeur]) => ({
      day: jours[new Date(iso).getUTCDay()],
      value: valeur,
    }))

    const ageMinutes = derniere?.lastSeenAt
      ? Math.round((Date.now() - derniere.lastSeenAt.getTime()) / 60_000)
      : null

    // Variation du volume suivi sur la période, quand il y a de quoi comparer.
    const premier = courbe[0]?.value
    const dernier = courbe.at(-1)?.value
    const variationVolume =
      premier && dernier && premier > 0 && courbe.length > 1
        ? Math.round(((dernier - premier) / premier) * 1000) / 10
        : null

    return NextResponse.json({
      annoncesSuivies,
      categoriesSuivies,
      opportunites,
      gainTop10,
      ageMinutes,
      courbe,
      variationVolume,
      seuilOpportunite: SEUIL_OPPORTUNITE,
    })
  } catch {
    // Une page publique ne doit pas planter parce que la base tousse. Des
    // champs nuls, que la page affiche comme « — », valent mieux qu'une erreur.
    return NextResponse.json({
      annoncesSuivies: null,
      categoriesSuivies: null,
      opportunites: null,
      gainTop10: null,
      ageMinutes: null,
      courbe: [],
      variationVolume: null,
      seuilOpportunite: SEUIL_OPPORTUNITE,
    })
  }
}
