'use client'

import Link from 'next/link'
import { ArrowLeft, Building2, Globe, Mail, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

const blocks = [
  {
    title: 'Éditeur du site',
    body: 'ResellQ est le prestataire de la plateforme et du service accessible via le site internet et ses interfaces associées.',
  },
  {
    title: 'Hébergeur',
    body: 'Le site est hébergé par un prestataire technique spécialisé dans l'hébergement de services web et applications. Les informations d'hébergement peuvent être mises à jour selon la configuration technique retenue.',
  },
  {
    title: 'Responsable de publication',
    body: 'La responsabilité éditoriale du site est assumée par ResellQ, ou par la personne désignée à cet effet pour la gestion de la plateforme.',
  },
  {
    title: 'Contact',
    body: 'Pour toute demande d\'information, vous pouvez nous contacter à l\'adresse suivante : contact@resellq.com.',
  },
  {
    title: 'Propriété intellectuelle',
    body: 'L'ensemble des contenus, visuels, éléments graphiques, textes, logos, interfaces et fonctionnalités du site est protégé par les droits de propriété intellectuelle applicables.',
  },
  {
    title: 'Droit applicable',
    body: 'Le site est soumis au droit français. Tout litige relatif à son utilisation sera porté devant les tribunaux compétents du ressort de Paris, sauf disposition contraire impérative.',
  },
]

export default function MentionsLegalesPage() {
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
                <Building2 className="h-3.5 w-3.5" />
                Mentions légales
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Informations légales et identité du service</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Les mentions ci-dessous donnent les informations essentielles relatives à l'éditeur du site, à l'hébergement, aux coordonnées de contact et au cadre juridique d'utilisation du service.
              </p>
            </div>

            <div className="space-y-5">
              {blocks.map(block => (
                <div key={block.title} className="rounded-2xl border border-white/10 bg-background/60 p-5">
                  <h2 className="mb-2 text-lg font-semibold text-foreground">{block.title}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{block.body}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  Site
                </div>
                <p className="text-sm text-muted-foreground">resellq.com</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  Contact
                </div>
                <p className="text-sm text-muted-foreground">contact@resellq.com</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Scale className="h-4 w-4 text-primary" />
                  Cadre
                </div>
                <p className="text-sm text-muted-foreground">Droit français</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
