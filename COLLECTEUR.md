# Le collecteur Vinted

Comment les annonces arrivent en base, comment vérifier que ça marche, et quoi
regarder quand ça ne marche plus.

## En une commande

```bash
npm run bot:check      # est-ce que le robot lit Vinted, maintenant ?
npm run collect:status # qu'y a-t-il en base, et qu'est-ce qui échoue ?
npm run collector      # collecte en continu (Ctrl+C pour arrêter)
```

`npm run bot:check` interroge le vrai Vinted et affiche le taux de remplissage
de chaque champ. Si un champ tombe à 0 %, l'extraction a régressé — c'est le
premier endroit où le voir.

## Comment ça marche

```
collect_targets  ──►  runVintedBotScan  ──►  persistVintedScanResults
 (quoi collecter)      (API Vinted)           (products + agrégats + notes)
```

**`lib/vinted/session.ts`** ouvre une session. L'API catalogue de Vinted refuse
toute requête sans cookie : une requête nue répond
`401 invalid_authentication_token`. Le cookie qui compte, `access_token_web`,
est `httpOnly`, donc invisible en JavaScript — on le récupère dans les en-têtes
`Set-Cookie` d'une visite normale de la page d'accueil. Vinted en délivre un aux
visiteurs anonymes : **aucun compte n'est nécessaire**.

**`lib/vinted/api.ts`** interroge `/api/v2/catalog/items`. Vinted plafonne à 96
annonces par page. Deux pages partent en parallèle, avec une pause entre les
paquets.

**`lib/vinted/html.ts`** est le chemin de secours : la page catalogue publique,
lue avec des expressions régulières. Elle perd le vendeur, les favoris et la
date de mise en ligne. Elle sert quand l'API refuse la session ; l'interface
affiche alors « lecture dégradée ».

**`lib/vinted-bot.ts`** enchaîne les deux et **n'invente jamais rien**. Un échec
rend zéro annonce et dit pourquoi (`blocked`, `auth`, `network`, `format`,
`timeout`). La route répond 502, pas 200.

**`lib/vinted/collector.ts`** est le moteur : il réserve la cible la plus en
retard dans `collect_targets`, la traite, la replanifie. Le cron Vercel et le
collecteur local exécutent ce même moteur — ce qui marche en local marche en
production.

## Ce qui tourne où

| | quoi | quand |
|---|---|---|
| Votre PC | `npm run collector` | en continu, une cible après l'autre |
| Vercel | `/api/cron/market-refresh` | toutes les heures, 50 s par passage |

Les deux écrivent dans la même base Neon. Ils ne se marchent pas dessus : une
cible est réservée par une écriture conditionnelle avant d'être traitée, donc
un seul collecteur la prend.

