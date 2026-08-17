'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

const sections = [
  {
    title: '1. Données collectées',
    body:
      'Nous collectons les informations nécessaires à la création et au fonctionnement du compte, notamment votre adresse e-mail, votre nom, votre mot de passe (hashé), votre statut d\'abonnement et les données de paiement traitées via Stripe. Nous pouvons également collecter des données techniques de navigation, des logs d\'accès, des informations relatives à l\'utilisation du service et des données de scraping ou d\'analyse nécessaires à la fourniture du service.',
  },
  {
    title: '2. Finalités du traitement',
    body:
      'Vos données sont utilisées pour créer et gérer votre compte, vous permettre d\'accéder au service, traiter les paiements et abonnements, sécuriser l\'environnement, analyser l\'utilisation du service, améliorer la qualité du produit et répondre à nos obligations légales.',
  },
  {
    title: '3. Partage des données',
    body:
      'Nous ne vendons pas vos données personnelles. Nous ne les diffusons pas à des tiers à des fins commerciales, sauf lorsqu\'elles sont strictement nécessaires à l\'exécution du service : prestataires techniques, hébergeur, fournisseur de paiement, services d\'authentification et d\'analytique. Nous veillons à ce que ces prestataires respectent des obligations de confidentialité et de sécurité.',
  },
  {
    title: '4. Conservation',
    body:
      'Vos données sont conservées aussi longtemps que nécessaire pour la gestion de votre compte, l\'exécution du contrat, le respect de nos obligations légales, la prévention de la fraude et l\'amélioration du service. Les données de paiement sont conservées selon les obligations fiscales et comptables applicables.',
  },
  {
    title: '5. Vos droits',
    body:
      'Conformément au règlement général sur la protection des données, vous disposez d\'un droit d\'accès, de rectification, d\'effacement, d\'opposition, de limitation et de portabilité sur vos données personnelles. Vous pouvez également retirer votre consentement à tout moment lorsque le traitement repose sur celui-ci. Pour exercer vos droits, vous pouvez nous contacter à l\'adresse indiquée ci-dessous.',
  },
  {
    title: '6. Sécurité',
    body:
      'Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données contre la perte, l\'accès non autorisé, la divulgation ou la modification illicites. Toutefois, aucun système n\'est entièrement infalsifiable, et vous reconnaissez que la transmission de données sur Internet comporte des risques.',
  },
  {
    title: '7. Cookies et technologies similaires',
    body:
      'Le site peut utiliser des cookies ou technologies similaires pour mémoriser vos préférences, maintenir votre session, mesurer l\'audience et améliorer la qualité du service. Vous pouvez gérer vos préférences de cookies depuis votre navigateur.',
  },
]

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        <Card className="border-white/10 bg-card/80 backdrop-blur">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Politique de confidentialité
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Protection des données et confidentialité</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Cette politique décrit la manière dont ResellQ collecte, utilise, stocke et protège vos données personnelles. Elle vise également à vous informer de vos droits et des mesures prises pour garantir la confidentialité de votre utilisation du service.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                Ce que vous devez retenir
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Nous ne vendons ni ne partageons vos données personnelles à des fins commerciales sans nécessité. Les seules transmissions de données sont effectuées vers des prestataires strictement nécessaires au fonctionnement du service, à la sécurité et au paiement.
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
                <EyeOff className="h-4 w-4 text-primary" />
                Contact et exercice de vos droits
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Pour toute question relative à cette politique, à vos données personnelles ou pour exercer vos droits, vous pouvez nous contacter à l'adresse suivante : <span className="font-medium text-foreground">contact@resellq.com</span>.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Dernière mise à jour : 30 juin 2026
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
