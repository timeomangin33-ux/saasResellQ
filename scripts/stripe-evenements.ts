/**
 * Aligne les événements écoutés par le webhook Stripe sur ceux que le code
 * traite réellement.
 *
 *   npm run stripe:evenements            (liste, ne modifie rien)
 *   npm run stripe:evenements -- --appliquer
 *
 * Pourquoi ce script existe : le gestionnaire `app/api/webhooks/stripe/route.ts`
 * sait traiter `charge.refunded` — c'est lui qui annule une commission de
 * parrainage quand l'argent est rendu — mais l'endpoint Stripe n'y était pas
 * abonné. Un événement auquel on n'est pas abonné n'arrive jamais : le code
 * était correct et ne s'exécutait pas. Résultat silencieux, et coûteux dans ce
 * sens précis : on aurait payé 30 % de commission sur des sommes remboursées.
 *
 * Le script n'enlève jamais un événement. Il fait l'union entre ce qui est
 * configuré et ce que le code traite, et n'écrit que s'il manque quelque chose.
 * Sans `--appliquer`, il se contente de montrer l'écart.
 */

import { chargerEnv } from './charger-env'
chargerEnv()

/**
 * Les événements que `app/api/webhooks/stripe/route.ts` sait traiter.
 *
 * Cette liste est la source de vérité : s'abonner à un événement que le code
 * ignore ne fait qu'ajouter du bruit et des requêtes, et ne pas s'abonner à un
 * événement qu'il traite rend ce traitement inerte.
 */
const EVENEMENTS_TRAITES = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
] as const

async function main() {
  const appliquer = process.argv.includes('--appliquer')

  const cle = process.env.STRIPE_SECRET_KEY
  if (!cle) {
    console.error('STRIPE_SECRET_KEY absente de .env.local — rien à faire.')
    process.exit(1)
  }

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(cle, { apiVersion: '2024-06-20' as never })

  const mode = cle.startsWith('sk_live') ? 'RÉEL' : 'test'
  console.log(`Compte Stripe en mode ${mode}.\n`)

  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  if (endpoints.data.length === 0) {
    console.error("Aucun endpoint webhook n'est configuré sur ce compte Stripe.")
    process.exit(2)
  }

  let modifies = 0

  for (const endpoint of endpoints.data) {
    const actuels = new Set(endpoint.enabled_events)
    // Un endpoint abonné à « tout » reçoit déjà ce qu'il faut : y ajouter des
    // événements nommés le restreindrait au lieu de l'élargir.
    const toutEcoute = actuels.has('*')
    const manquants = toutEcoute ? [] : EVENEMENTS_TRAITES.filter((e) => !actuels.has(e))

    console.log(`Endpoint ${endpoint.id}`)
    console.log(`  URL      : ${endpoint.url}`)
    console.log(`  Statut   : ${endpoint.status}`)
    console.log(`  Écoute   : ${toutEcoute ? 'tous les événements (*)' : `${actuels.size} événement(s)`}`)

    // Un endpoint désactivé ne reçoit rien : lui ajouter des événements ne
    // change rien au comportement et laisse une configuration à deux endroits,
    // dont l'un ment sur ce qui est réellement branché. On le signale, on n'y
    // touche pas.
    if (endpoint.status !== 'enabled') {
      console.log('  Ignoré   : endpoint désactivé, il ne reçoit aucun événement.\n')
      continue
    }

    if (manquants.length === 0) {
      console.log('  Manquant : aucun — cet endpoint reçoit déjà tout ce que le code traite.\n')
      continue
    }

    console.log(`  Manquant : ${manquants.join(', ')}`)

    if (!appliquer) {
      console.log('  (relancez avec --appliquer pour les ajouter)\n')
      continue
    }

    const fusion = [...new Set([...endpoint.enabled_events, ...manquants])]
    await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: fusion as never })
    modifies += 1
    console.log(`  ✓ Ajoutés. L'endpoint écoute maintenant ${fusion.length} événement(s).\n`)
  }

  if (appliquer) {
    console.log(
      modifies === 0
        ? 'Rien à modifier : tout était déjà en place.'
        : `${modifies} endpoint(s) mis à jour. Aucun événement n'a été retiré.`,
    )
  }
}

main().catch((err) => {
  console.error('Stripe a refusé :', err instanceof Error ? err.message : err)
  process.exit(1)
})
