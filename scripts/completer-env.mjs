/**
 * Complète les variables que Vercel refuse de rendre.
 *
 * `vercel pull` rapporte la liste des variables de production, mais toute
 * variable marquée « Sensitive » chez Vercel revient avec la valeur littérale
 * `[SENSITIVE]` — DATABASE_URL en fait partie. Une construction locale se
 * retrouve alors avec une URL de base de données qui vaut la chaîne
 * « [SENSITIVE] », et Prisma s'arrête sur « the URL must start with the
 * protocol postgresql:// ».
 *
 * Ce script remplace ces valeurs par celles du `.env.local` de la machine, qui
 * pointent sur la même base Neon. Il ne touche à rien d'autre et ne crée aucune
 * variable qui n'existait pas déjà côté Vercel.
 *
 * Les deux fichiers restent locaux : `.vercel/` et `.env.local` sont ignorés
 * par git.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const racine = process.cwd()
const cibleChemin = path.join(racine, '.vercel', '.env.production.local')
const sourceChemin = path.join(racine, '.env.local')

if (!existsSync(cibleChemin)) {
  console.error(`Fichier introuvable : ${cibleChemin}. Lancez d'abord « vercel pull ».`)
  process.exit(1)
}
if (!existsSync(sourceChemin)) {
  console.error(`Fichier introuvable : ${sourceChemin}.`)
  process.exit(1)
}

/** Lecture minimale d'un fichier .env : CLE=valeur, guillemets optionnels. */
function lire(chemin) {
  const valeurs = new Map()
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const nette = ligne.trim()
    if (!nette || nette.startsWith('#')) continue
    const separateur = nette.indexOf('=')
    if (separateur <= 0) continue
    let valeur = nette.slice(separateur + 1).trim()
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1)
    }
    valeurs.set(nette.slice(0, separateur).trim(), valeur)
  }
  return valeurs
}

const locales = lire(sourceChemin)
const lignes = readFileSync(cibleChemin, 'utf8').split(/\r?\n/)

const complétées = []
const manquantes = []

const sorties = lignes.map((ligne) => {
  const separateur = ligne.indexOf('=')
  if (separateur <= 0) return ligne

  const cle = ligne.slice(0, separateur).trim()
  const valeur = ligne.slice(separateur + 1).trim().replace(/^["']|["']$/g, '')
  if (valeur !== '[SENSITIVE]') return ligne

  const remplacement = locales.get(cle)
  if (remplacement === undefined) {
    manquantes.push(cle)
    return ligne
  }

  complétées.push(cle)
  return `${cle}="${remplacement}"`
})

writeFileSync(cibleChemin, sorties.join('\n'), 'utf8')

console.log(`${complétées.length} variable(s) complétée(s) depuis .env.local : ${complétées.join(', ') || 'aucune'}`)

if (manquantes.length > 0) {
  // Ce n'est pas fatal : une variable absente en local peut être inutile à la
  // construction. Mais elle doit se voir, parce que si c'est DATABASE_URL, la
  // construction échouera juste après sans que la cause soit évidente.
  console.warn(
    `${manquantes.length} variable(s) restent marquées « [SENSITIVE] » et n'existent pas dans .env.local : ` +
      manquantes.join(', '),
  )
}
