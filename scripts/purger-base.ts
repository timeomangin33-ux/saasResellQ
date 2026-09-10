/**
 * Libère de l'espace dans la base et empêche qu'elle se remplisse à nouveau.
 *
 *   npm run db:purge
 *
 * Constaté en exploitation : « could not extend file because project size limit
 * (512 MB) has been exceeded ». Plus aucune écriture ne passait — ni les
 * annonces collectées, ni les notes d'opportunité.
 *
 * La cause n'est pas le volume de données mais le rythme d'écriture. Chaque
 * balayage réécrit ses 7 500 annonces, deux fois par jour, sur quinze
 * catégories : environ deux cent mille mises à jour quotidiennes. Postgres ne
 * modifie pas une ligne sur place, il en écrit une nouvelle version et laisse
 * l'ancienne morte derrière lui. Sans passage de nettoyage assez fréquent, le
 * fichier gonfle indéfiniment alors que le nombre de lignes, lui, ne bouge
 * presque pas — 480 Mo pour 338 000 annonces, soit plusieurs fois leur taille
 * réelle.
 *
 * Ce script fait donc deux choses distinctes, et la seconde compte plus que la
 * première : supprimer ce qui ne sert plus, puis rendre réutilisable l'espace
 * des versions mortes. Un VACUUM ordinaire suffit et c'est voulu — VACUUM FULL
 * recopierait toute la table, ce qui demande autant d'espace libre qu'elle en
 * occupe, précisément ce qui manque.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

/**
 * Une annonce non revue depuis ce délai ne décrit plus le marché courant.
 *
 * Dix jours et non quatorze : la base est plafonnée à 512 Mo et la collecte s'y
 * est cognée. Dix jours couvrent largement la fenêtre de sept jours dont la
 * mesure de rotation a besoin, avec trois jours de marge pour qu'un balayage
 * retardé n'efface pas une cohorte avant sa vérification.
 */
const RETENTION_JOURS = 10
/** Taille des lots de suppression : une transaction géante échouerait faute de place. */
const LOT = 2000

async function main() {
  const { prisma } = await import('../prisma')

  const taille = async () => {
    const [r] = await prisma.$queryRaw<{ t: string }[]>`
      SELECT pg_size_pretty(pg_total_relation_size('products')) AS t`
    return r?.t ?? '?'
  }

  console.log(`Table products avant : ${await taille()}`)

  // 1. Ce qui ne sert plus. Une annonce disparue garde son intérêt pour la
  //    mesure de rotation tant qu'elle est dans la cohorte ; au-delà, non.
  let supprimees = 0
  for (;;) {
    const n = await prisma.$executeRaw`
      DELETE FROM products WHERE id IN (
        SELECT id FROM products
        WHERE (
          ("lastSeenAt" IS NOT NULL AND "lastSeenAt" < NOW() - (${RETENTION_JOURS} * INTERVAL '1 day'))
          OR ("lastSeenAt" IS NULL AND "createdAt" < NOW() - (${RETENTION_JOURS} * INTERVAL '1 day'))
        )
        AND ("checkedAt" IS NULL OR "checkedAt" < NOW() - INTERVAL '30 days')
        LIMIT ${LOT}
      )`
    supprimees += Number(n)
    if (Number(n) < LOT) break
    process.stdout.write(`  ${supprimees} supprimées\r`)
  }
  console.log(`Annonces supprimées : ${supprimees}`)

  // 2. Les bilans de collecte : un par tour, plusieurs par heure, gardés
  //    depuis le premier jour. Seuls les récents servent au suivi de santé.
  const jobs = await prisma.$executeRaw`
    DELETE FROM automation_jobs WHERE "lastRunAt" < NOW() - INTERVAL '7 days'`
  console.log(`Bilans de collecte supprimés : ${Number(jobs)}`)

  // 3. Rendre l'espace des versions mortes réutilisable. C'est l'étape qui
  //    débloque réellement les écritures.
  console.log('Nettoyage en cours (VACUUM ANALYZE)...')
  await prisma.$executeRawUnsafe('VACUUM (ANALYZE) products')
  await prisma.$executeRawUnsafe('VACUUM (ANALYZE) automation_jobs')

  console.log(`Table products après : ${await taille()}`)

  const [restant] = await prisma.$queryRaw<{ n: bigint; actives: bigint }[]>`
    SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE status='active') AS actives FROM products`
  console.log(`Annonces restantes : ${restant?.n} (dont ${restant?.actives} actives)`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
