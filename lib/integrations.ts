/**
 * Ce qui est réellement branché, et ce qui ne l'est pas.
 *
 * Trois fonctions du produit dépendent d'une clé externe. Quand la clé
 * manque, elles ne tombent pas en panne bruyamment : l'alerte se crée mais
 * l'e-mail ne part jamais, l'analyse IA renvoie une erreur opaque, la
 * connexion Vinted répond 500 avec un message interne. L'utilisateur, lui,
 * croit que ça marche.
 *
 * Cet inventaire sert à le dire à l'écran plutôt que de laisser croire.
 */
export type Integration = {
  cle: string
  nom: string
  configuree: boolean
  consequence: string
}

export function etatDesIntegrations(): Integration[] {
  return [
    {
      cle: 'RESEND_API_KEY',
      nom: 'Envoi des e-mails',
      configuree: Boolean(process.env.RESEND_API_KEY),
      consequence: 'Les alertes se créent et se déclenchent, mais aucun e-mail ne part.',
    },
    {
      cle: 'OPENAI_API_KEY',
      nom: 'Analyse IA',
      configuree: Boolean(process.env.OPENAI_API_KEY),
      consequence: "L'assistant et les scores de rentabilité ne peuvent pas s'exécuter.",
    },
    {
      cle: 'VINTED_COOKIE_SECRET',
      nom: 'Connexion d’un compte Vinted',
      // La clé sert à chiffrer la session : trop courte, le chiffrement
      // refuse de démarrer, et c'est le bon comportement.
      configuree: (process.env.VINTED_COOKIE_SECRET || '').length >= 32,
      consequence: 'Connecter un compte Vinted échoue, y compris sur le forfait Business.',
    },
  ]
}

export function integrationConfiguree(cle: string) {
  return etatDesIntegrations().find((i) => i.cle === cle)?.configuree ?? false
}
