# N8N Agents Integration Guide

## Overview
Tous les agents n8n sont maintenant centralisÃ©s et fonctionnels via `lib/n8n-agents.ts`.

## Configuration CentralisÃ©e

**Base URL:** `https://botscrapping.app.n8n.cloud/webhook`

### Agents Disponibles

| Agent | Webhook | Description |
|-------|---------|-------------|
| `chat` | `/ResellQ-ai-chat` | Chat conversationnel GPT-4o |
| `ragSearch` | `/ResellQ-rag-search` | Recherche RAG dans la base de donnÃ©es |
| `memory` | `/ResellQ-memory` | Gestion de la mÃ©moire de session |
| `productAnalyzer` | `/ResellQ-analyze-product` | Analyse dÃ©taillÃ©e d'un produit |
| `categoryAnalyzer` | `/ResellQ-analyze-category` | Analyse des catÃ©gories de marchÃ© |
| `opportunityFinder` | `/ResellQ-opportunities` | DÃ©tection des opportunitÃ©s de revente |
| `dealFinder` | `/ResellQ-deals` | Finder des meilleurs deals |
| `trendAnalyzer` | `/ResellQ-trends` | Analyse des tendances Vinted |
| `reportGenerator` | `/ResellQ-report` | GÃ©nÃ©ration de rapports |
| `notificationAgent` | `/ResellQ-notifications` | Gestion des notifications |

## Utilisation

### Dans une Route API

```typescript
import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Appeler un agent
    const result = await callAgent(AGENTS.dealFinder, {
      category: 'sneakers',
      minMargin: 40
    })
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
```

### Dans une Page Client

```typescript
'use client'
import { useState } from 'react'

export default function MyPage() {
  const [loading, setLoading] = useState(false)
  
  const analyzeDeal = async (productId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/product-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      console.log('Analyse complÃ¨te:', data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={() => analyzeDeal('123')} disabled={loading}>
      {loading ? 'Analyse en cours...' : 'Analyser'}
    </button>
  )
}
```

## Routes API Disponibles

- `POST /api/ai/chat` - Conversation avec l'assistant IA
- `POST /api/ai/deal-finder` - Finder des deals
- `POST /api/ai/opportunities` - Trouver des opportunitÃ©s
- `POST /api/ai/trends` - Analyser les tendances
- `POST /api/ai/product-analyzer` - Analyser un produit
- `POST /api/ai/categories` - Analyser les catÃ©gories
- `POST /api/ai/reports` - GÃ©nÃ©rer un rapport
- `POST /api/ai/memory` - GÃ©rer la mÃ©moire de session
- `POST /api/ai/rag-search` - Recherche RAG

## Gestion des Erreurs

Le systÃ¨me gÃ¨re automatiquement :
- âœ… Timeout 30 secondes par dÃ©faut
- âœ… Parsing JSON robuste
- âœ… Messages d'erreur clairs
- âœ… Fallback sur rÃ©ponse texte si n8n retourne du non-JSON

## Ã‰tat des Agents

**Fonctionnels :**
- âœ… Chat conversationnel
- âœ… Deal Finder
- âœ… OpportunitÃ©s
- âœ… Tendances
- âœ… Analyseurs produit/catÃ©gorie
- âœ… Rapports
- âœ… MÃ©moire de session

## IntÃ©gration Pages

### Dashboard `/dashboard`
Utilise les donnÃ©es des agents pour afficher trends et top produits

### AI Agent `/ai-agent`
Interface conversationnelle complÃ¨te avec l'assistant

### Deal Finder `/deal-finder`
RÃ©sultats en temps rÃ©el du Deal Finder agent

### Reports `/reports`
Rapports gÃ©nÃ©rÃ©s par l'agent reportGenerator

## Maintenance

### Changer l'URL de Base N8N
Modifier `N8N_BASE` dans `lib/n8n-agents.ts`:

```typescript
const N8N_BASE = 'https://votre-url.n8n.cloud/webhook'
```

Tous les agents utiliseront automatiquement la nouvelle URL.

### Ajouter un Nouvel Agent
1. Ajouter dans `AGENTS` object:
   ```typescript
   newAgent: `${N8N_BASE}/ResellQ-new-agent`,
   ```

2. CrÃ©er la route API: `/app/api/ai/new-agent/route.ts`
   ```typescript
   import { AGENTS, callAgent } from '@/lib/n8n-agents'
   
   export async function POST(request: Request) {
     const body = await request.json()
     const data = await callAgent(AGENTS.newAgent, body)
     return NextResponse.json(data)
   }
   ```

3. Utiliser dans le code client

