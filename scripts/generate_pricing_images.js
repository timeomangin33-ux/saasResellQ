const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('sharp not installed, installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const plans = [
    { name: 'Starter', price: '29', color: '#3B82F6', emoji: '⭐' },
    { name: 'Pro', price: '75', color: '#8B5CF6', emoji: '🚀' },
    { name: 'Premium', price: '149', color: '#EC4899', emoji: '👑' }
  ];

  const publicDir = path.join(__dirname, '..', 'public', 'pricing-images');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const plan of plans) {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${plan.color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${plan.color};stop-opacity:0.8" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="400" height="400" fill="#F8FAFC"/>
        
        <!-- Gradient top section -->
        <rect width="400" height="220" fill="url(#grad)"/>
        
        <!-- Icon -->
        <text x="200" y="100" font-size="80" text-anchor="middle" dominant-baseline="middle">${plan.emoji}</text>
        
        <!-- Plan name -->
        <text x="200" y="140" font-size="36" font-weight="bold" text-anchor="middle" fill="white" font-family="system-ui, -apple-system">
          ${plan.name}
        </text>
        
        <!-- Price section -->
        <g>
          <!-- Price background -->
          <rect x="50" y="250" width="300" height="100" rx="12" fill="white" stroke="${plan.color}" stroke-width="2"/>
          
          <!-- Price amount -->
          <text x="200" y="290" font-size="48" font-weight="bold" text-anchor="middle" fill="${plan.color}" font-family="system-ui, -apple-system">
            €${plan.price}
          </text>
          
          <!-- Per month -->
          <text x="200" y="320" font-size="16" text-anchor="middle" fill="#64748B" font-family="system-ui, -apple-system">
            par mois
          </text>
        </g>
        
        <!-- Footer -->
        <text x="200" y="385" font-size="12" text-anchor="middle" fill="#94A3B8" font-family="system-ui, -apple-system">
          Forfait ${plan.name}
        </text>
      </svg>
    `;

    const outputPath = path.join(publicDir, `plan-${plan.price}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`✓ Generated: ${outputPath}`);
  }
}

main().catch(console.error);
