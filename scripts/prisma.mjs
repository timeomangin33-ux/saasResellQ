/**
 * Lance la CLI Prisma avec les variables de `.env.local`.
 *
 * `prisma` ne lit que `.env`, jamais `.env.local` — c'est une convention Next,
 * pas une convention Prisma. Résultat, `npx prisma db push` échouait sur
 * « Environment variable not found: DATABASE_URL » alors que le fichier était
 * là, à côté. Plutôt que de dupliquer l'URL dans un second fichier (deux
 * sources de vérité pour un secret, c'est une fuite qui attend son heure), on
 * charge l'environnement puis on passe la main à la CLI.
 *
 *   npm run db:push
 *   npm run prisma -- migrate status
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

for (const fichier of ['.env.local', '.env']) {
  const chemin = path.resolve(process.cwd(), fichier)
  if (!existsSync(chemin)) continue
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const nette = ligne.trim()
    if (!nette || nette.startsWith('#')) continue
    const separateur = nette.indexOf('=')
    if (separateur <= 0) continue
    const cle = nette.slice(0, separateur).trim().replace(/^export\s+/, '')
    let valeur = nette.slice(separateur + 1).trim()
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1)
    }
    if (process.env[cle] === undefined) process.env[cle] = valeur
  }
}

const resultat = spawnSync('npx', ['prisma', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(resultat.status ?? 1)
