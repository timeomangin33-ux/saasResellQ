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

  const { txt, lines, obj } = readEnv(envPath);
  const secret = obj.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY not found in .env.local or environment');
    process.exit(1);
  }

  // require stripe
  let Stripe;
  try {
    Stripe = require('stripe');
  } catch (e) {
    console.error('stripe package not installed. Run `npm install`');
    process.exit(1);
  }

  const stripe = Stripe(secret, { apiVersion: '2024-06-20' });

  console.log('Creating 75€ monthly price on Stripe...');
  try {
    const price = await stripe.prices.create({
      unit_amount: 7500,
      currency: 'eur',
      recurring: { interval: 'month' },
      product_data: { name: 'Forfait mensuel 75€' },
    });

    console.log('Created price:', price.id);

    // Update .env.local
    const key = 'STRIPE_PRICE_ID_75';
    let updated = false;
    const newLines = lines.map((l) => {
      if (l.match(new RegExp('^\\s*' + key + '\\s*=.*$'))) {
        updated = true;
        return `${key}="${price.id}"`;
      }
      return l;
    });
    if (!updated) newLines.push(`${key}="${price.id}"`);

    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('.env.local updated with', key);
  } catch (err) {
    console.error('Error creating price:', err.message || err);
    process.exit(1);
  }
}

main();