### Démarrage automatique sous Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\installer-demarrage-windows.ps1
```

Pose un raccourci dans le dossier Démarrage de la session : le collecteur repart
à chaque ouverture de session, et le lanceur `.cmd` le relance tout seul s'il
plante. Lancée depuis un PowerShell administrateur, la même commande ajoute en
plus une tâche planifiée, qui survit à une fermeture de session. Pour tout
enlever : même commande avec `-Desinstaller`.

**Ce que ça ne couvre pas : un PC éteint.** C'est la panne qui s'est produite —
la collecte s'est arrêtée cinq jours sans que rien ne le signale. D'où le
bandeau de fraîcheur et l'alerte décrits plus bas. Pour une collecte qui ne
s'arrête jamais, il faut une machine allumée en permanence.

**Un seul collecteur par machine.** Le script pose un verrou (`resellq-collecteur.lock`
dans le dossier temporaire) contenant son PID. Un second lancement se retire
avec le code 3, et le lanceur `.cmd` arrête alors sa boucle au lieu de réessayer
toutes les trente secondes. Un verrou laissé par un processus mort n'empêche
personne de démarrer.

### Cron Vercel

`vercel.json` déclare un passage horaire. **Ce projet est sur le plan Hobby**,
qui ne déclenche les crons qu'une fois par jour : le passage horaire ne prendra
effet que sur un plan Pro. En attendant, le collecteur local est la source
principale, et le cron n'est qu'un filet de sécurité quotidien.

La production se déploie depuis la branche `main` du dépôt GitHub. Tant qu'une
modification n'est pas fusionnée dans `main`, le site en ligne tourne sur
l'ancien code — même si tout fonctionne en local.

Posez `CRON_SECRET` dans les variables d'environnement Vercel. Sans secret, la
route refuse tout appel qui ne vient pas du cron Vercel : une route de cron
ouverte à tous, c'est un moyen gratuit de faire marteler Vinted depuis notre IP
jusqu'à ce qu'elle soit bloquée.

## Régler la file de collecte

Tout se passe dans la table `collect_targets` — rien à redéployer.

```sql
-- suivre une recherche précise, souvent
INSERT INTO collect_targets (id, query, label, "targetItems", "intervalMinutes", priority, "nextRunAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'nike air max', 'Nike Air Max', 192, 30, 20, NOW(), NOW());

-- lever la fréquence d'une catégorie
UPDATE collect_targets SET "intervalMinutes" = 30 WHERE query = 'Chaussures';

-- mettre une cible de côté sans la perdre
UPDATE collect_targets SET enabled = false WHERE query = 'Livres & Médias';
```

`npm run targets:seed` crée les quinze catégories de départ. Il est idempotent :
le relancer n'écrase aucun réglage fait à la main.

## La note d'opportunité

`analysisScore` (0-100) et `profitMargin` (%) sont calculés à chaque collecte
par `lib/vinted/scoring-marche.ts`, **sans appel à un modèle**. Ils l'étaient
auparavant par OpenAI, douze articles par passage — et le compte OpenAI de ce
projet n'ayant plus de crédit, zéro produit sur six mille était noté : la page
Opportunités, qui filtre sur `profitMargin`, ne rendait rien.

La note se décompose sur 100 :

| | points | mesure |
|---|---|---|
| marge | 0-45 | prix de revente médian face au prix payé, protection acheteurs comprise |
| demande | 0-25 | favoris par jour depuis la mise en ligne |
| état | 0-15 | neuf, très bon, bon, satisfaisant |
| fiabilité | 0-15 | la référence de prix vient-elle de la même marque ou de toute la catégorie |

Deux garde-fous, appris de la première version :

- La référence est la médiane de **la même marque** dans la catégorie dès qu'il
  y a huit annonces ou plus. Comparer une paire à 2 € à la médiane de toute la
  catégorie « Chaussures » donnait 471 % de marge sur des chaussons de bébé.
- Une annonce moins chère que les 10 % les moins chères de sa marque voit ses
  points de marge divisés par quatre. Ce sont presque toujours des articles
  incomplets ou des appâts — « iPhone 16 à 1 € », « Nike Dunk, pied gauche
  uniquement », les deux relevés en base.

**Sa limite :** la référence reste une médiane par marque, pas par modèle. Un
chargeur Apple est comparé à l'ensemble des articles Apple, iPhone compris. La
note est un signal de tri, pas un verdict d'achat.

OpenAI, s'il a du crédit, ne remplit plus que `riskLevel` et `recommendation`.

## Quand ça ne marche plus

| symptôme | cause probable | quoi faire |
|---|---|---|
| `bot:check` dit `blocked` (403) | DataDome filtre l'IP | attendre, changer d'IP, ou poser `VINTED_SESSION_COOKIE` |
| `bot:check` dit `blocked` (429) | trop de requêtes | augmenter `intervalMinutes` des cibles |
| `bot:check` dit `auth` | Vinted n'a pas délivré de jeton | poser `VINTED_SESSION_COOKIE` |
| source `html` au lieu de `api` | l'API refuse, la page passe encore | vérifier la session ; les données sont incomplètes |
| un champ à 0 % dans `bot:check` | Vinted a renommé un champ | corriger `normaliserAnnonce` dans `lib/vinted/api.ts` |
| les chiffres ne bougent plus | le collecteur est arrêté | `npm run collect:status`, colonne « dernière écriture » |

`VINTED_SESSION_COOKIE` accepte le contenu brut du cookie d'un navigateur
connecté (`nom=valeur; nom=valeur; ...`). Une session authentifiée est moins
souvent contrôlée qu'une session anonyme.

## Tests

```bash
npm test                              # tests hors ligne
VINTED_TESTS_RESEAU=1 npm test        # + les tests qui interrogent le vrai Vinted
```

Les tests réseau sont ignorés par défaut, pour qu'une machine sans accès ne
fasse pas échouer la suite pour une mauvaise raison. Ils sont le seul moyen de
détecter un changement de format chez Vinted : s'ils échouent, ce n'est pas le
test qui est cassé, c'est le produit.

## Savoir que ça s'est arrêté

C'est la partie qui manquait. Le collecteur s'est arrêté et les pages ont
continué d'afficher prix, médianes et opportunités avec le même aplomb, en
décrivant un marché vieux de cinq jours. Trois choses le rendent maintenant
visible :

| où | quoi |
|---|---|
| Bandeau dans l'application | Au-dessus de chaque page du tableau de bord, dès que la dernière écriture dépasse 3 h. Rouge au-delà de 12 h. |
| `GET /api/health` | Répond **503** quand la collecte est arrêtée, avec l'âge de la donnée. Branchable sur n'importe quelle supervision externe. |
| Courriel aux administrateurs | Envoyé par le cron quand la collecte dépasse 12 h, une fois par demi-journée au plus. Demande `RESEND_API_KEY`. |

`GET /api/collecte/sante` rend le même diagnostic en JSON, pour tout compte
connecté.

Les seuils sont dans `lib/vinted/sante.ts` : 3 h pour « à jour », 12 h pour
« arrêtée ».

## La donnée qui alimente quoi

Ce tableau existe pour qu'on puisse remonter n'importe quel chiffre affiché
jusqu'à sa mesure. Aucune de ces pages ne contient plus de valeur écrite à la
main.

| page | route | source |
|---|---|---|
| Opportunités | `/api/vinted/opportunities` | `products`, triés par note d'opportunité |
| Deal Finder | `/api/vinted/opportunities` | idem, avec filtres budget et marge |
| Tendances | `/api/ai/trends` | `CategoryMarketDaily` — deux points comparés, sans modèle |
| Top produits / marques / catégories | `/api/vinted/*` | `products` et `CategoryMarket` |
| Recherche | `/api/vinted/search` | base d'abord, Vinted en direct si besoin |
| Démonstration publique | `/api/public/demo` | agrégats seuls, aucune annonce nommée |
| Bot | `/api/bot/vinted/run` | Vinted en direct |

## Pièges connus

**`npm run build` échoue avec `EPERM ... query_engine-windows.dll.node`.**
`prisma generate` ne peut pas remplacer son moteur pendant qu'un processus Node
le tient ouvert. Fermez la fenêtre du collecteur (titre « Collecteur Vinted —
ResellQ ») avant de construire, puis relancez-la.

**`npm install` supprime prisma, tsx et vitest.** `NODE_ENV=production` est posé
dans l'environnement de la machine, et npm saute alors les dépendances de
développement. Utilisez `npm install --include=dev`.
