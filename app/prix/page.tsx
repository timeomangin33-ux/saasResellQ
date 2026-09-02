import type { Metadata } from 'next'
import Link from 'next/link'
import { ampleurDuReleve, marquesPubliables } from '@/lib/prix-public'

/**
 * L'outil gratuit : les prix réellement demandés sur Vinted, par marque.
 *
 * Cette page n'existe pas pour vendre l'abonnement, elle existe pour être
 * utile toute seule. C'est le seul type de contenu qu'un outil d'analyse peut
 * offrir sans se vider : les chiffres bruts intéressent tout le monde, savoir
 * quoi en faire est ce qui se paie.
 */

// Une reconstruction par jour : les prix bougent à l'échelle de la semaine, et
// une page statique se sert instantanément à un visiteur venu de Google.
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Prix réels sur Vinted par marque — ResellQ',
  description:
    'Les prix demandés sur Vinted, marque par marque, relevés chaque jour sur des milliers d\'annonces réelles. Prix médian, fourchette, répartition par état. Gratuit et sans inscription.',
  alternates: { canonical: '/prix' },
  openGraph: {
    title: 'Prix réels sur Vinted, marque par marque',
    description: 'Relevés chaque jour sur des milliers d\'annonces. Gratuit, sans inscription.',
    type: 'website',
  },
}

function euros(valeur: number) {
  return valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default async function PagePrix() {
  const [marques, ampleur] = await Promise.all([marquesPubliables(), ampleurDuReleve()])

  const dateReleve = ampleur.misAJourLe
    ? new Date(ampleur.misAJourLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-400">Gratuit, sans inscription</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Combien se vend une marque sur Vinted ?
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Les prix réellement demandés, relevés chaque jour sur{' '}
          <strong className="text-foreground">{ampleur.annonces.toLocaleString('fr-FR')} annonces</strong> en ligne.
          Choisissez une marque pour voir son prix médian, sa fourchette et sa répartition par état.
        </p>
        {dateReleve && (
          <p className="mt-3 text-sm text-muted-foreground/70">Dernier relevé : {dateReleve}.</p>
        )}
      </header>

      {/* Le seul point sur lequel il ne faut pas laisser de doute : ce sont des
          prix demandés, pas des prix de vente. Vinted ne publie pas ses
          transactions, et prétendre le contraire rendrait tout le reste
          suspect. */}
      <p className="mt-8 rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Ce que ces chiffres sont exactement :</strong> le prix que les vendeurs
        demandent sur des annonces en ligne au moment du relevé. Vinted ne publie pas le prix auquel les articles
        partent réellement, donc personne ne peut l&apos;afficher — nous non plus.
      </p>

      {marques.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Le relevé est en cours de constitution. Revenez d&apos;ici peu.
        </p>
      ) : (
        <section className="mt-12">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {marques.length} marques relevées
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {marques.map((m) => (
              <Link
                key={m.slug}
                href={`/prix/${m.slug}`}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-emerald-400/40 hover:bg-muted/40"
              >
                <p className="font-medium capitalize transition-colors group-hover:text-emerald-300">{m.marque}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{euros(m.prixMedian)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  médian · {m.annonces.toLocaleString('fr-FR')} annonces
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8">
        <h2 className="text-xl font-semibold">Le prix médian ne suffit pas à acheter</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Savoir qu&apos;un Nike se demande autour de {euros(marques.find((m) => m.slug === 'nike')?.prixMedian ?? 20)}{' '}
          ne dit pas lesquels partent, ni lesquels sont sous-cotés maintenant. ResellQ suit les annonces en continu et
          signale celles qui s&apos;écartent du marché de leur propre marque.
        </p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Créer un compte gratuit
        </Link>
      </section>
    </main>
  )
}
