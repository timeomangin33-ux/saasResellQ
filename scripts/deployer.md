# Déployer sans consommer les minutes de build Vercel

Le plan Hobby accorde 8 h de construction par mois (fenêtre glissante de 30
jours). Elles sont épuisées : Vercel accepte le déclenchement d'un déploiement
et n'en construit aucun. C'est pourquoi le site en ligne est resté sur le build
du 22 août alors que tout fonctionnait en local.

`vercel deploy --prebuilt` contourne cela proprement : **la construction se fait
sur votre machine**, Vercel ne reçoit que le résultat et n'a rien à construire.
Aucune minute consommée, aucun abonnement.

## Une fois pour toutes

```powershell
npx vercel login      # ouvre le navigateur, vous confirmez avec votre compte
npx vercel link       # choisir l'équipe « timeo's projects » puis « saas-resell-q »
```

## À chaque mise en ligne

```powershell
npm run deploy:prod
```

La commande enchaîne trois choses : elle génère le client Prisma, construit le
site avec les variables d'environnement de production récupérées chez Vercel,
puis envoie le résultat déjà construit.

Fermez la fenêtre du collecteur avant de lancer : `prisma generate` ne peut pas
remplacer son moteur pendant qu'un processus Node le tient ouvert. Le veilleur
la relancera tout seul dans les cinq minutes.
