const fs = require('fs');
const path = require('path');

function readEnv(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const obj = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) obj[m[1]] = m[2];
  }
  return { txt, lines, obj };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found in repo root');
    process.exit(1);
  }

  const { obj } = readEnv(envPath);
  const secret = obj.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const price29 = obj.STRIPE_PRICE_ID_29 || obj.STRIPE_PRICE_ID;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY not found');
    process.exit(1);
  }
  if (!price29) {
    console.error('STRIPE_PRICE_ID_29 not found');
    process.exit(1);
  }

  let Stripe;
  try {
    Stripe = require('stripe');
  } catch (e) {
    console.error('stripe package not installed. Run `npm install`');
    process.exit(1);
  }

  const stripe = Stripe(secret, { apiVersion: '2024-06-20' });

  console.log('Creating demo checkout session for price:', price29);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: price29, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    console.log('Checkout URL:', session.url);
  } catch (err) {
    console.error('Error creating checkout session:', err.message || err);
    process.exit(1);
  }
}

main();
