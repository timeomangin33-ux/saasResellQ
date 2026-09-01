import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'ResellQ <onboarding@resend.dev>'

export function isEmailConfigured() {
  return resend !== null
}

export async function sendAlertEmail({
  to,
  category,
  detail,
  condition,
}: {
  to: string
  category: string
  detail: string
  condition: string
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured, skipping alert email')
    return { sent: false, reason: 'not_configured' }
  }

  const conditionLabels: Record<string, string> = {
    profit_margin: 'Marge bénéficiaire',
    price_drop: 'Baisse de prix',
    demand_spike: 'Pic de demande',
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.resellq.com'

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: `🔔 Alerte ResellQ : ${category}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #059669;">Une de vos alertes s'est déclenchée</h2>
          <p><strong>Catégorie :</strong> ${category}</p>
          <p><strong>Type :</strong> ${conditionLabels[condition] || condition}</p>
          <p><strong>Détail :</strong> ${detail}</p>
          <a href="${appUrl}/alertes" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 8px;">
            Voir sur ResellQ
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
            Vous recevez cet email car vous avez activé les alertes email dans vos paramètres ResellQ.
          </p>
        </div>
      `,
    })
    return { sent: true, id: result.data?.id }
  } catch (error) {
    console.error('[email] Failed to send alert email:', error instanceof Error ? error.message : error)
    return { sent: false, reason: 'send_failed' }
  }
}

/**
 * Prévient l'exploitant que la collecte s'est arrêtée.
 *
 * Écrit après coup : le collecteur s'est arrêté cinq jours sans que personne
 * ne s'en aperçoive, pendant que le site continuait d'afficher des chiffres
 * périmés comme s'ils étaient du jour. Une panne silencieuse est une panne
 * qui dure.
 */
export async function envoyerAlerteCollecteArretee({
  to,
  ageTexte,
  detail,
}: {
  to: string
  ageTexte: string
  detail: string
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY absente : alerte de collecte non envoyée')
    return { sent: false, reason: 'not_configured' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.resellq.com'

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: `⚠️ ResellQ : la collecte Vinted est arrêtée depuis ${ageTexte}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #b45309;">La collecte Vinted ne tourne plus</h2>
          <p>Dernière annonce écrite en base il y a <strong>${ageTexte}</strong>.</p>
          <p style="color: #6b7280;">${detail}</p>
          <p>
            Tant qu'elle est arrêtée, les prix, médianes et opportunités affichés
            sur le site décrivent le marché d'il y a ${ageTexte}, pas celui
            d'aujourd'hui.
          </p>
          <p><strong>Quoi faire :</strong> relancer le collecteur sur la machine qui l'héberge
          (<code>npm run collector</code>), puis vérifier avec <code>npm run collect:status</code>.</p>
          <a href="${appUrl}/admin" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #b45309; color: white; text-decoration: none; border-radius: 8px;">
            Voir l'administration
          </a>
        </div>
      `,
    })
    return { sent: true, id: result.data?.id }
  } catch (error) {
    console.error('[email] alerte de collecte non envoyée :', error instanceof Error ? error.message : error)
    return { sent: false, reason: 'send_failed' }
  }
}
