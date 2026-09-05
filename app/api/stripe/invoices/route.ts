import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { stripe } from '@/stripe-service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { stripeCustomerId: true },
  })

  if (!user?.stripeCustomerId || !stripe) {
    return NextResponse.json({ invoices: [] })
  }

  try {
    const result = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 })
    const invoices = result.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: new Date(inv.created * 1000).toISOString(),
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    }))
    return NextResponse.json({ invoices })
  } catch (err) {
    // Le catch rendait `{ invoices: [] }` sans statut, donc en 200 : pendant une
    // panne Stripe, un client qui paie voyait « aucune facture » — une absence
    // de facture au lieu d'une absence de réponse. Le 502 laisse l'interface
    // afficher l'erreur.
    console.error('[stripe/invoices] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { invoices: null, error: 'Impossible de charger les factures pour le moment.', cause: 'stripe' },
      { status: 502 },
    )
  }
}
