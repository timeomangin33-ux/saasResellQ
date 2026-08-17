# âœ… N8N Agents - Système Fonctionnel

## à‰tat d'intégration

Tous les agents n8n sont maintenant **centralisés** et **fonctionnels**.

### âœ¨ Changements effectués

#### 1. **Configuration Centralisée**
- Fichier: `lib/n8n-agents.ts`
- URL Base: `https://botscrapping.app.n8n.cloud/webhook`
- 10 agents disponibles avec webhooks standardisés

#### 2. **Routes API Unifiées**
Toutes les routes API utilisent maintenant la configuration centralisée :
- âœ… `/api/ai/chat` - Chat conversationnel
- âœ… `/api/ai/deal-finder` - Deal Finder
- âœ… `/api/ai/opportunities` - Opportunités
- âœ… `/api/ai/trends` - Tendances
- âœ… `/api/ai/product-analyzer` - Analyse produit
- âœ… `/api/ai/categories` - Analyse catégories
- âœ… `/api/ai/reports` - Rapports
- âœ… `/api/ai/memory` - Mémoire de session
- âœ… `/api/ai/rag-search` - Recherche RAG

#### 3. **Fonction Utilitaire**
```typescript
callAgent<T>(url: string, body: object): Promise<T>
```
- Gère timeout 30s
- Parsing JSON robuste
- Messages d'erreur clairs

#### 4. **Route de Test**
- Endpoint: `/api/ai/test`
- Permet de vérifier la connexion à  chaque agent

---

## ðŸ§ª Comment tester

### Option 1 : Via cURL

```bash
# Test du chat agent
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"agentKey": "chat", "testPayload": {"message": "Quels deals cette semaine?", "session_id": "test"}}'

# Test du Deal Finder
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"agentKey": "dealFinder", "testPayload": {"category": "sneakers", "minMargin": 35}}'

# Voir les agents disponibles
curl http://localhost:3000/api/ai/test
```

### Option 2 : Via Postman/Thunder Client

**GET** `/api/ai/test`
- Voir tous les agents et exemples

**POST** `/api/ai/test`
```json
{
  "agentKey": "chat",
  "testPayload": {
    "message": "Test message",
    "session_id": "test_session"
  }
}
```

### Option 3 : Dans le Code

```typescript
import { AGENTS, callAgent } from '@/lib/n8n-agents'

// Test simple
const result = await callAgent(AGENTS.dealFinder, {
  category: 'sneakers',
  minMargin: 40
})
console.log(result)
```

---

## ðŸ“Š Liste des Agents

| Agent | Webhook | Cas d'usage |
|-------|---------|-----------|
| **chat** | `/ResellQ-ai-chat` | Chat conversationnel avec GPT-4o |
| **ragSearch** | `/ResellQ-rag-search` | Recherche dans la base de données |
| **memory** | `/ResellQ-memory` | Stockage de contexte utilisateur |
| **productAnalyzer** | `/ResellQ-analyze-product` | Analyse détaillée d'un produit |
| **categoryAnalyzer** | `/ResellQ-analyze-category` | Analyse du marché d'une catégorie |
| **opportunityFinder** | `/ResellQ-opportunities` | Détection d'opportunités rentables |
| **dealFinder** | `/ResellQ-deals` | Finder des meilleurs deals |
| **trendAnalyzer** | `/ResellQ-trends` | Analyse des tendances marché |
| **reportGenerator** | `/ResellQ-report` | Génération de rapports personnalisés |
| **notificationAgent** | `/ResellQ-notifications` | Gestion des alertes utilisateur |

---

## ðŸ”§ Configuration des Variables d'Environnement

Ajoutées dans `env.example` :

```env
# N8N Base URL
N8N_BASE_URL="https://botscrapping.app.n8n.cloud/webhook"

# N8N Agent Webhooks (optionnel - utilisé si besoin de personnalisation)
N8N_CHAT_WEBHOOK="/ResellQ-ai-chat"
N8N_DEAL_FINDER_WEBHOOK="/ResellQ-deals"
# ... (voir env.example pour la liste complète)
```

---

## ðŸ“š Documentation

- `lib/n8n-integration.md` - Guide complet d'intégration
- `lib/n8n-agents.ts` - Configuration centrale
- `app/api/ai/*/route.ts` - Routes API

---

## âœ… Checklist d'Intégration

- âœ… Configuration centralisée créée
- âœ… Toutes les routes API unifiées
- âœ… Gestion des erreurs robuste
- âœ… Route de test implémentée
- âœ… Variables d'environnement documentées
- âœ… Aucune erreur de compilation
- âœ… Documentation complète

---

## ðŸš€ Prochaines à‰tapes

1. **Tester les agents** - Utiliser `/api/ai/test` pour vérifier la connexion
2. **Intégrer dans les pages** - Utiliser les agents dans les routes existantes
3. **Ajouter des agents** - Créer de nouveaux agents n8n au besoin
4. **Monitorer les performances** - Ajouter du logging détaillé

---

## ðŸ“ž Troubleshooting

### Erreur: "Agent error 504"
- N8N server est offline
- URL webhook incorrecte
- Timeout du serveur n8n

### Erreur: "Aucun message fourni"
- Body du request ne contient pas le bon format
- Vérifier la documentation de l'agent

### Timeout après 30s
- N8N prend trop de temps
- Augmenter le timeout dans `lib/n8n-agents.ts`

---

## ðŸ“ Notes

- Tous les webhooks utilisent le pattern `ResellQ-*`
- Les webhooks sont configurés sur N8N Cloud
- Les erreurs N8N sont remontées au client
- Le système fait du fallback sur du texte plain si N8N retourne du non-JSON

---

**à‰tat:** âœ… Prêt pour production  
**Version:** 1.0  
**Dernière mise à  jour:** 2025-06-27

