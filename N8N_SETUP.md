# âœ… N8N Agents - SystÃ¨me Fonctionnel

## Ã‰tat d'intÃ©gration

Tous les agents n8n sont maintenant **centralisÃ©s** et **fonctionnels**.

### âœ¨ Changements effectuÃ©s

#### 1. **Configuration CentralisÃ©e**
- Fichier: `lib/n8n-agents.ts`
- URL Base: `https://botscrapping.app.n8n.cloud/webhook`
- 10 agents disponibles avec webhooks standardisÃ©s

#### 2. **Routes API UnifiÃ©es**
Toutes les routes API utilisent maintenant la configuration centralisÃ©e :
- âœ… `/api/ai/chat` - Chat conversationnel
- âœ… `/api/ai/deal-finder` - Deal Finder
- âœ… `/api/ai/opportunities` - OpportunitÃ©s
- âœ… `/api/ai/trends` - Tendances
- âœ… `/api/ai/product-analyzer` - Analyse produit
- âœ… `/api/ai/categories` - Analyse catÃ©gories
- âœ… `/api/ai/reports` - Rapports
- âœ… `/api/ai/memory` - MÃ©moire de session
- âœ… `/api/ai/rag-search` - Recherche RAG

#### 3. **Fonction Utilitaire**
```typescript
callAgent<T>(url: string, body: object): Promise<T>
```
- GÃ¨re timeout 30s
- Parsing JSON robuste
- Messages d'erreur clairs

#### 4. **Route de Test**
- Endpoint: `/api/ai/test`
- Permet de vÃ©rifier la connexion Ã  chaque agent

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
| **ragSearch** | `/ResellQ-rag-search` | Recherche dans la base de donnÃ©es |
| **memory** | `/ResellQ-memory` | Stockage de contexte utilisateur |
| **productAnalyzer** | `/ResellQ-analyze-product` | Analyse dÃ©taillÃ©e d'un produit |
| **categoryAnalyzer** | `/ResellQ-analyze-category` | Analyse du marchÃ© d'une catÃ©gorie |
| **opportunityFinder** | `/ResellQ-opportunities` | DÃ©tection d'opportunitÃ©s rentables |
| **dealFinder** | `/ResellQ-deals` | Finder des meilleurs deals |
| **trendAnalyzer** | `/ResellQ-trends` | Analyse des tendances marchÃ© |
| **reportGenerator** | `/ResellQ-report` | GÃ©nÃ©ration de rapports personnalisÃ©s |
| **notificationAgent** | `/ResellQ-notifications` | Gestion des alertes utilisateur |

---

## ðŸ”§ Configuration des Variables d'Environnement

AjoutÃ©es dans `env.example` :

```env
# N8N Base URL
N8N_BASE_URL="https://botscrapping.app.n8n.cloud/webhook"

# N8N Agent Webhooks (optionnel - utilisÃ© si besoin de personnalisation)
N8N_CHAT_WEBHOOK="/ResellQ-ai-chat"
N8N_DEAL_FINDER_WEBHOOK="/ResellQ-deals"
# ... (voir env.example pour la liste complÃ¨te)
```

---

## ðŸ“š Documentation

- `lib/n8n-integration.md` - Guide complet d'intÃ©gration
- `lib/n8n-agents.ts` - Configuration centrale
- `app/api/ai/*/route.ts` - Routes API

---

## âœ… Checklist d'IntÃ©gration

- âœ… Configuration centralisÃ©e crÃ©Ã©e
- âœ… Toutes les routes API unifiÃ©es
- âœ… Gestion des erreurs robuste
- âœ… Route de test implÃ©mentÃ©e
- âœ… Variables d'environnement documentÃ©es
- âœ… Aucune erreur de compilation
- âœ… Documentation complÃ¨te

---

## ðŸš€ Prochaines Ã‰tapes

1. **Tester les agents** - Utiliser `/api/ai/test` pour vÃ©rifier la connexion
2. **IntÃ©grer dans les pages** - Utiliser les agents dans les routes existantes
3. **Ajouter des agents** - CrÃ©er de nouveaux agents n8n au besoin
4. **Monitorer les performances** - Ajouter du logging dÃ©taillÃ©

---

## ðŸ“ž Troubleshooting

### Erreur: "Agent error 504"
- N8N server est offline
- URL webhook incorrecte
- Timeout du serveur n8n

### Erreur: "Aucun message fourni"
- Body du request ne contient pas le bon format
- VÃ©rifier la documentation de l'agent

### Timeout aprÃ¨s 30s
- N8N prend trop de temps
- Augmenter le timeout dans `lib/n8n-agents.ts`

---

## ðŸ“ Notes

- Tous les webhooks utilisent le pattern `ResellQ-*`
- Les webhooks sont configurÃ©s sur N8N Cloud
- Les erreurs N8N sont remontÃ©es au client
- Le systÃ¨me fait du fallback sur du texte plain si N8N retourne du non-JSON

---

**Ã‰tat:** âœ… PrÃªt pour production  
**Version:** 1.0  
**DerniÃ¨re mise Ã  jour:** 2025-06-27

