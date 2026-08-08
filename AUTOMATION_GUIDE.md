# ⚙️ ResellQ Automation Guide

## 🎯 Vue d'ensemble

ResellQ dispose maintenant d'un système **d'automation 100% complète** avec :
- ✅ **AI Agents** - 10 agents N8N qui fonctionnent 24/7
- ✅ **Job Queue** - BullMQ pour traiter les tâches en arrière-plan
- ✅ **Product Sync** - Sync automatique Vinted → Base de données locale
- ✅ **Auto-Analysis** - Chaque produit est analysé pour la profitabilité
- ✅ **Smart Watchlists** - Création automatique basée sur les tendances
- ✅ **Notifications** - Alertes en temps réel sur les opportunités

---

## 🚀 Démarrage rapide

### 1. Configuration des variables d'environnement

```bash
# .env.local ou .env.production

# Redis (pour BullMQ job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty for local dev

# N8N Webhooks (déjà existants)
N8N_BASE_URL=https://botscrapping.app.n8n.cloud
N8N_CHAT_WEBHOOK=/webhook/ResellQ-ai-chat
# ... autres webhooks

# OpenAI
OPENAI_API_KEY=sk-...
```

### 2. Démarrer le job processor

```typescript
// Dans app.ts ou server.ts
import { initializeJobProcessors } from '@/lib/job-processors'

// Call once on server startup
await initializeJobProcessors()
```

### 3. Accéder au dashboard

```
http://localhost:3000/dashboard/automation
```

---

## 🤖 API Endpoints

### Automation Status & Control

**GET** `/api/automation/status`
- Récupère l'état des jobs et configuration

**POST** `/api/automation/status`
```json
{
  "jobType": "sync-products|analyze-products|create-watchlist|notify-user",
  "payload": { /* job-specific data */ }
}
```

### Configuration

**GET** `/api/automation/config`
- Récupère la configuration automation de l'utilisateur

**POST** `/api/automation/config`
```json
{
  "enabled": true,
  "autoCreateWatchlist": true,
  "autoAnalyze": true,
  "autoNotify": true,
  "minProfitMargin": 25.0,
  "maxRiskLevel": "medium",
  "checkInterval": 3600
}
```

### Produits

**GET** `/api/products?category=X&minMargin=25&maxRisk=medium&limit=50`
- Récupère les produits scrapés avec filtres

**POST** `/api/products`
```json
{
  "vintedId": "123456",
  "title": "Nike Air Max",
  "price": 45.50,
  "category": "Chaussures",
  "profitMargin": 32.5,
  "...": "..."
}
```

### Watchlists Auto

**GET** `/api/automation/watchlists`
- Récupère les recommandations de watchlists basées sur les tendances

**POST** `/api/automation/watchlists`
```json
{
  "autoCreate": true,
  "categories": ["Chaussures", "Femmes"]
}
```

### Actions IA

**POST** `/api/ai/auto-action`
```json
{
  "action": "create watchlist|analyze|sync|opportunities|categories|alert",
  "query": "Nike sneakers category:Chaussures margin:>30%",
  "filters": {
    "minMargin": 25,
    "maxPrice": 500,
    "riskLevel": "low"
  }
}
```

---

## 📊 Data Models

### Product
```prisma
model Product {
  id              String   @id
  vintedId        String   @unique      // Vinted product ID
  title           String               // Product title
  price           Float                // Current price
  category        String               // Vinted category
  brand           String?              // Brand extracted by AI
  profitMargin    Float?               // Calculated profit margin
  analysisScore   Float?               // AI profitability score (0-100)
  riskLevel       String?              // low|medium|high
  recommendation  String?              // sell|hold|skip
  status          String               // active|sold|archived
  createdAt       DateTime
}
```

### AutomationJob
```prisma
model AutomationJob {
  id        String    @id
  userId    String?
  jobType   String    // sync|analyze|notify|create-watchlist
  status    String    // pending|running|completed|failed
  input     String?   // JSON payload
  result    String?   // JSON result
  error     String?   // Error message if failed
  retries   Int       // Number of retries
  nextRunAt DateTime? // For scheduled jobs
}
```

