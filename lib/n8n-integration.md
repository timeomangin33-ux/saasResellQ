# N8N Agents Integration Guide

## Overview
Tous les agents n8n sont maintenant centralisés et fonctionnels via `lib/n8n-agents.ts`.

## Configuration Centralisée

**Base URL:** `https://botscrapping.app.n8n.cloud/webhook`

### Agents Disponibles

| Agent | Webhook | Description |
|-------|---------|-------------|
| `chat` | `/ResellQ-ai-chat` | Chat conversationnel GPT-4o |
| `ragSearch` | `/ResellQ-rag-search` | Recherche RAG dans la base de données |
| `memory` | `/ResellQ-memory` | Gestion de la mémoire de session |
| `productAnalyzer` | `/ResellQ-analyze-product` | Analyse détaillée d'un produit |
| `categoryAnalyzer` | `/ResellQ-analyze-category` | Analyse des catégories de marché |
| `opportunityFinder` | `/ResellQ-opportunities` | Détection des opportunités de revente |
| `dealFinder` | `/ResellQ-deals` | Finder des meilleurs deals |
| `trendAnalyzer` | `/ResellQ-trends` | Analyse des tendances Vinted |
| `reportGenerator` | `/ResellQ-report` | Génération de rapports |
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
      
      console.log('Analyse complète:', data)
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
- `POST /api/ai/opportunities` - Trouver des opportunités
- `POST /api/ai/trends` - Analyser les tendances
- `POST /api/ai/product-analyzer` - Analyser un produit
- `POST /api/ai/categories` - Analyser les catégories
- `POST /api/ai/reports` - Générer un rapport
- `POST /api/ai/memory` - Gérer la mémoire de session
- `POST /api/ai/rag-search` - Recherche RAG

## Gestion des Erreurs

Le système gère automatiquement :
- âœ… Timeout 30 secondes par défaut
- âœ… Parsing JSON robuste
- âœ… Messages d'erreur clairs
- âœ… Fallback sur réponse texte si n8n retourne du non-JSON

## à‰tat des Agents

**Fonctionnels :**
- âœ… Chat conversationnel
- âœ… Deal Finder
- âœ… Opportunités
- âœ… Tendances
- âœ… Analyseurs produit/catégorie
- âœ… Rapports
- âœ… Mémoire de session

## Intégration Pages

### Dashboard `/dashboard`
Utilise les données des agents pour afficher trends et top produits

### AI Agent `/ai-agent`
Interface conversationnelle complète avec l'assistant

### Deal Finder `/deal-finder`
Résultats en temps réel du Deal Finder agent

### Reports `/reports`
Rapports générés par l'agent reportGenerator

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

2. Créer la route API: `/app/api/ai/new-agent/route.ts`
   ```typescript
   import { AGENTS, callAgent } from '@/lib/n8n-agents'
   
   export async function POST(request: Request) {
     const body = await request.json()
     const data = await callAgent(AGENTS.newAgent, body)
     return NextResponse.json(data)
   }
   ```

3. Utiliser dans le code client

