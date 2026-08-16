'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, ShieldAlert, CreditCard, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

const sections = [
  {
    title: '1. Objet',
    body:
      'Les présentes conditions générales de vente et d’utilisation régissent l’accès et l’utilisation du service ResellQ, plateforme de recherche, d’analyse et d’assistance pour l’identification d’opportunités de revente sur Vinted.',
  },
  {
    title: '2. Acceptation',
    body:
      'L’utilisation du service implique l’acceptation pleine et entière des présentes conditions. Si vous n’acceptez pas ces conditions, vous ne devez pas utiliser le service.',
  },
  {
    title: '3. Création de compte et accès',
    body:
      'L’accès au service nécessite la création d’un compte personnel, la fourniture d’informations exactes et la protection de vos identifiants. Vous êtes responsable de l’usage de votre compte et de toute activité réalisée depuis celui-ci.',
  },
  {
    title: '4. Abonnement et paiement',
    body:
      'L’accès aux fonctionnalités premium est soumis à  un abonnement facturé périodiquement. Les paiements sont traités via Stripe. Les abonnements sont renouvelés automatiquement sauf résiliation préalable par l’utilisateur.',
  },
  {
    title: '5. Utilisation autorisée',
    body:
      'Vous vous engagez à  utiliser le service de manière licite, professionnelle, respectueuse des droits de tiers et conforme à  l’usage attendu d’une plateforme d’analyse de données. Vous vous interdisez toute diffusion, reproduction, vente, revente ou publication non autorisée des contenus, données ou résultats issus du service.',
  },
  {
    title: '6. Utilisation interdite',
    body:
      'Il est strictement interdit d’utiliser le service pour reproduire, extraire, agréger ou exploiter les données de manière abusive, de porter atteinte à  la sécurité du système, de contourner des protections techniques, d’introduire des contenus illicites ou de nuire à  la qualité du service.',
  },
  {
    title: '7. Propriété intellectuelle',
    body:
      'Tous les éléments du service, y compris l\'interface, les textes, les logos, les fonctionnalités, les analyses et les contenus fournis, restent la propriété de ResellQ ou de ses partenaires, sauf disposition contraire.',
  },
  {
    title: '8. Responsabilité',
    body:
      'ResellQ fournit un service d\'assistance à  la décision et d\'analyse. Le service ne garantit pas les résultats, la rentabilité, la disponibilité ou l\'exactitude absolue des données externes. L\'utilisateur reste responsable de ses décisions commerciales et de l\'usage qu\'il fait des informations fournies.',
  },
  {
    title: '9. Résiliation',
    body:
      'Nous pouvons suspendre ou résilier votre accès en cas de non-respect des présentes conditions, d’usage abusif, d’activité frauduleuse ou d’infraction aux droits applicables.',
  },
  {
    title: '10. Droit applicable',
    body:
      'Les présentes conditions sont régies par le droit français. En cas de litige, les tribunaux compétents seront ceux du ressort de Paris, sauf disposition contraire impérative.',
  },
]

export default function CgvPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l';accueil
            </Button>
          </Link>
        </div>

        <Card className="border-white/10 bg-card/80 backdrop-blur">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                <FileText className="h-3.5 w-3.5" />
                Conditions générales d';utilisation
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">CGU et règles d';utilisation du service</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Les présentes conditions définissent les droits et obligations applicables à  l';utilisation du service ResellQ, ainsi que les règles applicables à  l';accès, aux abonnements et à  l';usage des données et contenus fournis par la plateforme.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                Paiement et abonnement
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                L';accès aux fonctionnalités payantes est soumis à  un abonnement. Les paiements sont sécurisés et traités via Stripe. Tout abonnement est renouvelé automatiquement tant qu';il n';est pas résilié conformément à  la procédure prévue par la plateforme.
              </p>
            </div>

            <div className="space-y-5">
              {sections.map(section => (
                <div key={section.title} className="rounded-2xl border border-white/10 bg-background/60 p-5">
                  <h2 className="mb-2 text-lg font-semibold text-foreground">{section.title}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Engagements essentiels
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Vous vous engagez à  ne pas partager les données, contenus ou accès du service avec des tiers non autorisés, à  ne pas détourner l';usage du service, et à  respecter les droits de propriété intellectuelle et de confidentialité des autres utilisateurs et partenaires.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gavel className="h-4 w-4" />
              Dernière mise à  jour : 30 juin 2026
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

