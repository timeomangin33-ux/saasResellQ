#!/bin/bash

# Test script for Stripe pricing setup

echo "🧪 Testing Stripe Pricing Setup...\n"

# Check required files
echo "📋 Checking files..."
files=(
  "app/pricing/page.tsx"
  "app/dashboard/billing/page.tsx"
  "app/api/subscription/info/route.ts"
  "app/api/pricing-images/[plan]/route.ts"
  "public/pricing-images/plan-29.png"
  "public/pricing-images/plan-75.png"
  "public/pricing-images/plan-149.png"
  "stripe-service.ts"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    missing=$((missing + 1))
  fi
done

if [ $missing -gt 0 ]; then
  echo "\n❌ $missing file(s) missing!"
  exit 1
fi

# Check .env.local
echo "\n🔐 Checking environment variables..."
if grep -q "STRIPE_SECRET_KEY=" .env.local; then
  echo "  ✓ STRIPE_SECRET_KEY found"
else
  echo "  ✗ STRIPE_SECRET_KEY missing"
  exit 1
fi

if grep -q "STRIPE_PRICE_ID_29=" .env.local; then
  echo "  ✓ STRIPE_PRICE_ID_29 found"
else
  echo "  ✗ STRIPE_PRICE_ID_29 missing"
  exit 1
fi

if grep -q "STRIPE_PRICE_ID_75=" .env.local; then
  echo "  ✓ STRIPE_PRICE_ID_75 found"
else
  echo "  ✗ STRIPE_PRICE_ID_75 missing"
  exit 1
fi

if grep -q "STRIPE_PRICE_ID_149=" .env.local; then
  echo "  ✓ STRIPE_PRICE_ID_149 found"
else
  echo "  ✗ STRIPE_PRICE_ID_149 missing"
  exit 1
fi

echo "\n✅ All checks passed!\n"
echo "📚 Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Visit: http://localhost:3000/pricing"
echo "  3. Click a plan to test checkout"
echo "  4. After payment, check: http://localhost:3000/dashboard/billing"
echo "\n🚀 See STRIPE_DEPLOYMENT.md for production setup"