### AutomationConfig
```prisma
model AutomationConfig {
  userId              String  @unique
  enabled             Boolean @default(true)
  autoCreateWatchlist Boolean @default(true)
  autoAnalyze         Boolean @default(true)
  autoNotify          Boolean @default(true)
  minProfitMargin     Float   @default(25.0)
  maxRiskLevel        String  @default("medium")
  checkInterval       Int     @default(3600) // seconds
}
```

---

## 🔄 Flux d'automation

```
1. Scheduled Sync (toutes les 4h)
   ├─ Appelle N8N ProductAnalyzer agent
   ├─ Récupère tous les produits Vinted
   ├─ Insère/met à jour dans Prisma Product table
   └─ Calcule CategoryMarket statistics

2. Auto-Analysis (après sync)
   ├─ Trouve produits non-analysés
   ├─ Appelle N8N AI pour scoring
   ├─ Calcule profitMargin & riskLevel
   ├─ Met à jour Product.analysisScore
   └─ Crée notifications pour top opportunities

3. Smart Watchlist Creation
   ├─ Identifie catégories en tendance
   ├─ Crée watchlists pour l'utilisateur
   ├─ Ajoute règles (minMargin, maxPrice)
   └─ Notifie l'utilisateur

4. User Notifications
   ├─ Détecte opportunités > minProfitMargin
   ├─ Envoie alerte via email (N8N)
   ├─ Log dans Notification table
   └─ Affiche dans dashboard
```

---

## 🎨 Dashboard Automation

La page `/dashboard/automation` affiche :

- **Queue Status** - Nombre de jobs en attente par type
- **Quick Actions** - Boutons pour déclencher jobs manuellement
- **Configuration** - Réglages automation (marge min, niveau risque, intervalle)
- **Recent Jobs** - Historique des 10 derniers jobs avec statut

---

## 🧠 Exemples d'utilisation IA

```javascript
// L'utilisateur dit au chat IA:
"Create a watchlist for Nike sneakers with margin > 30%"

// L'IA appelle:
POST /api/ai/auto-action {
  action: "create watchlist",
  query: "Nike sneakers category:Chaussures margin:>30%",
  filters: { minMargin: 30 }
}

// Résultat: Watchlist créée automatiquement!
```

---

## ⚠️ Troubleshooting

### Redis Connection Error
```bash
# Démarrer Redis localement (Windows):
redis-server

# Ou utiliser Redis Cloud:
REDIS_HOST=redis-xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### Jobs not processing
```bash
# Vérifier les logs:
npm run dev -- --verbose

# Vérifier queue status:
curl http://localhost:3000/api/automation/status
```

### Products not syncing
- Vérifier N8N est actif: https://botscrapping.app.n8n.cloud
- Vérifier `NEXT_PUBLIC_N8N_BASE_URL` env var
- Vérifier ProductAnalyzer agent webhook est correct

---

## 📈 Performance

- **Sync time**: ~2-5 min pour 500-1000 produits
- **Analysis time**: ~30-60s pour 100 produits
- **Watchlist creation**: <1s
- **Database**: SQLite pour dev, PostgreSQL recommandé pour production

---

## 🔐 Sécurité

- ✅ Toutes les routes sont protégées par NextAuth
- ✅ Les jobs ne traitent que les données de l'utilisateur
- ✅ Les secrets N8N ne sont pas exposés en frontend
- ✅ Redis peut être sécurisé avec mot de passe

---

## 🚀 Prochaines étapes

- [ ] Implémenter BullBoard pour UI job queue
- [ ] Ajouter webhooks pour sync en temps réel
- [ ] Machine learning pour prédiction de prix
- [ ] Intégration multi-marketplaces (Vinted, Depop, Mercari)
- [ ] Analytics avancées & heatmaps

---

**Questions?** Consultez le code dans `/lib/job-processors.ts` et `/lib/queues.ts`
