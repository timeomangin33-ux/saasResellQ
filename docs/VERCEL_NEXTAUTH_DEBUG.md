# Vercel / NextAuth Debug Checklist

Suivez ces étapes pour diagnostiquer et corriger les problèmes d'authentification en production (resellq.com).

1) Variables d'environnement (Vercel)
- `NEXTAUTH_URL` = `https://resellq.com`
- `NEXTAUTH_SECRET` = (générer 32 bytes hex)
- `DATABASE_URL` = chaîne Postgres
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `DEBUG_TOKEN` = (générer un token pour l'endpoint debug)

2) Tester providers (assure-toi que NextAuth répond)

PowerShell (local):
```powershell
Invoke-RestMethod -Uri 'https://resellq.com/api/auth/providers' -Method Get
```

Avec curl.exe (PowerShell):
```powershell
curl.exe -i https://resellq.com/api/auth/providers
```

3) Tester l'endpoint debug
```powershell
Invoke-RestMethod -Uri 'https://resellq.com/api/debug/env' -Method Get -Headers @{ 'x-debug-token' = '<DEBUG_TOKEN>' }
```
La réponse doit contenir `DATABASE_URL: true` et `NEXTAUTH_SECRET: true`.

4) Vérifier les logs Vercel
- Project → Deployments → sélectionne le dernier → Logs.
- Cherche `[NextAuth][Credentials][authorize] error:` ou `NextAuth`.

5) Vérifier en base (Supabase / psql)
```sql
SELECT id, email, password, email_verified_at
FROM "User" -- ou users selon ton schéma
WHERE email = 'ton@email'
```
- Le champ `password` doit commencer par `$2a$` ou `$2b$` (bcrypt).

6) Créer / mettre à jour un utilisateur de test
- Utilise le script `scripts/create_test_user.js` (nécessite `DATABASE_URL` défini localement). Exemple:
```powershell
$env:DATABASE_URL = 'postgres://user:pass@host:5432/db'
node scripts/create_test_user.js --email test@example.com --password 'MotDePasse123'
```

7) Après corrections
- Redéployer sur Vercel et retester `/api/auth/providers` et la page de connexion.

Si tu veux, fournis ici:
- Sortie JSON de `/api/auth/providers`
- Sortie JSON de `/api/debug/env`
- Extraits des logs Vercel contenant `NextAuth`
