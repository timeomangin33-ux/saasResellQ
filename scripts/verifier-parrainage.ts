/**
 * Éprouve un lien de parrainage contre la vraie production.
 *
 *   npm run parrainage:verifier -- VINCENTRESELL
 *   npm run parrainage:verifier -- VINCENTRESELL https://www.resellq.com
 *
 * Un partenariat se signe avant de rapporter quoi que ce soit, et jusqu'à la
 * première facture rien ne distingue « le lien marche, personne n'a encore
 * acheté » de « le lien ne marche pas ». `parrainage:tester` couvre la moitié
 * qui suit l'appel de Stripe ; celui-ci couvre celle d'avant, la seule que le
 * partenaire voie : l'attribution au clic.
 *
 * Il ne lit aucune base et n'a besoin d'aucun secret : tout passe par des
 * requêtes HTTP publiques, comme en ferait un visiteur. Il peut donc se lancer
 * de n'importe où, y compris depuis une machine qui n'est pas celle du projet.
 *
 * Il n'écrit rien non plus : l'appel qui interroge le comptage est fait en
 * mode essai, pour ne pas ajouter au relevé du partenaire un visiteur qui
 * n'existe pas.
 */

import { chargerEnv } from './charger-env'

const COOKIE = 'resellq_ref'
const FENETRE_JOURS = 60

interface Verification {
  nom: string
  ok: boolean
  detail: string
}

/**
 * Suit les redirections à la main, en gardant les cookies posés en chemin.
 *
 * `fetch` les suit tout seul, mais ne rend que les en-têtes de la dernière
 * réponse : un site qui redirige de resellq.com vers www.resellq.com pose son
 * cookie sur le premier saut, et on conclurait à tort qu'il n'en pose aucun.
 */
async function suivre(url: string, sauts = 3) {
  const cookies: string[] = []
  let courante = url
  let reponse: Response | null = null

  for (let i = 0; i <= sauts; i += 1) {
    reponse = await fetch(courante, { redirect: 'manual', headers: { 'user-agent': 'resellq-verificateur' } })
    cookies.push(...reponse.headers.getSetCookie())

    const suivante = reponse.headers.get('location')
    if (!suivante || reponse.status < 300 || reponse.status >= 400) break
    courante = new URL(suivante, courante).toString()
  }

  return { reponse: reponse as Response, cookies, urlFinale: courante }
}

/** Extrait le cookie d'attribution parmi tous ceux posés par la page. */
function cookieAttribution(cookies: string[]) {
  return cookies.find((c) => c.startsWith(`${COOKIE}=`)) ?? null
}

function valeurCookie(entete: string) {
  return entete.slice(COOKIE.length + 1).split(';')[0]?.trim() ?? ''
}

async function main() {
  chargerEnv()

  const code = (process.argv[2] || '').trim().toUpperCase()
  if (!code) {
    console.error('Usage : npm run parrainage:verifier -- <CODE> [url du site]')
    process.exit(1)
  }

  const configuree = (process.argv[3] || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  // Comme pour la création d'un lien : un localhost hérité du .env local
  // vérifierait le poste et non le site que voient les visiteurs.
  const base = configuree && !/localhost|127\.0\.0\.1/.test(configuree) ? configuree : 'https://www.resellq.com'

  console.log(`Code ${code} sur ${base}\n`)

  const verifications: Verification[] = []

  // 1. Le lien tel qu'il sera publié.
  const majuscules = await suivre(`${base}/?ref=${code}`)
  const pose = cookieAttribution(majuscules.cookies)

  verifications.push({
    nom: 'la page répond',
    ok: majuscules.reponse.status === 200,
    detail: `HTTP ${majuscules.reponse.status} sur ${majuscules.urlFinale}`,
  })

  verifications.push({
    nom: "le cookie d'attribution est posé",
    ok: Boolean(pose),
    detail: pose ? valeurCookie(pose) : 'aucun cookie resellq_ref dans la réponse',
  })

  if (pose) {
    verifications.push({
      nom: 'il porte le bon code',
      ok: valeurCookie(pose) === code,
      detail: `${valeurCookie(pose)} attendu ${code}`,
    })

    // Sans httpOnly, n'importe quel script de la page pourrait le réécrire et
    // réattribuer la vente à quelqu'un d'autre.
    verifications.push({
      nom: 'il est httpOnly',
      ok: /httponly/i.test(pose),
      detail: /httponly/i.test(pose) ? 'oui' : 'non — lisible en JavaScript',
    })

    const maxAge = Number(pose.match(/max-age=(\d+)/i)?.[1] ?? 0)
    const jours = Math.round(maxAge / 86400)
    verifications.push({
      nom: `il dure ${FENETRE_JOURS} jours`,
      ok: jours === FENETRE_JOURS,
      detail: `${jours} jour(s)`,
    })
  }

  // 2. Le même lien recopié en minuscules, cas courant d'une bio ou d'une
  //    description de vidéo retapée à la main.
  const minuscules = await suivre(`${base}/?ref=${code.toLowerCase()}`)
  const poseMinuscule = cookieAttribution(minuscules.cookies)
  verifications.push({
    nom: 'le lien en minuscules attribue aussi',
    ok: Boolean(poseMinuscule) && valeurCookie(poseMinuscule!) === code,
    detail: poseMinuscule ? valeurCookie(poseMinuscule) : 'aucun cookie',
  })

  // 3. Le code existe-t-il, actif, dans la base que sert la production ?
  //    C'est la seule question à laquelle le cookie ne répond pas : le
  //    middleware pose ce qu'il lit, sans rien vérifier.
  let connu: boolean | null = null
  try {
    const reponse = await fetch(`${base}/api/parrainage/visite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, essai: true }),
    })
    const corps = (await reponse.json().catch(() => ({}))) as { connu?: boolean }
    connu = corps.connu === true
  } catch {
    connu = null
  }

  verifications.push({
    nom: 'le code existe et est actif en production',
    ok: connu === true,
    detail:
      connu === true
        ? 'oui'
        : connu === false
          ? "inconnu ou désactivé — l'inscription ne sera attribuée à personne"
          : 'la route de comptage n’a pas répondu (déploiement plus ancien ?)',
  })

  let echecs = 0
  for (const v of verifications) {
    if (!v.ok) echecs += 1
    console.log(`${v.ok ? 'OK   ' : 'ECHEC'} ${v.nom} : ${v.detail}`)
  }

  if (echecs > 0) {
    console.error(`\n${echecs} vérification(s) en échec. Ce lien ne peut pas être donné à un partenaire en l'état.`)
    process.exit(1)
  }
  console.log(`\nLe lien ${base}/?ref=${code} attribue bien. Rien n'a été écrit.`)
}

main().catch((erreur) => {
  console.error('Impossible :', erreur instanceof Error ? erreur.message : erreur)
  process.exit(1)
})
