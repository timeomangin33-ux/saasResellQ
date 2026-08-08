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
  return obj;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.join(repoRoot, '.env.local');
  const env = readEnv(envPath);
  
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY not found');
    process.exit(1);
  }

  const Stripe = require('stripe');
  const stripe = Stripe(secret, { apiVersion: '2024-06-20' });

  const prices = {
    '29': { priceId: env.STRIPE_PRICE_ID_29, name: 'Starter' },
    '75': { priceId: env.STRIPE_PRICE_ID_75, name: 'Pro' },
    '149': { priceId: env.STRIPE_PRICE_ID_149, name: 'Premium' }
  };

  console.log('Creating checkout sessions...\n');

  for (const [level, config] of Object.entries(prices)) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: config.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      console.log(`${config.name} (${level}€)`);
      console.log(`  URL: ${session.url}\n`);
    } catch (err) {
      console.error(`  Error: ${err.message}\n`);
    }
  }
}

main();
