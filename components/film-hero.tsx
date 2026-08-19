/**
 * Le film publicitaire, joué en boucle dans le héros de la page d'accueil.
 *
 * Le film vit dans `public/film/dezoome.html` : une page autonome qui contient
 * ses propres scènes, ses vignettes produit et son minutage. `?embed=1` la fait
 * tourner sans habillage ni contrôles, `&cut=30` sélectionne le montage court.
 * La page complète reste accessible telle quelle pour la partager ou l'enregistrer.
 *
 * Pas de `loading="lazy"` : c'est le héros, il doit être là tout de suite.
 * L'iframe étant un document séparé, son poids ne bloque pas le premier rendu.
 */
export function FilmHero() {
  return (
    <div className="mx-auto w-full max-w-[340px] lg:max-w-[380px]">
      <div className="rounded-[38px] border border-white/10 bg-background/80 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[30px] bg-black">
          <iframe
            src="/film/dezoome.html?embed=1&cut=30"
            title="ResellQ en trente secondes"
            scrolling="no"
            className="h-full w-full border-0"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-muted-foreground">
          Le marché Vinted au 18 août 2026. Données réelles, aucune mise en scène.
        </p>
        <a
          href="/film/dezoome.html"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Version longue
        </a>
      </div>
    </div>
  )
}
