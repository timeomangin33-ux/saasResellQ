/**
 * Session Vinted.
 *
 * Pourquoi ce fichier existe : l'API JSON de Vinted (`/api/v2/...`) refuse
 * toute requête sans cookie de session. Une requête nue répond
 * `401 {"code":100,"message_code":"invalid_authentication_token"}` — vérifié
 * en direct sur www.vinted.fr. Le cookie qui compte, `access_token_web`, est
 * httpOnly : il n'est pas lisible en JavaScript, il faut le récupérer dans les
 * en-têtes `Set-Cookie` d'une visite normale de la page d'accueil.
 *
 * Vinted en délivre un aux visiteurs anonymes. On n'a donc besoin d'aucun
 * compte pour lire le catalogue public — mais si l'exploitant en fournit un
 * (VINTED_SESSION_COOKIE), on l'utilise : une session authentifiée est moins
 * souvent contrôlée par DataDome, qui protège le site.
 */

const BASE = 'https://www.vinted.fr'

/** Un vrai en-tête de navigateur. DataDome regarde la cohérence de ce bloc. */
export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/** Erreur émise quand Vinted bloque activement (DataDome, 403, 429). */
export class VintedBlockedError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'VintedBlockedError'
    this.status = status
  }
}

/** Erreur émise quand la session est refusée et ne peut pas être renouvelée. */
export class VintedAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VintedAuthError'
  }
}

type Jar = Map<string, string>

let jar: Jar = new Map()
let jarCreatedAt = 0
let bootstrapEnCours: Promise<void> | null = null

/**
 * Un cookie de session Vinted vit quelques heures. On le renouvelle bien avant
 * l'expiration : rencontrer un 401 en plein passage du robot coûte une requête
 * perdue et une reprise, alors qu'un renouvellement préventif ne coûte rien.
 */
const DUREE_DE_VIE_JAR_MS = 25 * 60 * 1000

function parseSetCookie(entries: string[], cible: Jar) {
  for (const brut of entries) {
    const premier = brut.split(';')[0]
    const separateur = premier.indexOf('=')
    if (separateur <= 0) continue
    const nom = premier.slice(0, separateur).trim()
    const valeur = premier.slice(separateur + 1).trim()
    // Une valeur vide est une suppression de cookie, pas une valeur.
    if (!valeur || valeur === '""') {
      cible.delete(nom)
      continue
    }
    cible.set(nom, valeur)
  }
}

/**
 * Lit les en-têtes `Set-Cookie` d'une réponse.
 *
 * `Headers.getSetCookie()` est la seule méthode qui rend les en-têtes séparés :
 * `get('set-cookie')` les concatène, et une date d'expiration contient une
 * virgule, donc les recouper est impossible de façon fiable. La méthode existe
 * dans Node 20+ ; le repli sert aux runtimes plus anciens, où l'on n'obtient
 * qu'un cookie mais où l'on ne perd rien de plus.
 */
function lireSetCookie(reponse: Response): string[] {
  const entetes = reponse.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof entetes.getSetCookie === 'function') return entetes.getSetCookie()
  const brut = reponse.headers.get('set-cookie')
  return brut ? [brut] : []
}

function serialiser(cible: Jar) {
  return [...cible.entries()].map(([n, v]) => `${n}=${v}`).join('; ')
}

/** Cookie fourni par l'exploitant, s'il en a configuré un. */
function cookieDeConfiguration(): Jar | null {
  const brut = process.env.VINTED_SESSION_COOKIE?.trim()
  if (!brut) return null
  const cible: Jar = new Map()
  for (const morceau of brut.split(';')) {
    const separateur = morceau.indexOf('=')
    if (separateur <= 0) continue
    cible.set(morceau.slice(0, separateur).trim(), morceau.slice(separateur + 1).trim())
  }
  return cible.size > 0 ? cible : null
}

/**
 * Visite la page d'accueil comme un navigateur et récupère les cookies posés.
 * C'est la seule façon d'obtenir `access_token_web`, qui est httpOnly.
 */
async function bootstrap(): Promise<void> {
  const configure = cookieDeConfiguration()
  if (configure) {
    jar = configure
    jarCreatedAt = Date.now()
    return
  }

  const nouveau: Jar = new Map()
  const reponse = await fetch(`${BASE}/`, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  parseSetCookie(lireSetCookie(reponse), nouveau)

  if (reponse.status === 403 || reponse.status === 429) {
    throw new VintedBlockedError(
      reponse.status,
      `Vinted a refusé l'ouverture de session (HTTP ${reponse.status}). L'adresse IP est probablement filtrée par DataDome.`,
    )
  }

  if (!nouveau.has('access_token_web')) {
    throw new VintedAuthError(
      "Vinted n'a pas délivré de jeton de session (access_token_web absent). " +
        'Renseignez VINTED_SESSION_COOKIE avec le cookie d\'un navigateur connecté pour contourner.',
    )
  }

  jar = nouveau
  jarCreatedAt = Date.now()
}

/** Ouvre une session si nécessaire. Les appels concurrents partagent la même. */
export async function assurerSession(forcer = false): Promise<void> {
  const perimee = Date.now() - jarCreatedAt > DUREE_DE_VIE_JAR_MS
  if (!forcer && jar.has('access_token_web') && !perimee) return

  if (!bootstrapEnCours) {
    bootstrapEnCours = bootstrap().finally(() => {
      bootstrapEnCours = null
    })
  }
  await bootstrapEnCours
}

/** Invalide la session courante : le prochain appel en rouvrira une. */
export function invaliderSession() {
  jar = new Map()
  jarCreatedAt = 0
}

export function entetesAvecSession(supplementaires: Record<string, string> = {}) {
  return {
    ...BROWSER_HEADERS,
    Accept: 'application/json, text/plain, */*',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    Referer: `${BASE}/catalog`,
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: serialiser(jar),
    ...supplementaires,
  }
}

/** Absorbe les cookies renvoyés par une réponse (rotation du jeton DataDome). */
export function absorberCookies(reponse: Response) {
  const entetes = lireSetCookie(reponse)
  if (entetes.length > 0) parseSetCookie(entetes, jar)
}

/** Pour les diagnostics : état de la session sans révéler les valeurs. */
export function etatSession() {
  return {
    ouverte: jar.has('access_token_web'),
    cookies: [...jar.keys()],
    ageMs: jarCreatedAt ? Date.now() - jarCreatedAt : null,
    source: process.env.VINTED_SESSION_COOKIE ? 'configuree' : 'anonyme',
  }
}

export const BASE_VINTED = BASE
