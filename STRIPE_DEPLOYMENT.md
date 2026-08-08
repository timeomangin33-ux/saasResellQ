# Guide de Déploiement Stripe - Forfaits & Facturation

## ✅ Complété localement

### 1. Configuration des prix (FAIT)
- **29€/mois** → `price_1TprvlDGmmKXDAvGnP2o8KRS`
- **75€/mois** → `price_1TpsI8DGmmKXDAvGIEwSNI1n`
- **149€/mois** → `price_1Tprw9DGmmKXDAvGQa2ZwC6u`

### 2. Images professionnelles (FAIT)
- 3 images PNG générées : `/public/pricing-images/plan-*.png`
- Endpoint pour les servir : `/api/pricing-images/[plan]`

### 3. Frontend - Page Pricing (FAIT)
- Route: `/pricing`
- Affiche les 3 plans avec features, boutons d'abonnement
- Intègre le formulaire FAQ

### 4. Checkout Flow (FAIT)
- API `/api/stripe/checkout` accepte `{plan: "29"|"75"|"149"}`
- Crée une session Stripe et redirige vers le formulaire de paiement

### 5. Webhooks Stripe (DÉJÀ EN PLACE)
- Route: `/api/webhooks/stripe`
- Gère les événements:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `customer.subscription.updated/deleted`
- Met à jour la BD (status subscription, dates, etc.)

### 6. Dashboard Billing (FAIT)
- Route: `/dashboard/billing`
- Affiche l'état de l'abonnement
- Lien vers Stripe Customer Portal
- FAQ et actions

---

## 🚀 Déploiement en Production

### Étape 1: Vérifier les variables d'environnement

```bash
# Ajouter à votre fichier .env.production (ou variables d'environnement du hosting):
STRIPE_SECRET_KEY="sk_live_..."       # Clé live (pas test)
STRIPE_PUBLISHABLE_KEY="pk_live_..."  # Clé live
STRIPE_WEBHOOK_SECRET="whsec_..."     # Webhook secret pour prod
STRIPE_PRICE_ID_29="price_..."        # IDs des prices Stripe live
STRIPE_PRICE_ID_75="price_..."
STRIPE_PRICE_ID_149="price_..."
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"  # URL publique
```

### Étape 2: Mettre à jour Stripe Webhook

1. Allez à [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Créez un endpoint webhook pour la production:
   - **URL**: `https://votre-domaine.com/api/webhooks/stripe`
   - **Événements à écouter**:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Copiez le `Signing Secret` dans `STRIPE_WEBHOOK_SECRET` (prod)

### Étape 3: Tester le webhook localement (avant prod)

```bash
# Installez Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Écoutez les webhooks locaux:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Testez un événement:
stripe trigger checkout.session.completed
```

### Étape 4: Build et déploiement

```bash
# Build
npm run build

# Test en production mode localement
npm run start

# Visitez: http://localhost:3000/pricing
```

### Étape 5: Sur Vercel (ou votre hosting)

```bash
# 1. Connectez votre repo Vercel
vercel

# 2. Définissez les variables d'environnement dans Vercel Dashboard
# Settings → Environment Variables

# 3. Déployez
vercel deploy --prod
```

### Étape 6: Vérifier le flux complet

1. Allez à `https://votre-domaine.com/pricing`
2. Cliquez sur un plan (ex. "Starter 29€")
3. Complétez le formulaire de paiement
4. Utilisez une **carte de test Stripe** en production:
   - Numéro: `4242 4242 4242 4242`
   - Expiry: date future (ex. 12/25)
   - CVC: 3 chiffres quelconques
5. Vérifiez que:
   - La session checkout se crée
   - L'utilisateur est redirigé vers Stripe
   - Après paiement → `subscriptionStatus` = "ACTIVE" en BD
   - Webhook enregistre l'événement

### Étape 7: Tester les fonctionnalités avancées

#### Changer de plan
1. Allez à `/dashboard/billing`
2. Cliquez "Accéder au portail Stripe"
3. Changez de forfait → mise à jour imédiate

#### Annuler l'abonnement
1. Portal Stripe → "Annuler l'abonnement"
2. `subscriptionStatus` passe à "CANCELED"
3. Accès reste jusqu'à `subscriptionEnd`

#### Paiement échoué
1. Utilisez une carte de test Stripe qui échoue: `4000 0000 0000 0002`
2. Webhook met `subscriptionStatus` à "PAST_DUE"
3. Utilisateur peut mettre à jour le paiement via le portal

---

## 📊 Surveillance & Monitoring

### Vérifier les paiements
- Stripe Dashboard → Payments
- Vérifiez: Customer, Amount, Status, Subscription ID

### Vérifier les webhooks
- Stripe Dashboard → Webhooks → Endpoint
- Scroll "Events" pour voir les logs

### Erreurs courantes
- **"STRIPE_SECRET_KEY not set"** → Vérifiez `.env.local` / variables d'env
- **"Webhook signature verification failed"** → Le secret webhook ne correspond pas
- **Images non chargées** → Vérifiez `NEXT_PUBLIC_APP_URL` en `.env`

---

## 🔄 Mise à jour des prix

Si vous changez les montants des prix dans Stripe:

```bash
# Régénérez les images (optionnel):
node ./scripts/generate_pricing_images.js

# Mettez à jour les price IDs dans .env:
STRIPE_PRICE_ID_29="price_NEW_ID"
STRIPE_PRICE_ID_75="price_NEW_ID"
STRIPE_PRICE_ID_149="price_NEW_ID"

# Redéployez
npm run build && vercel deploy --prod
```

---

## 📚 Ressources

- [Stripe Checkout Docs](https://stripe.com/docs/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-self-serve-portal)
- [Stripe Testing](https://stripe.com/docs/testing)

---

## ✨ Prochaines améliorations optionnelles

- [ ] Email transactionnel après paiement (Resend, SendGrid)
- [ ] Page de confirmation post-paiement custom
- [ ] Facturation mensuelle/annuelle (toggle)
- [ ] Coupons & codes promo
- [ ] Dunning (retry automatique paiements échoués)
- [ ] Export factures PDF
- [ ] Intégration accounting (Stripe Tax, TaxJar)
