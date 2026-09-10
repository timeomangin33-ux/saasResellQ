/**
 * Crée (ou met à jour) un code de parrainage et affiche le lien à partager.
 *
 *   npm run parrainage:creer -- VINCENT "Vincent Dupont" 30 vincent@exemple.fr
 *   npm run parrainage:creer -- VINCENT "Vincent Dupont"          (30 % par défaut)
 *
 * Le lien est la seule chose à donner au partenaire : le middleware pose un
 * cookie au clic, et l'inscription qui suit dans les 60 jours lui est attribuée.
 *
 * Ce script n'écrit qu'un code et un taux. Il ne crée aucune commission, ne
 * touche à aucun abonnement et ne déclenche évidemment aucun paiement : les
 * commissions sont enregistrées par le webhook Stripe, sur les factures
 * réellement encaissées, et les virements aux partenaires restent des gestes
 * manuels faits en dehors de ResellQ.
 *
 * Relancer la commande sur un code existant met à jour le bénéficiaire, l'email
 * et le taux. Le taux ne vaut que pour la suite : chaque commission déjà
 * enregistrée a gardé celui appliqué le jour où elle a été calculée, sinon
 * changer un taux réécrirait l'historique de ce qui était dû.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

async function main() {
  const [codeBrut, beneficiaire, tauxBrut = '30', emailBrut] = process.argv.slice(2)

  if (!codeBrut || !beneficiaire) {
    console.error('Usage : npm run parrainage:creer -- <CODE> "<Nom du bénéficiaire>" [taux] [email]')
    process.exit(1)
  }

  // Le code voyage dans une URL puis dans un cookie : on refuse tout ce qui
  // devrait être encodé, sinon le lien partagé ne ramènerait pas le bon code.
  const code = codeBrut.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
    console.error(`Code invalide « ${codeBrut} ». Lettres, chiffres, tirets et tirets bas, 2 à 40 caractères.`)
    process.exit(1)
  }

  const taux = Number(tauxBrut)
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
    console.error(`Taux invalide « ${tauxBrut} ». Attendu : un pourcentage entre 0 et 100.`)
    process.exit(1)
  }

  const email = emailBrut?.trim().toLowerCase() || null
  if (email && !email.includes('@')) {
    console.error(`Email invalide « ${emailBrut} ».`)
    process.exit(1)
  }

  const { prisma } = await import('../prisma')

  const existant = await prisma.referral.findUnique({ where: { code } })

  const referral = await prisma.referral.upsert({
    where: { code },
    create: { code, beneficiaire: beneficiaire.trim(), email, commissionPct: taux, actif: true },
    update: { beneficiaire: beneficiaire.trim(), email, commissionPct: taux, actif: true },
  })

  // Un lien de parrainage se partage : il doit porter le domaine public, pas
  // celui du poste. NEXT_PUBLIC_APP_URL vaut « http://localhost:3000 » dans le
  // .env local, ce qui est correct pour le développement et inutilisable ici —
  // le premier lien produit pointait vers localhost.
  const configuree = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const publique = configuree && !/localhost|127\.0\.0\.1/.test(configuree)
  const base = publique ? configuree : 'https://www.resellq.com'
  const lien = `${base}/?ref=${referral.code}`

  if (existant) {
    console.log(`Code « ${referral.code} » mis à jour.`)
    console.log(`Avant : ${existant.beneficiaire} — ${existant.commissionPct} %${existant.actif ? '' : ' (inactif)'}`)
    console.log(`Après : ${referral.beneficiaire} — ${referral.commissionPct} %`)
    console.log(`Le nouveau taux ne s'applique qu'aux prochaines factures ; les commissions déjà enregistrées gardent le leur.`)
  } else {
    console.log(`Code « ${referral.code} » créé pour ${referral.beneficiaire}, commission ${referral.commissionPct} %.`)
  }

  console.log(`\nLien à partager :\n${lien}`)
  console.log(
    `\nCe lien attribue à ${referral.beneficiaire} toute inscription faite dans les 60 jours suivant le clic.\n` +
      `Les commissions apparaîtront sur /admin/parrainage au fil des factures Stripe réellement encaissées.\n` +
      `ResellQ ne fait qu'enregistrer ce qui est dû : aucun virement n'est envoyé automatiquement, vous payez ${referral.beneficiaire} vous-même.`,
  )

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Impossible :', err instanceof Error ? err.message : err)
  process.exit(1)
})
