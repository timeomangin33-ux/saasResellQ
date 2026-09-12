# Le parrainage

Comment un partenaire est payé, comment il le vérifie, et ce qui doit être fait
à la main pour que tout cela existe.

## Ce que fait ResellQ, et ce qu'il ne fait pas

Il **enregistre** ce qui est dû. Il n'envoie **jamais** d'argent.

Le registre est alimenté par une seule source : le webhook Stripe, sur les
factures réellement encaissées, `amount_paid`, remises déduites. Le prix affiché
du forfait n'entre nulle part dans le calcul — une commission assise dessus
paierait le partenaire sur de l'argent que ResellQ n'a jamais reçu. Une facture
remboursée annule la commission correspondante.

Les virements sont des gestes manuels, faits en dehors du site. `/admin/parrainage`
permet ensuite de venir déclarer qu'ils ont eu lieu. Rien dans ce code ne peut
transférer un euro, et c'est délibéré : un tableau de commissions ressemble à un
outil de paiement, et il ne faut pas qu'on croie un virement parti alors qu'il
ne l'est pas.

## La chaîne, du clic à la commission

```
?ref=CODE  ──►  cookie 60 jours  ──►  inscription  ──►  facture Stripe  ──►  dette
 middleware      resellq_ref         referralCode      webhook            referral_commissions
```

1. **Le clic.** Le middleware lit `?ref=CODE` sur n'importe quelle page et pose
   un cookie `httpOnly` de 60 jours. Il ne vérifie pas que le code existe : il
   tourne sur l'Edge, sans accès à la base. Il déclenche au passage le comptage
   du visiteur, sauf si ce navigateur portait déjà ce même code.
2. **L'inscription.** `/api/auth/register` relit le cookie, valide le code
   contre la base, et le fige sur le compte. Un code inconnu ou désactivé est
   ignoré en silence : perdre une commission est réparable à la main, perdre un
   client ne l'est pas. Un partenaire qui s'abonne par son propre lien n'est pas
   crédité — ce serait une remise que personne n'a décidée.
3. **La facture.** Le webhook Stripe écrit une ligne par facture encaissée. Le
   taux y est **recopié**, pas référencé : changer le taux d'un partenaire plus
   tard ne réécrit pas ce qui lui était dû avant. Une même facture ne peut pas
   engendrer deux commissions, y compris quand Stripe rejoue son webhook.

Les 60 jours sont un choix : quelqu'un qui découvre ResellQ par la vidéo d'un
partenaire ne s'abonne presque jamais le jour même. La fenêtre couvre ce délai
de décision sans attribuer une vente indéfiniment à un lien oublié.

## Les deux liens d'un partenaire

`npm run parrainage:creer -- VINCENT "Vincent Dupont" 30 vincent@exemple.fr`
affiche les deux.

| | à qui | quoi |
|---|---|---|
| `/?ref=CODE` | à publier partout | ce qui attribue les inscriptions |
| `/partenaire/<jeton>` | au partenaire seul | son relevé |

Le second **est** le mot de passe : l'adresse ouvre la page, il n'y a rien
d'autre à saisir. Elle est `noindex` et exclue du `robots.txt`, mais elle
n'a rien qui la protège d'une personne à qui on l'aurait transmise.

Le partenaire y voit ses visiteurs, ses inscriptions, ses factures et ce qui lui
est dû. Il n'y voit **aucun filleul** : ni nom, ni email, ni date individuelle.
Il a le droit de savoir combien de personnes il a amenées, pas qui elles sont.

## Vérifier avant de dépendre de quoi que ce soit

```bash
npm run parrainage:verifier -- VINCENT   # le lien attribue-t-il, en production ?
npm run parrainage:tester   -- VINCENT   # une facture produit-elle la bonne dette ?
```

Le premier n'a besoin ni de base ni de secret : il interroge le vrai site comme
le ferait un visiteur, et n'écrit rien. Le second exerce tout ce qui suit
l'appel de Stripe, dans une transaction annulée à la fin — aucun compte, aucune
commission n'est laissé derrière lui.

Lancez le premier **le jour où vous donnez le lien**, pas le jour où vous vous
étonnez qu'il n'ait rien rapporté. Entre les deux, un lien cassé et un lien que
personne ne clique se ressemblent exactement.

Le compteur de visiteurs sert à les distinguer :

| visiteurs | inscriptions | ce que ça dit |
|---|---|---|
| 0 | 0 | le lien n'est pas cliqué, ou pas celui qui a été publié |
| > 0 | 0 | on vient, on repart : c'est la page d'accueil ou l'offre |
| > 0 | > 0 | la chaîne fonctionne, il reste la conversion en abonnement |

---

# Ce que vous seul pouvez faire

Rien de ce qui suit ne peut être fait depuis une session Claude : il faut vos
comptes. L'ordre compte — chaque étape suppose la précédente.

### 1. Corriger le secret `DATABASE_URL` du dépôt — **bloquant**

**Settings > Secrets and variables > Actions > `DATABASE_URL`**

Il pointe vers un hôte Supabase abandonné, alors que la production tourne sur
Neon. Conséquence visible : le workflow « Prisma Migrate Deploy » échoue à
chaque push sur `main` depuis des dizaines de commits, sur un `P1001`. Personne
ne le regarde plus, et c'est le problème.

Conséquence moins visible : le collecteur GitHub Actions remplirait cette base
abandonnée. Un collecteur qui écrit dans le vide a l'air de marcher.

Mettez-y la même chaîne de connexion Neon que celle configurée sur Vercel.

### 2. Appliquer le SQL du parrainage

`docs/sql/2026-09-12-parrainage-visites.sql`, à coller dans l'éditeur SQL de
Neon (console.neon.tech, votre projet, **SQL Editor**). Quatre instructions.

Tant que ce n'est pas fait, `/partenaire/<jeton>` répond « page indisponible »
et le compteur de visiteurs reste à zéro. Le reste du site n'est pas affecté :
l'attribution, les factures et les commissions continuent de fonctionner.

### 3. Fusionner la branche dans `main`

**La production se déploie depuis `main`.** Tant que ce n'est pas fusionné, le
site en ligne tourne sur l'ancien code, quoi qu'affiche une build locale.

### 4. Vérifier que la collecte tourne sans votre PC

Onglet **Actions > Collecte Vinted > Run workflow**, puis lisez le journal.

C'est le premier essai de la collecte depuis une machine GitHub, et la seule
question ouverte est de savoir si Vinted accepte ces adresses IP. La réponse est
dans le journal, en clair, cible par cible : `blocked` signifie qu'il refuse, et
qu'une machine sur IP résidentielle reste nécessaire. Tout autre résultat
signifie que votre PC peut s'éteindre.

### 5. Créer le partenaire et lui donner ses liens

```bash
npm run parrainage:creer -- CODE "Son nom" 30 son@email.fr
npm run parrainage:verifier -- CODE
```

La commande affiche les deux liens. Ne publiez que le premier.

### 6. Stripe — à vérifier une fois

Le webhook de production doit pointer vers `/api/webhooks/stripe` et être abonné
aux événements que le code traite réellement. `npm run stripe:evenements`
compare les deux listes et signale les manquants ; avec `--appliquer`, il les
ajoute. Il ne retire jamais rien.

Sans `invoice.payment_succeeded`, aucune commission n'est jamais enregistrée :
l'attribution fonctionne, le registre reste vide, et le partenaire n'est pas
payé sans que rien ne le signale.
