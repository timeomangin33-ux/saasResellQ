'use client'

import { MotionConfig } from 'framer-motion'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/*
        Le produit compte une quarantaine d'animations en boucle infinie —
        pastilles qui pulsent, icônes qui oscillent, dégradés qui défilent — et
        ne demandait jusqu'ici l'avis de personne. Pour qui souffre de troubles
        vestibulaires ou de migraines, un tableau de bord qui bouge en
        permanence n'est pas une signature visuelle, c'est une raison de
        fermer l'onglet ; ces personnes ont réglé leur système en conséquence,
        et le réglage était ignoré.

        « user » : suivre le choix du système. Framer arrête alors les
        animations de déplacement et d'échelle, et garde celles d'opacité, qui
        ne provoquent pas ce malaise. Le reste — animations CSS, défilement —
        est traité dans globals.css.

        Posé ici plutôt que dans chaque composant : une règle que l'on doit
        penser à répéter quarante-cinq fois est une règle déjà oubliée.
      */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  )
}
