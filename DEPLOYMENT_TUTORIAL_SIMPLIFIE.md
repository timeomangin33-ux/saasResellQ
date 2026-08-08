# 🚀 Tutoriel de déploiement simplifié

## 1. Préparer le code
- Ouvre le projet dans VS Code.
- Vérifie que tout est enregistré.
- Exécute la build localement :
  ```bash
  npm run build
  ```
- Si la build passe, tu es prêt.

## 2. Mettre le projet sur GitHub
- Crée un dépôt GitHub.
- Ajoute le repo local.
- Fais :
  ```bash
  git add .
  git commit -m "ready for launch"
  git push origin main
  ```

## 3. Déployer sur Vercel
- Va sur https://vercel.com.
- Connecte-toi avec GitHub.
- Clique sur "New Project".
- Choisis ton dépôt.
- Vercel détecte automatiquement Next.js.
- Clique sur "Deploy".

## 4. Ajouter la base de données
Le plus simple :
- Vercel Postgres, Supabase ou Railway.
- Crée une base PostgreSQL.
- Copie la chaîne de connexion.

## 5. Ajouter les variables d’environnement
Dans Vercel, va dans Settings > Environment Variables et ajoute :
- DATABASE_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

## 6. Exécuter la migration Prisma
Après le déploiement, exécute :
```bash
npx prisma migrate deploy
```

## 7. Configurer Stripe
- Passe Stripe en mode Live.
- Récupère les clés live.
- Crée un webhook vers :
  ```text
  https://ton-domaine.com/api/webhooks/stripe
  ```

## 8. Vérifier le site
Teste rapidement :
- la page d’accueil
- la page de paiement
- l’inscription
- l’API santé

## 9. Si tout marche
- partage l’URL publique
- vérifie les paiements
- surveille les premiers jours
