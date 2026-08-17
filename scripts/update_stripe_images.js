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
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  if (!secret) {
    console.error('STRIPE_SECRET_KEY not found');
    process.exit(1);
  }

  const Stripe = require('stripe');
  const stripe = Stripe(secret, { apiVersion: '2024-06-20' });

  const prices = {
    '29': { priceId: env.STRIPE_PRICE_ID_29 },
    '75': { priceId: env.STRIPE_PRICE_ID_75 },
    '149': { priceId: env.STRIPE_PRICE_ID_149 }
  };

  console.log(`Updating Stripe products with images from: ${appUrl}\n`);

  for (const [level, config] of Object.entries(prices)) {
    try {
      const imageUrl = `${appUrl}/pricing-images/plan-${level}.png`;
      
      console.log(`Updating price ${level}€: ${config.priceId}`);
      console.log(`  Image URL: ${imageUrl}`);
      
      const price = await stripe.prices.retrieve(config.priceId);
      const productId = price.product;
      
      await stripe.products.update(productId, {
        images: [imageUrl],
      });

      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}\n`);
    }
  }
}

main();
