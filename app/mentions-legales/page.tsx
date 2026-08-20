'use client'

import Link from 'next/link'
import { ArrowLeft, Building2, Globe, Mail, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { champsRenseignes, champsManquants, HEBERGEUR } from '@/lib/legal'

const blocks = [
  {
    title: 'Contact',
    body: 'Pour toute demande d\'information, vous pouvez nous contacter à l\'adresse suivante : contact@resellq.com.',
  },
  {
    title: 'Propriété intellectuelle',
    body: 'L\'ensemble des contenus, visuels, éléments graphiques, textes, logos, interfaces et fonctionnalités du site est protégé par les droits de propriété intellectuelle applicables.',
  },
  {
    title: 'Droit applicable',
    body: 'Le site est soumis au droit français. Tout litige relatif à son utilisation sera porté devant les tribunaux compétents du ressort de Paris, sauf disposition contraire impérative.',
  },
]

export default function MentionsLegalesPage() {
  const renseignes = champsRenseignes()
  const manquants = champsManquants()

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

            <div className="rounded-2xl border border-white/10 bg-background/60 p-5">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Éditeur du site</h2>
              {renseignes.length > 0 ? (
                <dl className="space-y-2">
                  {renseignes.map(champ => (
                    <div key={champ.cle} className="flex flex-wrap gap-x-3 text-sm leading-7">
                      <dt className="min-w-[13rem] text-muted-foreground">{champ.libelle}</dt>
                      <dd className="font-medium text-foreground">{champ.valeur}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {manquants.length > 0 ? (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-6 text-amber-200">
                  Les informations d&apos;identification de l&apos;éditeur ne sont pas encore
                  publiées. Elles sont obligatoires et seront ajoutées ici :{' '}
                  {manquants.map(c => c.libelle).join(', ')}. En attendant, vous
                  pouvez nous joindre à contact@resellq.com.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/60 p-5">
              <h2 className="mb-2 text-lg font-semibold text-foreground">Hébergeur</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Le site est hébergé par{' '}
                <span className="font-medium text-foreground">{HEBERGEUR.nom}</span>
                {HEBERGEUR.adresse ? `, ${HEBERGEUR.adresse}.` : ''}{' '}
                <a
                  href={HEBERGEUR.site}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  vercel.com
                </a>
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
