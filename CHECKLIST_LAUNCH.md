# CHECKLIST_LAUNCH

## 1. Variables d'environnement nécessaires

### Incontournables
- `DATABASE_URL` - URL de la base PostgreSQL (ou SQLite temporaire en local).
- `NEXTAUTH_URL` - URL de l'application en production, ex. `https://app.resellq.com`.
- `NEXTAUTH_SECRET` - secret robuste pour NextAuth.
- `STRIPE_SECRET_KEY` - clé secrète Stripe live.
- `STRIPE_PUBLISHABLE_KEY` - clé publique Stripe live.
- `STRIPE_WEBHOOK_SECRET` - secret du webhook Stripe.
- `STRIPE_PRICE_ID_29` - ID de prix Stripe Starter.
- `STRIPE_PRICE_ID_75` - ID de prix Stripe Pro.
- `STRIPE_PRICE_ID_149` - ID de prix Stripe Business.
- `VINTED_COOKIE_SECRET` - secret pour chiffrer les cookies Vinted.
- `NEXT_PUBLIC_APP_URL` - URL publique de l'app, ex. `https://app.resellq.com`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - clé publique Stripe exposée côté client.

### IA / OpenAI
- `OPENAI_API_KEY` - clé API OpenAI.
- `OPENAI_MODEL` - modèle par défaut, ex. `gpt-4`.

### Redis / BullMQ (optionnel mais recommandé)
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

### Autres providers optionnels
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `AMAZON_ACCESS_KEY`
- `AMAZON_SECRET_KEY`
- `AMAZON_REGION`
- `EXCHANGERATE_API_KEY`
-- (removed) email sending via Resend
- `NOVU_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `PINECONE_API_KEY`

---

## 2. Commandes de lancement

### Installation
```bash
npm install
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Démarrage
```bash
npm run start
```

### Base de données / Prisma
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## 3. Étapes Stripe

1. Créer un compte Stripe et basculer en mode Live.
2. Créer les produits et plans : Starter, Pro, Business.
3. Récupérer les clés live : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.
4. Récupérer le `STRIPE_WEBHOOK_SECRET` depuis le dashboard Stripe.
5. Configurer le webhook production vers : `https://<your-domain>/api/webhooks/stripe`.
6. Remplir les IDs de prix dans : `STRIPE_PRICE_ID_29`, `STRIPE_PRICE_ID_75`, `STRIPE_PRICE_ID_149`.
7. Vérifier les tests de paiement dans Stripe avant mise en production.

---

## 4. Étapes Vinted

1. Aucun API key officiel Vinted n'est nécessaire.
2. Mettre en place la session Vinted chiffrée via `VINTED_COOKIE_SECRET`.
3. Vérifier la connexion de l'agent Playwright / navigateur pour capturer la session.
4. S'assurer que les environnements Vinted sont accessibles depuis le serveur de production.
5. Tester la synchronisation des produits et des analyses en mode production.

---

## 5. Étapes de déploiement

1. Choisir l'hébergeur : Vercel recommandé pour Next.js, sinon Render / Railway / AWS.
2. Connecter le dépôt GitHub / Git.
3. Configurer les variables d'environnement dans l'hébergeur.
4. Configurer `DATABASE_URL` sur PostgreSQL production.
5. Lancer la build sur l'hébergeur.
6. Vérifier les logs de déploiement et corriger les erreurs éventuelles.
7. Vérifier la page d'accueil, la tarification, l'authentification et le dashboard.
8. Tester le webhook Stripe en production.
9. Tester la redirection HTTPS et les headers de sécurité.
10. Vérifier les pages légales : `/cgv`, `/confidentialite`, `/mentions-legales`.

---

## 6. Vérifications de stabilisation

- [ ] Pas d'erreurs TypeScript.
- [ ] Pas d'erreurs ESLint.
- [ ] Pas de routes cassées.
- [ ] Pas de liens internes invalides.
- [ ] Pages protégées sans session redirigées.
- [ ] Aucune mention `coming soon` dans l'interface.
- [ ] Plan Starter / Pro / Business visibles et distincts.
- [ ] UX responsive et cohérente.
- [ ] Build de production validé.
- [ ] Vérification manuelle de la checkout Stripe et des webhooks en production.
- [ ] Contrôle final du contenu de l'interface et des états vides/erreurs.
