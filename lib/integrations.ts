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
      nom: 'Notation des annonces',
      configuree: Boolean(process.env.OPENAI_API_KEY),
      consequence: "Les notes d'opportunité et les marges estimees ne se calculent pas.",
    },
    {
      // Les fonctions IA passent par des agents n8n, pas par OpenAI en direct.
      // Sans cette adresse, chaque appel repond « momentanement indisponible »
      // apres avoir debite des credits : l'assistant et les rapports sont donc
      // masques dans le menu plutot que proposes puis refuses.
      cle: 'N8N_WEBHOOK_BASE_URL',
      nom: 'Assistant IA et rapports',
      configuree: Boolean(process.env.N8N_WEBHOOK_BASE_URL),
      consequence: "L'assistant, les rapports et l'analyse d'annonce sont indisponibles.",
    },
    {
      cle: 'VINTED_COOKIE_SECRET',
      nom: 'Connexion d’un compte Vinted',
      // Deux conditions, et la seconde est celle qui manquait.
      //
      // La clé sert à chiffrer la session : trop courte, le chiffrement refuse
      // de démarrer, et c'est le bon comportement. Mais elle fait partie des
      // variables exigées au démarrage : en production elle est donc toujours
      // posée, et ce test seul répondait « configurée » quoi qu'il arrive.
      // Le menu affichait « Comptes Vinted » à tout abonné Business, pour une
      // fonction qui ne peut pas aboutir.
      //
      // Ce qui bloque vraiment est ailleurs : lib/vinted-connector.ts pilote un
      // navigateur (lib/playwright-vinted.ts, `chromium.launch()`), et il n'y a
      // pas de Chromium sur une fonction serverless.
      configuree: (process.env.VINTED_COOKIE_SECRET || '').length >= 32 && navigateurDisponible(),
      consequence: 'Connecter un compte Vinted échoue, y compris sur le forfait Business.',
    },
  ]
}

/**
 * Un navigateur peut-il être lancé ici ?
 *
 * Toute la connexion d'un compte Vinted en dépend : lire les annonces d'un
 * membre demande sa session, et cette session s'obtient en pilotant un vrai
 * navigateur. Sur Vercel, le binaire n'existe pas — l'appel échoue au
 * lancement, avec une erreur qui parle de Chromium à quelqu'un qui voulait
 * voir ses ventes.
 *
 * Le poste de développement, lui, a Playwright installé : la fonction doit
 * continuer d'y marcher, sinon on ne peut plus la reprendre. D'où un test sur
 * l'hébergement plutôt qu'un retrait pur et simple du code.
 */
export function navigateurDisponible() {
  // Échappatoire pour un hébergement qui embarque Chromium (un conteneur bâti
  // depuis le Dockerfile du dépôt, par exemple) : sans elle, la fonction
  // resterait masquée sur une machine parfaitement capable de la rendre.
  const force = process.env.NAVIGATEUR_DISPONIBLE
  if (force === 'true') return true
  if (force === 'false') return false

  // Posée par Vercel dans tous ses environnements.
  return !process.env.VERCEL
}

export function integrationConfiguree(cle: string) {
  return etatDesIntegrations().find((i) => i.cle === cle)?.configuree ?? false
}

/**
 * Les fonctions IA sont-elles utilisables ?
 *
 * Elles passent toutes par des agents n8n. Sans `N8N_WEBHOOK_BASE_URL`, chaque
 * appel debite des credits puis repond « momentanement indisponible » : le
 * compteur descend, la reponse n'arrive jamais. Mieux vaut ne pas proposer la
 * fonction que la proposer et la refuser.
 */
export function assistantIADisponible() {
  return Boolean(process.env.N8N_WEBHOOK_BASE_URL)
}
