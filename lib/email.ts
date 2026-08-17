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
