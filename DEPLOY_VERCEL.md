## Déploiement sur Vercel — Guide rapide

Ce fichier décrit pas à pas les actions pour déployer cette application Next.js avec Prisma + Postgres (Supabase possible).

1) Prérequis
- Avoir un projet Supabase (ou autre Postgres) et récupérer la `DATABASE_URL` (ou Prisma Data Proxy URL `prisma://...`).
- Avoir un compte Vercel et le CLI `vercel` si tu veux déployer depuis ta machine.

2) Variables d'environnement à définir sur Vercel (Production)
- `DATABASE_URL` = connexion Postgres (ou `prisma://...` si Data Proxy)
- `NEXTAUTH_URL` = https://<ton-app>.vercel.app
- `NEXTAUTH_SECRET` = chaîne aléatoire longue
- `NEXT_PUBLIC_SUPABASE_URL` = (optionnel côté client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (optionnel côté client)
- `SUPABASE_SERVICE_ROLE_KEY` = (server-only, si tu en as besoin)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`, etc.

3) Stratégie Prisma recommandée
- Si tu dois servir depuis lambdas (Vercel), utilise Prisma Data Proxy (`prisma://...`) pour éviter les erreurs de connexions simultanées.
- Sinon, mets la `DATABASE_URL` Postgres (avec `?sslmode=require` si besoin).

4) Commandes utiles (local / CI)
- Générer client et build (exécuté automatiquement par `npm run build` dans ce repo):
```bash
npx prisma generate
npm run build
```
- Déployer les migrations en production (NE PAS utiliser `migrate dev` sur prod):
```bash
npx prisma migrate deploy
```

5) Déploiement simple with CLI
```bash
vercel --prod
```

6) Vérifications post-déploiement
- Tester la route santé: `https://<ton-app>.vercel.app/api/health`
- Vérifier logs Vercel (Deployments → Logs) pour erreurs de DB / Prisma.

7) Notes de sécurité
- `NEXT_PUBLIC_*` = visible côté client. Ne mets pas `SUPABASE_SERVICE_ROLE_KEY` dans `NEXT_PUBLIC_*`.
- Pour accès serveur privilégié, utilise `SUPABASE_SERVICE_ROLE_KEY` en server-only env var.

8) Si tu veux que je fasse plus
- Je peux préparer un workflow CI (GitHub Actions) qui exécute `npx prisma migrate deploy` et `npx prisma generate` lors d'un release.

---
Si tu veux, je crée aussi un petit script qui vérifie la présence des variables en local (PowerShell et bash).
