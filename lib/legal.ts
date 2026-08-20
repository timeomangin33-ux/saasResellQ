/**
 * Identité légale de l'éditeur.
 *
 * L'article 6-III de la LCEN impose de publier des informations précises :
 * dénomination, forme juridique, adresse du siège, numéro d'immatriculation,
 * capital social, directeur de la publication, et l'identité de l'hébergeur.
 * Aucune de ces valeurs ne peut être devinée, elles viennent donc de
 * l'environnement. Tant qu'elles ne sont pas renseignées, la page le dit au
 * lieu de faire semblant : une mention légale vague n'a aucune valeur, et
 * une mention légale inventée est pire que pas de mention du tout.
 *
 * À définir sur Vercel, en variables d'environnement du projet.
 */
export type ChampLegal = {
  cle: string
  libelle: string
  valeur: string | undefined
  requis: boolean
}

export const IDENTITE_EDITEUR: ChampLegal[] = [
  {
    cle: 'NEXT_PUBLIC_LEGAL_RAISON_SOCIALE',
    libelle: 'Dénomination sociale',
    valeur: process.env.NEXT_PUBLIC_LEGAL_RAISON_SOCIALE,
    requis: true,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_FORME',
    libelle: 'Forme juridique',
    valeur: process.env.NEXT_PUBLIC_LEGAL_FORME,
    requis: true,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_ADRESSE',
    libelle: 'Siège social',
    valeur: process.env.NEXT_PUBLIC_LEGAL_ADRESSE,
    requis: true,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_SIRET',
    libelle: 'SIRET',
    valeur: process.env.NEXT_PUBLIC_LEGAL_SIRET,
    requis: true,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_DIRECTEUR',
    libelle: 'Directeur de la publication',
    valeur: process.env.NEXT_PUBLIC_LEGAL_DIRECTEUR,
    requis: true,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_CAPITAL',
    libelle: 'Capital social',
    valeur: process.env.NEXT_PUBLIC_LEGAL_CAPITAL,
    requis: false,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_TVA',
    libelle: 'Numéro de TVA intracommunautaire',
    valeur: process.env.NEXT_PUBLIC_LEGAL_TVA,
    requis: false,
  },
  {
    cle: 'NEXT_PUBLIC_LEGAL_TELEPHONE',
    libelle: 'Téléphone',
    valeur: process.env.NEXT_PUBLIC_LEGAL_TELEPHONE,
    requis: false,
  },
]

/** Les champs effectivement renseignés, dans l'ordre de déclaration. */
export function champsRenseignes(): ChampLegal[] {
  return IDENTITE_EDITEUR.filter(c => Boolean(c.valeur && c.valeur.trim()))
}

/** Les champs obligatoires qui manquent encore. */
export function champsManquants(): ChampLegal[] {
  return IDENTITE_EDITEUR.filter(c => c.requis && !(c.valeur && c.valeur.trim()))
}

export function identiteComplete(): boolean {
  return champsManquants().length === 0
}

/**
 * L'hébergeur, lui, est connu : le site tourne sur Vercel. L'adresse reste
 * paramétrable, elle doit être recopiée depuis les documents de Vercel plutôt
 * que devinée.
 */
export const HEBERGEUR = {
  nom: 'Vercel Inc.',
  site: 'https://vercel.com',
  adresse: process.env.NEXT_PUBLIC_LEGAL_HEBERGEUR_ADRESSE,
}
