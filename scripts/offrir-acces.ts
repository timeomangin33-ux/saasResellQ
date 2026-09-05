/**
 * Offre un accès à quelqu'un, sans passer par Stripe.
 *
 *   npm run acces:offrir -- essai@exemple.fr PRO 30
 *   npm run acces:offrir -- essai@exemple.fr           (PRO, 14 jours)
 *   npm run acces:offrir -- essai@exemple.fr FREE 0    (retire l'accès)
 *
 * Il n'existait aucun moyen de faire ça. Le seul chemin vers un forfait actif
 * passait par le webhook Stripe, et le seul script existant, `seed-admin.ts`,
 * fabrique l'administrateur du site avec une adresse écrite en dur — donner un
 * essai à quelqu'un revenait à en faire un administrateur, c'est-à-dire à lui
 * ouvrir les statistiques de tous les comptes.
 *
 * Ce script écrit exactement les mêmes colonnes que le webhook Stripe
 * (`subscriptionStatus`, `subscriptionPlan`, `subscriptionEnd`), qui sont aussi
 * les seules que lit `authorizeFeature`. L'accès obtenu est donc identique à un
 * accès payé, à une différence près et elle est voulue : aucun abonnement n'est
 * créé chez Stripe, donc rien ne sera prélevé et rien ne se renouvellera. À la
 * date de fin, l'accès s'arrête tout seul.
 *
 * La personne doit avoir créé son compte avant : on ne fabrique pas de compte
 * à sa place, sinon il faudrait lui inventer un mot de passe et le lui
 * transmettre — deux mauvaises idées à la fois.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

const PLANS = ['FREE', 'STARTER', 'PRO', 'BUSINESS'] as const
type Plan = (typeof PLANS)[number]

async function main() {
  const [email, planBrut = 'PRO', joursBrut = '14'] = process.argv.slice(2)

  if (!email || !email.includes('@')) {
    console.error('Usage : npm run acces:offrir -- <email> [FREE|STARTER|PRO|BUSINESS] [jours]')
    process.exit(1)
  }

  const plan = planBrut.toUpperCase() as Plan
  if (!PLANS.includes(plan)) {
    console.error(`Forfait inconnu « ${planBrut} ». Attendu : ${PLANS.join(', ')}.`)
    process.exit(1)
  }

  const jours = Number(joursBrut)
  if (!Number.isFinite(jours) || jours < 0) {
    console.error(`Durée invalide « ${joursBrut} ».`)
    process.exit(1)
  }

  const { prisma } = await import('../prisma')
  const normalise = email.trim().toLowerCase()

  const utilisateur = await prisma.user.findUnique({
    where: { email: normalise },
    select: { id: true, email: true, name: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionEnd: true },
  })

  if (!utilisateur) {
    console.error(
      `Aucun compte pour « ${normalise} ».\n\n` +
        `La personne doit d'abord créer son compte sur le site, avec cette adresse exactement.\n` +
        `Relancez cette commande ensuite : l'accès est immédiat, elle n'aura qu'à se reconnecter.`,
    )
    await prisma.$disconnect()
    process.exit(2)
  }

  const retrait = plan === 'FREE' || jours === 0
  const fin = retrait ? null : new Date(Date.now() + jours * 86_400_000)

  const apres = await prisma.user.update({
    where: { id: utilisateur.id },
    data: {
      subscriptionPlan: retrait ? 'FREE' : plan,
      subscriptionStatus: retrait ? 'INACTIVE' : 'ACTIVE',
      subscriptionEnd: fin,
      // Les crédits IA repartent à zéro : un essai qui démarre sur un compteur
      // déjà consommé donnerait une mauvaise première impression pour une
      // raison qui n'a rien à voir avec le produit.
      aiCreditsUsed: 0,
      aiCreditsResetAt: new Date(),
    },
    select: { email: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionEnd: true },
  })

  console.log(`Avant : ${utilisateur.subscriptionPlan} / ${utilisateur.subscriptionStatus}` +
    (utilisateur.subscriptionEnd ? ` jusqu'au ${utilisateur.subscriptionEnd.toLocaleDateString('fr-FR')}` : ''))
  console.log(`Après : ${apres.subscriptionPlan} / ${apres.subscriptionStatus}` +
    (apres.subscriptionEnd ? ` jusqu'au ${apres.subscriptionEnd.toLocaleDateString('fr-FR')}` : ''))

  if (!retrait) {
    console.log(
      `\n${apres.email} a maintenant l'accès ${apres.subscriptionPlan} pendant ${jours} jour(s).\n` +
        `Aucun abonnement Stripe n'a été créé : rien ne sera prélevé, et l'accès s'arrête tout seul à la date de fin.\n` +
        `Si la personne est déjà connectée, elle doit se déconnecter et se reconnecter pour que son forfait soit relu.`,
    )
  } else {
    console.log(`\nL'accès de ${apres.email} a été retiré.`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Impossible :', err instanceof Error ? err.message : err)
  process.exit(1)
})
