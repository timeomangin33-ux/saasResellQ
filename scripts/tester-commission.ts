import { chargerEnv } from './charger-env'

/**
 * Verifie le chemin « facture payee -> commission due », sans argent reel.
 *
 * Le seul test vraiment complet serait un abonnement payant en production :
 * les cles Stripe de ce projet sont en mode live, donc ce test-la coute 75 EUR
 * et un remboursement. Ce script exerce a la place tout ce qui se passe apres
 * l'appel de Stripe — creation du filleul, ecriture de la dette, calcul du
 * montant, refus d'un doublon quand le webhook est rejoue — a l'interieur
 * d'une transaction qui est ensuite annulee.
 *
 * Rien n'est donc ecrit en base : ni compte, ni commission. C'est la seule
 * facon d'essayer l'insertion sans laisser derriere soi une ligne inventee
 * dans une table qui, elle, decrit de l'argent du a quelqu'un.
 *
 *   npm run parrainage:tester -- VINCENTRESELL
 */

const ROLLBACK = 'ROLLBACK_VOULU'

interface LigneCommission {
  montantDu: number
  commissionPct: number
  statut: string
}

async function main() {
  chargerEnv()
  const { prisma } = await import('../prisma')

  const code = (process.argv[2] || 'VINCENTRESELL').toUpperCase()
  const referral = await prisma.referral.findFirst({ where: { code, actif: true } })
  if (!referral) {
    console.error(`Aucun parrainage actif au code ${code}.`)
    process.exit(1)
  }
  console.log(`Parrainage : ${referral.code} -> ${referral.beneficiaire}, ${referral.commissionPct} %`)

  const facture = `in_essai_${Date.now()}`
  const encaisse = 7500 // 75,00 EUR, le forfait Pro
  const attendu = Math.round((encaisse * referral.commissionPct) / 100)

  let doublonRefuse = false
  // Dans un objet plutot que dans une variable : TypeScript ne suit pas les
  // affectations faites dans la fonction passee a $transaction, et reduisait
  // le type d'une simple `let` a `never` au moment de la relire.
  const relu: { ligne: LigneCommission | null } = { ligne: null }

  try {
    await prisma.$transaction(async (tx) => {
      const filleul = await tx.user.create({
        data: {
          email: `essai-parrainage-${Date.now()}@resellq.invalid`,
          name: 'Essai parrainage',
          referralCode: referral.code,
          referredAt: new Date(),
        },
      })

      await tx.referralCommission.create({
        data: {
          referralId: referral.id,
          userId: filleul.id,
          stripeInvoiceId: facture,
          montantEncaisse: encaisse,
          devise: 'eur',
          commissionPct: referral.commissionPct,
          montantDu: attendu,
          statut: 'du',
        },
      })

      const ligne = await tx.referralCommission.findUnique({ where: { stripeInvoiceId: facture } })
      relu.ligne = ligne
        ? { montantDu: ligne.montantDu, commissionPct: ligne.commissionPct, statut: ligne.statut }
        : null

      // Stripe rejoue un webhook des que sa requete n'aboutit pas. Le rejeu doit
      // buter sur l'unicite de la facture, sinon le partenaire serait paye deux
      // fois pour un seul encaissement.
      try {
        await tx.referralCommission.create({
          data: {
            referralId: referral.id,
            userId: filleul.id,
            stripeInvoiceId: facture,
            montantEncaisse: encaisse,
            devise: 'eur',
            commissionPct: referral.commissionPct,
            montantDu: attendu,
            statut: 'du',
          },
        })
      } catch (erreur: any) {
        if (erreur?.code !== 'P2002') throw erreur
        doublonRefuse = true
      }

      throw new Error(ROLLBACK)
    })
  } catch (erreur: any) {
    if (erreur?.message !== ROLLBACK && erreur?.code !== 'P2002') throw erreur
    // Un P2002 remonte jusqu'ici quand Postgres a deja rejete la transaction
    // entiere : c'est aussi une annulation, et c'est aussi le refus attendu.
    if (erreur?.code === 'P2002') doublonRefuse = true
  }

  const restant = await prisma.referralCommission.findUnique({ where: { stripeInvoiceId: facture } })

  const lu = relu.ligne

  const resultats: [string, boolean, string][] = [
    ['commission ecrite', lu !== null, lu ? 'oui' : 'non'],
    [
      'montant du',
      lu?.montantDu === attendu,
      `${((lu?.montantDu ?? 0) / 100).toFixed(2)} EUR attendu ${(attendu / 100).toFixed(2)} EUR`,
    ],
    ['taux recopie', lu?.commissionPct === referral.commissionPct, `${lu?.commissionPct ?? '-'} %`],
    ['statut initial', lu?.statut === 'du', String(lu?.statut ?? '-')],
    ['rejeu refuse', doublonRefuse, doublonRefuse ? 'P2002' : 'accepte deux fois'],
    ['rien laisse en base', restant === null, restant ? 'ligne persistee' : 'annule'],
  ]

  let echecs = 0
  for (const [nom, ok, detail] of resultats) {
    if (!ok) echecs += 1
    console.log(`${ok ? 'OK  ' : 'ECHEC'} ${nom} : ${detail}`)
  }

  await prisma.$disconnect()
  if (echecs > 0) {
    console.error(`\n${echecs} verification(s) en echec.`)
    process.exit(1)
  }
  console.log('\nLe chemin facture -> commission tient. Aucune ligne ecrite.')
}

main().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})
