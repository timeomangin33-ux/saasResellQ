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
    '29': {
      priceId: env.STRIPE_PRICE_ID_29,
      name: 'Forfait Starter',
      description: 'Accès aux analyses et rapports de base',
      nickname: 'Starter — 29€/mois'
    },
    '75': {
      priceId: env.STRIPE_PRICE_ID_75,
      name: 'Forfait Pro',
      description: 'Analyses avancées, IA et alertes prioritaires',
      nickname: 'Pro — 75€/mois'
    },
    '149': {
      priceId: env.STRIPE_PRICE_ID_149,
      name: 'Forfait Premium',
      description: 'Accès complet: IA, webhooks, support prioritaire',
      nickname: 'Premium — 149€/mois'
    }
  };

  const imageUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop';

  for (const [level, config] of Object.entries(prices)) {
    try {
      console.log(`\nUpdating price ${level}€: ${config.priceId}`);
      
      // Get price to find product
      const price = await stripe.prices.retrieve(config.priceId);
      const productId = price.product;
      
      // Update product
      console.log(`  → Updating product ${productId}`);
      await stripe.products.update(productId, {
        name: config.name,
        description: config.description,
        images: [imageUrl],
        metadata: { level }
      });

      // Update price nickname
      console.log(`  → Setting nickname: ${config.nickname}`);
      await stripe.prices.update(config.priceId, {
        nickname: config.nickname
      });

      console.log(`  ✓ Done`);
    } catch (err) {
      console.error(`  ✗ Error:`, err.message);
    }
  }

  console.log('\n✓ All products updated!');
}

main();
