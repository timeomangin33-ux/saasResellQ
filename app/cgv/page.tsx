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
      'Les prÃ©sentes conditions gÃ©nÃ©rales de vente et dâ€™utilisation rÃ©gissent lâ€™accÃ¨s et lâ€™utilisation du service ResellQ, plateforme de recherche, dâ€™analyse et dâ€™assistance pour lâ€™identification dâ€™opportunitÃ©s de revente sur Vinted.',
  },
  {
    title: '2. Acceptation',
    body:
      'Lâ€™utilisation du service implique lâ€™acceptation pleine et entiÃ¨re des prÃ©sentes conditions. Si vous nâ€™acceptez pas ces conditions, vous ne devez pas utiliser le service.',
  },
  {
    title: '3. CrÃ©ation de compte et accÃ¨s',
    body:
      'Lâ€™accÃ¨s au service nÃ©cessite la crÃ©ation dâ€™un compte personnel, la fourniture dâ€™informations exactes et la protection de vos identifiants. Vous Ãªtes responsable de lâ€™usage de votre compte et de toute activitÃ© rÃ©alisÃ©e depuis celui-ci.',
  },
  {
    title: '4. Abonnement et paiement',
    body:
      'Lâ€™accÃ¨s aux fonctionnalitÃ©s premium est soumis Ã  un abonnement facturÃ© pÃ©riodiquement. Les paiements sont traitÃ©s via Stripe. Les abonnements sont renouvelÃ©s automatiquement sauf rÃ©siliation prÃ©alable par lâ€™utilisateur.',
  },
  {
    title: '5. Utilisation autorisÃ©e',
    body:
      'Vous vous engagez Ã  utiliser le service de maniÃ¨re licite, professionnelle, respectueuse des droits de tiers et conforme Ã  lâ€™usage attendu dâ€™une plateforme dâ€™analyse de donnÃ©es. Vous vous interdisez toute diffusion, reproduction, vente, revente ou publication non autorisÃ©e des contenus, donnÃ©es ou rÃ©sultats issus du service.',
  },
  {
    title: '6. Utilisation interdite',
    body:
      'Il est strictement interdit dâ€™utiliser le service pour reproduire, extraire, agrÃ©ger ou exploiter les donnÃ©es de maniÃ¨re abusive, de porter atteinte Ã  la sÃ©curitÃ© du systÃ¨me, de contourner des protections techniques, dâ€™introduire des contenus illicites ou de nuire Ã  la qualitÃ© du service.',
  },
  {
    title: '7. PropriÃ©tÃ© intellectuelle',
    body:
      'Tous les Ã©lÃ©ments du service, y compris l\'interface, les textes, les logos, les fonctionnalitÃ©s, les analyses et les contenus fournis, restent la propriÃ©tÃ© de ResellQ ou de ses partenaires, sauf disposition contraire.',
  },
  {
    title: '8. ResponsabilitÃ©',
    body:
      'ResellQ fournit un service d\'assistance Ã  la dÃ©cision et d\'analyse. Le service ne garantit pas les rÃ©sultats, la rentabilitÃ©, la disponibilitÃ© ou l\'exactitude absolue des donnÃ©es externes. L\'utilisateur reste responsable de ses dÃ©cisions commerciales et de l\'usage qu\'il fait des informations fournies.',
  },
  {
    title: '9. RÃ©siliation',
    body:
      'Nous pouvons suspendre ou rÃ©silier votre accÃ¨s en cas de non-respect des prÃ©sentes conditions, dâ€™usage abusif, dâ€™activitÃ© frauduleuse ou dâ€™infraction aux droits applicables.',
  },
  {
    title: '10. Droit applicable',
    body:
      'Les prÃ©sentes conditions sont rÃ©gies par le droit franÃ§ais. En cas de litige, les tribunaux compÃ©tents seront ceux du ressort de Paris, sauf disposition contraire impÃ©rative.',
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
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>

        <Card className="border-white/10 bg-card/80 backdrop-blur">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                <FileText className="h-3.5 w-3.5" />
                Conditions gÃ©nÃ©rales d&apos;utilisation
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">CGU et rÃ¨gles d&apos;utilisation du service</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Les prÃ©sentes conditions dÃ©finissent les droits et obligations applicables Ã  l&apos;utilisation du service ResellQ, ainsi que les rÃ¨gles applicables Ã  l&apos;accÃ¨s, aux abonnements et Ã  l&apos;usage des donnÃ©es et contenus fournis par la plateforme.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                Paiement et abonnement
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                L&apos;accÃ¨s aux fonctionnalitÃ©s payantes est soumis Ã  un abonnement. Les paiements sont sÃ©curisÃ©s et traitÃ©s via Stripe. Tout abonnement est renouvelÃ© automatiquement tant qu&apos;il n&apos;est pas rÃ©siliÃ© conformÃ©ment Ã  la procÃ©dure prÃ©vue par la plateforme.
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
                Vous vous engagez Ã  ne pas partager les donnÃ©es, contenus ou accÃ¨s du service avec des tiers non autorisÃ©s, Ã  ne pas dÃ©tourner l&apos;usage du service, et Ã  respecter les droits de propriÃ©tÃ© intellectuelle et de confidentialitÃ© des autres utilisateurs et partenaires.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gavel className="h-4 w-4" />
              DerniÃ¨re mise Ã  jour : 30 juin 2026
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

