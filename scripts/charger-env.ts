/**
 * Chargement des variables d'environnement pour les scripts lancés à la main.
 *
 * Next lit `.env.local` tout seul ; un script exécuté par `tsx` ne le fait pas.
 * Sans ça, DATABASE_URL est absent et le collecteur meurt sur sa première
 * requête avec un message qui ne dit pas pourquoi.
 *
 * Écrit sans dépendance exprès : `dotenv` n'est pas installé dans ce projet, et
 * ajouter un paquet pour vingt lignes de lecture de fichier n'en vaut pas le
 * coût. Le format couvert est celui que Next accepte : `CLE=valeur`, guillemets
 * optionnels, lignes vides et `#` en commentaire.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function chargerEnv(fichiers = ['.env.local', '.env']) {
  const charges: string[] = []

  for (const fichier of fichiers) {
    const chemin = path.resolve(process.cwd(), fichier)
    if (!existsSync(chemin)) continue

    for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
      const nette = ligne.trim()
      if (!nette || nette.startsWith('#')) continue

      const separateur = nette.indexOf('=')
      if (separateur <= 0) continue

      const cle = nette.slice(0, separateur).trim().replace(/^export\s+/, '')
      let valeur = nette.slice(separateur + 1).trim()

      // Les guillemets délimitent la valeur, ils n'en font pas partie.
      if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
        valeur = valeur.slice(1, -1)
      }

      // Le premier fichier gagne, et une variable déjà posée dans le shell
      // gagne sur les deux : c'est ce qui permet de surcharger ponctuellement
      // sans éditer de fichier.
      if (process.env[cle] === undefined) process.env[cle] = valeur
    }

    charges.push(fichier)
  }

  return charges
}
