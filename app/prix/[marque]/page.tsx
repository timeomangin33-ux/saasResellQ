import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { marquesPubliables, statistiquesMarque } from '@/lib/prix-public'

/**
 * Une page par marque : « Prix des Nike sur Vinted ».
 *
 * C'est exactement ce que les gens tapent avant d'acheter ou de mettre en
 * vente, et c'est la requête sur laquelle un outil d'analyse a quelque chose
 * d'unique à dire, puisqu'il relève les prix tous les jours.
 *
 * Les pages ne sont générées que pour les marques ayant assez d'annonces pour
 * qu'une médiane veuille dire quelque chose. Publier une page « prix moyen »
 * calculée sur six annonces reviendrait à inventer un chiffre, ce que ce
 * produit s'interdit partout ailleurs.
 */

export const revalidate = 86400
export const dynamicParams = true

export async function generateStaticParams() {
  const marques = await marquesPubliables()
  return marques.map((m) => ({ marque: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ marque: string }>
}): Promise<Metadata> {
  const { marque } = await params
  const stats = await statistiquesMarque(marque)
  if (!stats) return { title: 'Marque introuvable — ResellQ' }

  const prix = Math.round(stats.prixMedian)
  const titre = `Prix des ${stats.marque} sur Vinted : ${prix} € en médiane`
  const description =
    `Relevé sur ${stats.annonces.toLocaleString('fr-FR')} annonces Vinted en ligne : les ${stats.marque} se demandent ` +
    `${prix} € en médiane, de ${Math.round(stats.prixBas)} € à ${Math.round(stats.prixHaut)} €. Détail par état et par catégorie, mis à jour chaque jour.`

  return {
    title: `${titre} — ResellQ`,
    description,
    alternates: { canonical: `/prix/${stats.slug}` },
    openGraph: { title: titre, description, type: 'article' },
  }
}

function euros(valeur: number) {
  return valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default async function PageMarque({ params }: { params: Promise<{ marque: string }> }) {
  const { marque } = await params
  const stats = await statistiquesMarque(marque)
  if (!stats) notFound()

  const dateReleve = stats.misAJourLe
    ? new Date(stats.misAJourLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // Le balisage que Google lit pour comprendre qu'il s'agit d'un relevé de
  // prix daté, et non d'une page de vente.
  const donneesStructurees = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Prix demandés des ${stats.marque} sur Vinted`,
    description: `Relevé quotidien des prix demandés sur ${stats.annonces} annonces Vinted de la marque ${stats.marque}.`,
    creator: { '@type': 'Organization', name: 'ResellQ', url: 'https://www.resellq.com' },
    temporalCoverage: stats.misAJourLe ? new Date(stats.misAJourLe).toISOString().slice(0, 10) : undefined,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Prix médian demandé', value: stats.prixMedian, unitCode: 'EUR' },
      { '@type': 'PropertyValue', name: 'Annonces relevées', value: stats.annonces },
    ],
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />

      <nav className="text-sm text-muted-foreground">
        <Link href="/prix" className="transition hover:text-foreground">
          Prix sur Vinted
        </Link>
        <span className="mx-2">/</span>
        <span className="capitalize text-foreground">{stats.marque}</span>
      </nav>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        Prix des <span className="capitalize">{stats.marque}</span> sur Vinted
      </h1>

      <p className="mt-5 text-lg text-muted-foreground">
        Sur les <strong className="text-foreground">{stats.annonces.toLocaleString('fr-FR')} annonces</strong>{' '}
        <span className="capitalize">{stats.marque}</span> en ligne au dernier relevé, le prix demandé médian est de{' '}
        <strong className="text-foreground">{euros(stats.prixMedian)}</strong>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <p className="text-xs uppercase tracking-widest text-emerald-400">Médian</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{euros(stats.prixMedian)}</p>
          <p className="mt-1 text-xs text-muted-foreground">la moitié des annonces en dessous</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Le gros des annonces</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {euros(stats.prixBas)}–{euros(stats.prixHaut)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">8 annonces sur 10 dans cette fourchette</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Intéressent quelqu&apos;un</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {stats.partAvecFavori !== null ? `${stats.partAvecFavori} %` : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.partAvecFavori !== null ? 'ont au moins un favori' : 'pas encore mesuré'}
          </p>
        </div>
      </div>

      {stats.parEtat.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Le prix selon l&apos;état</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            C&apos;est l&apos;écart qui décide s&apos;il vaut le coup de racheter une pièce abîmée.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">État</th>
                  <th className="px-5 py-3 text-right font-medium">Prix médian</th>
                  <th className="px-5 py-3 text-right font-medium">Annonces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.parEtat.map((e) => (
                  <tr key={e.etat}>
                    <td className="px-5 py-3">{e.etat}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{euros(e.prixMedian)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{e.annonces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.parCategorie.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Où on la trouve</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Catégorie</th>
                  <th className="px-5 py-3 text-right font-medium">Prix médian</th>
                  <th className="px-5 py-3 text-right font-medium">Annonces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.parCategorie.map((c) => (
                  <tr key={c.categorie}>
                    <td className="px-5 py-3">{c.categorie}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{euros(c.prixMedian)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{c.annonces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-12 rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Comment ces chiffres sont obtenus.</strong> Un robot relève les annonces
        Vinted en ligne plusieurs fois par jour et calcule la médiane des prix demandés. Ce ne sont pas des prix de
        vente : Vinted ne publie pas ses transactions. Une annonce non revue depuis sept jours sort du calcul.
        {dateReleve && ` Dernier relevé : ${dateReleve}.`}
      </p>

      <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8">
        <h2 className="text-xl font-semibold">
          Repérer les <span className="capitalize">{stats.marque}</span> sous-cotées, sans regarder
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          ResellQ compare chaque annonce à la médiane de sa propre marque et remonte celles qui s&apos;en écartent, avec
          le gain estimé et le signal de demande. Compte gratuit, sans carte.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Créer un compte gratuit
          </Link>
          <Link
            href="/prix"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted/50"
          >
            Voir les autres marques
          </Link>
        </div>
      </section>
    </main>
  )
}
