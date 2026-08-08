# ResellQ Codebase Architecture & Automation Summary

## 📋 Executive Summary

**ResellQ** is a Next.js SaaS platform for analyzing Vinted marketplace opportunities with AI-powered insights. It uses **N8N workflows** for automation and data processing, connected via webhooks to a Next.js backend that interfaces with a Prisma ORM (SQLite locally, PostgreSQL in N8N).

**Core Automation**: 15+ N8N workflows running scheduled jobs (Vinted scraping every 4h, RAG indexing every 6h) + on-demand webhook agents.

---

## 🏗️ System Architecture

### Technology Stack

```
Frontend Layer:
  └─ Next.js 15 (React 18) + TypeScript
     └─ Tailwind CSS + Shadcn UI
     └─ Framer Motion animations

Backend Layer:
  ├─ Next.js API Routes (/api/*)
  ├─ NextAuth.js (OAuth + email/password)
  └─ Prisma ORM (SQLite dev, PostgreSQL prod)

Automation Layer:
  └─ N8N Cloud (https://botscrapping.app.n8n.cloud)
     ├─ Scheduled workflows (cron: 4h, 6h)
     └─ Webhook agents (on-demand)

External Services:
  ├─ Stripe (subscriptions, webhooks)
  ├─ OpenAI (GPT-4o, embeddings)
  └─ PostgreSQL (N8N: pgvector, memory, RAG)
```

### Data Flow Pattern

```
                                 ┌──────────────────────────┐
                                 │   Browser / Client       │
                                 └────────────┬─────────────┘
                                              │
                                    POST/GET /api/*
                                              │
                        ┌─────────────────────▼──────────────────────┐
                        │   Next.js API Route                        │
                        │  (/api/ai/*, /api/vinted/*)                │
                        └─────────────────────┬──────────────────────┘
                                              │
                                    fetch() + JSON
                                              │
                        ┌─────────────────────▼──────────────────────┐
                        │   callAgent() Function                      │
                        │   lib/n8n-agents.ts                         │
                        │   - POST to N8N webhook                    │
                        │   - 30s timeout                             │
                        │   - Fallback response                       │
                        └─────────────────────┬──────────────────────┘
                                              │
                    https://botscrapping.app.n8n.cloud/webhook/*
                                              │
                        ┌─────────────────────▼──────────────────────┐
                        │   N8N Workflow                              │
                        │   - Process data                            │
                        │   - Call OpenAI/PostgreSQL                 │
                        │   - Return JSON                             │
                        └─────────────────────┬──────────────────────┘
                                              │
                                    JSON response
                                              │
                        ┌─────────────────────▼──────────────────────┐
                        │   Back to API Route                         │
                        │   - Handle response                         │
                        │   - Return to client                        │
                        └─────────────────────┬──────────────────────┘
                                              │
                                   NextResponse.json()
                                              │
                        ┌─────────────────────▼──────────────────────┐
                        │   Browser receives response                 │
                        └──────────────────────────────────────────────┘
```

---

## 📊 Data Models

### Prisma Schema (SQLite Local Storage)

```prisma
User
  ├─ id, email (unique), name, password, image
  ├─ role (USER|ADMIN)
  ├─ Stripe: stripeCustomerId, subscriptionId, subscriptionStatus, subscriptionEnd
  ├─ createdAt, updatedAt
  └─ Relations: accounts[], sessions[], conversations[], watchlists[], notifications[], searches[]

Account (OAuth)
  ├─ id, userId, type, provider, providerAccountId
  └─ OAuth tokens: refresh_token, access_token, expires_at, id_token

Session (NextAuth)
  ├─ id, sessionToken (unique), userId, expires
  └─ Links to User

VerificationToken
  ├─ identifier, token (unique), expires
  └─ For email verification

Conversation
  ├─ id, userId, title
  ├─ createdAt, updatedAt
  └─ Relations: messages[]

Message
  ├─ id, conversationId, role (user|assistant), content
  └─ createdAt

Watchlist (User-Created Monitoring)
  ├─ id, userId, name, query
  ├─ Filters: category, minPrice, maxPrice
  ├─ createdAt, updatedAt
  └─ Tracks: specific product searches/categories

Notification (In-App Alerts)
  ├─ id, userId, title, message
  ├─ type (info|alert|deal)
  ├─ read (boolean)
  └─ createdAt

SavedSearch (Search History)
  ├─ id, userId, query, results (JSON string)
  └─ createdAt
```

### N8N PostgreSQL Tables (Referenced by Workflows)

Not modeled in Prisma but used by N8N agents:
- `ResellQ_categories` - Vinted category data
- `ResellQ_products` - Scraped product listings
- `ResellQ_opportunities` - High-margin resale opportunities
- `ResellQ_memory` - Long-term session context
- `ResellQ_rag_embeddings` - Vector embeddings for semantic search
- `ResellQ_chat_history` - Chat logs for GPT-4o context

---

## 🤖 AI Agent System (N8N)

### 10 Available Agents

| Agent | Webhook Endpoint | Type | Purpose |
|-------|------------------|------|---------|
| **chat** | `/ResellQ-ai-chat` | Webhook | GPT-4o conversational AI with PostgreSQL memory |
| **ragSearch** | `/ResellQ-rag-search` | Webhook | Semantic search in pgvector database |
| **memory** | `/ResellQ-memory` | Webhook | Store/retrieve session context |
| **productAnalyzer** | `/ResellQ-analyze-product` | Webhook | Detailed product analysis: trend, profit margin, scoring |
| **categoryAnalyzer** | `/ResellQ-analyze-category` | Webhook | Market analysis: growth, competition, avg price |
| **opportunityFinder** | `/ResellQ-opportunities` | Webhook | Detect high-margin resale opportunities |
| **dealFinder** | `/ResellQ-deals` | Webhook | Find best deals by category/budget |
| **trendAnalyzer** | `/ResellQ-trends` | Webhook | Market trends: rising categories, popular brands |
| **reportGenerator** | `/ResellQ-report` | Webhook | Generate HTML/JSON market reports |
| **notificationAgent** | `/ResellQ-notifications` | Webhook | Send Email + in-app alerts |

### Implementation Pattern

**File**: [lib/n8n-agents.ts](lib/n8n-agents.ts)

```typescript
const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL 
  || 'https://botscrapping.app.n8n.cloud/webhook'

export const AGENTS = {
  chat: `${N8N_BASE}/ResellQ-ai-chat`,
  productAnalyzer: `${N8N_BASE}/ResellQ-analyze-product`,
  // ... etc
}

export async function callAgent<T>(url: string, body: object = {}): Promise<T> {
  // POST to N8N webhook with 30s timeout
  // Parse JSON response
  // Return fallback on error
}
```

### Usage in API Routes

```typescript
// Example: /api/ai/deal-finder
import { AGENTS, callAgent } from '@/lib/n8n-agents'

export async function POST(request: Request) {
  const body = await request.json()
  const data = await callAgent(AGENTS.dealFinder, body)
  return NextResponse.json(data)
}
```

---

## 🔄 Automation & Workflows

### 15 N8N Workflows

#### **Scheduled (Cron-based)**

| Workflow | Schedule | Purpose | ID |
|----------|----------|---------|-----|
| Vinted Scraper | Every 4h | Scrapes 14 Vinted categories, calculates AI scores, maintains Top 20 global + per-category | U3McPbngZ0FoGaOq |
| RAG Indexer | Every 6h | Generates OpenAI embeddings, indexes in pgvector for semantic search | 6wIPeheYSlA57yR1 |

#### **Infrastructure Setup (One-time)**

- **Setup Data Tables** - Initialize 6 N8N tables
- **PostgreSQL Schema Setup** - Create Postgres tables (memory, RAG, reports, chat history)

#### **On-Demand Webhooks**

| Category | Workflows |
|----------|-----------|
| IA (AI) | RAG Search, Memory Manager, AI Chat Endpoint, AI Router |
| Analysis | Product Analyzer, Category Analyzer, Opportunity Finder, Deal Finder, Trend Analyzer |
| Reporting | Report Generator |
| Notifications | Notification Agent |

---

## 📡 API Endpoints

### AI Agents (`/api/ai/*`)

```
POST /api/ai/chat
  Body: { messages: [{role, content}][], session_id: string }
  Returns: { result: string }

POST /api/ai/product-analyzer
  Body: { productId?: string, ... }
  Returns: Product analysis with score, trend, margin

POST /api/ai/category-analyzer
  Body: { category: string }
  Returns: Category market analysis

POST /api/ai/deal-finder
  Body: { category?: string, minMargin?: number, budget?: number }
  Returns: Array of deals

POST /api/ai/opportunities
  Body: { minMargin?: number, riskLevel?: 'low'|'medium'|'high' }
  Returns: Array of opportunities

POST /api/ai/trends
  Body: { period?: string }
  Returns: Market trend analysis

POST /api/ai/reports
  Body: { dateRange?: string, format?: 'html'|'json' }
  Returns: Market report

POST /api/ai/memory
  Body: { sessionId, action: 'store'|'retrieve', content? }
  Returns: Memory data

POST /api/ai/rag-search
  Body: { query: string, limit?: number }
  Returns: Semantic search results

POST /api/ai/categories
  Body: { ... }
  Returns: Category data

GET /api/ai/test
  Returns: List of available agents + examples

POST /api/ai/test
  Body: { agentKey: string, testPayload?: object }
  Returns: Test results for any agent
```

### Vinted Data (`/api/vinted/*`)

```
GET /api/vinted/top-categories?debug=0
  Returns: { categories: [], source: 'n8n'|'local' }

GET /api/vinted/top-products?debug=0
  Returns: { products: [], source: 'n8n'|'local' }

GET /api/vinted/top-brands?debug=0
  Returns: { brands: [], source: 'n8n'|'local' }

GET /api/vinted/category-products?category=sneakers&debug=0
  Returns: { products: [], category, source }

GET /api/vinted/brand-products?brand=Nike
  Returns: Brand-specific products

GET /api/vinted/search?q=searchterm
  Returns: Search results

GET /api/vinted/opportunities?minProfit=30&category=clothing&riskLevel=medium
  Returns: Filtered opportunities
```

### Infrastructure

```
GET /api/health
  Returns: { ok: true }

GET /api/scraping-status
  Returns: { status: 'running'|'completed'|'unknown', lastRun, categoriesCount }

GET /api/database/status
  Returns: PostgreSQL connection status

POST /api/webhooks/stripe
  Handles: checkout.session.completed, invoice.payment_succeeded, 
           customer.subscription.updated, customer.subscription.deleted
```

---

## 🚀 Automation Triggers & Flows

### 1. **Scheduled Scraping** (Every 4 Hours)

```
N8N Cron Trigger (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
  ↓
Vinted Scraper Workflow
  ├─ Scrape 14 Vinted categories
  ├─ Extract product data
  ├─ Store in ResellQ_products table
  ├─ Calculate AI scores
  └─ Update Top 20 lists (global + per-category)
```

### 2. **Chat with AI** (User-Triggered)

```
User types message in /app/ai-agent/page.tsx
  ↓
POST /api/ai/chat
  ↓
callAgent(AGENTS.chat, { messages, session_id })
  ↓
N8N: ResellQ-ai-chat
  ├─ Retrieve session memory from PostgreSQL
  ├─ Call GPT-4o with context
  ├─ Generate response
  └─ Store new context in memory
  ↓
Response returned to client
```

### 3. **Product Analysis** (On-Demand)

```
User clicks "Analyze" on product
  ↓
POST /api/ai/product-analyzer
  ↓
N8N: ResellQ-analyze-product
  ├─ Fetch product from database
  ├─ Calculate metrics (price trend, demand, margin)
  ├─ Return score + analysis
  ↓
Display results in UI
```

### 4. **Opportunity Detection** (Scheduled + On-Demand)

```
Option A - Scheduled (via separate N8N job):
  Every N hours → Scan products → Detect opportunities 
  → Store in ResellQ_opportunities → Notify users

Option B - On-Demand:
  GET /api/vinted/opportunities?minProfit=30
  ↓
  N8N: ResellQ-opportunities
  ├─ Filter by profit margin + category
  ├─ Apply risk level filter
  → Return top opportunities
```

### 5. **Stripe Subscription** (Event-Driven)

```
User completes Stripe checkout
  ↓
Stripe webhook: checkout.session.completed
  ↓
POST /api/webhooks/stripe
  ├─ Extract customerId, subscriptionId
  ├─ Update User in database
  ├─ Set subscriptionStatus = 'ACTIVE'
  └─ Set subscriptionEnd date
  ↓
User gains access to premium features
```

---

## 🔌 Integration Patterns

### Fallback Pattern (Resilience)

```typescript
// Example: /api/vinted/category-products

try {
  // Try N8N first
  const n8nResponse = await fetch(N8N_WEBHOOK)
  if (n8nResponse.ok) {
    const data = await n8nResponse.json()
    return NextResponse.json({ data, source: 'n8n' })
  }
} catch {
  // N8N failed
}

// Fallback to local mock data
import { getProductsByCategory } from '@/vinted'
const localData = getProductsByCategory(category, 20)
return NextResponse.json({ data: localData, source: 'local' })
```

### Error Handling

- 30-second timeout on all N8N calls
- Graceful fallback to local data
- Structured error messages to client
- Console logging for debugging

---

## 📈 Current Capabilities

### ✅ What Works Today

1. **Data Collection**
   - Vinted Scraper runs every 4 hours
   - Collects products across 14 categories
   - Stores in PostgreSQL (N8N)

2. **AI Analysis**
   - Product profitability scoring
   - Category market analysis
   - Trend detection
   - Opportunity identification

3. **Chat Interface**
   - GPT-4o powered assistant
   - Session memory storage
   - Context-aware responses

4. **User Management**
   - Email/OAuth authentication
   - Stripe subscription tracking
   - Watchlist creation

5. **Webhooks**
   - Stripe payment events
   - Manual workflow triggers
   - N8N webhook responses

### 🔲 What Needs Enhancement

1. **Category Filling Automation**
   - No automatic watchlist creation
   - No auto-categorization of products
   - Manual process for category setup

2. **Product Creation**
   - No auto-ingestion to Prisma database
   - Products stay in PostgreSQL (N8N)
   - No background job queue

3. **Advanced Automation**
   - No complex workflow dependencies
   - No conditional triggers
   - No cross-workflow orchestration

---

## 🛠️ Recommendations for Full Automation

### Phase 1: Database Enhancement (Low-Hanging Fruit)

```prisma
model Product {
  id String @id @default(cuid())
  vintedId String @unique
  title String
  price Float
  category String
  brand String
  profitMargin Float
  demandScore Float
  aiScore Float
  status String // listed, sold, archived
  createdAt DateTime @default(now())
  scrapedAt DateTime @updatedAt
  
  watchlists Watchlist[]
  notifications Notification[]
}

model CategoryInsight {
  id String @id @default(cuid())
  categoryName String @unique
  totalSales Int
  averagePrice Float
  growthRate Float
  topBrands String[] // JSON array
  demandScore Float
  lastAnalyzed DateTime
  updatedAt DateTime @updatedAt
}

model AutomationJob {
  id String @id @default(cuid())
  type String // 'scrape', 'analyze', 'notify'
  status String // 'pending', 'running', 'completed', 'failed'
  result String? // JSON
  error String?
  scheduledAt DateTime
  completedAt DateTime?
  createdAt DateTime @default(now())
}
```

### Phase 2: Workflow Automation

**Add BullMQ for job queue:**

```typescript
// lib/queue.ts
import Queue from 'bull'

export const scrapingQueue = new Queue('scraping', process.env.REDIS_URL)
export const analysisQueue = new Queue('analysis', process.env.REDIS_URL)
export const notificationQueue = new Queue('notifications', process.env.REDIS_URL)

// Job processors
scrapingQueue.process(async (job) => {
  const result = await callAgent(AGENTS.dealFinder, job.data)
  // Store products in database
  // Trigger notifications if thresholds met
})

// Scheduled trigger
scrapingQueue.add({}, { repeat: { cron: '0 */4 * * *' } })
```

### Phase 3: Auto-Fill Categories

```typescript
// api/automation/fill-categories/route.ts
export async function POST(request: Request) {
  const categories = await callAgent(AGENTS.trendAnalyzer, {})
  
  for (const category of categories) {
    const watchlist = await prisma.watchlist.create({
      data: {
        userId: ADMIN_ID,
        name: `Auto-Fill: ${category.name}`,
        category: category.slug,
        query: category.keywords,
      }
    })
    
    // Trigger product fetch for this category
    await analysisQueue.add({ watchlistId: watchlist.id })
  }
}
```

### Phase 4: Auto-Create Products

```typescript
// api/automation/sync-products/route.ts
export async function POST() {
  // Get latest scraped products from N8N PostgreSQL
  const rawProducts = await fetchFromN8N('SELECT * FROM ResellQ_products WHERE lastSync < NOW() - INTERVAL 1 HOUR')
  
  for (const rawProduct of rawProducts) {
    // Check if exists
    const existing = await prisma.product.findUnique({
      where: { vintedId: rawProduct.vintedId }
    })
    
    if (existing) {
      // Update metrics
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          profitMargin: rawProduct.profitMargin,
          demandScore: rawProduct.demandScore,
          aiScore: rawProduct.aiScore,
          scrapedAt: new Date(),
        }
      })
    } else {
      // Create new
      await prisma.product.create({
        data: {
          vintedId: rawProduct.vintedId,
          title: rawProduct.title,
          price: rawProduct.price,
          category: rawProduct.category,
          brand: rawProduct.brand,
          profitMargin: rawProduct.profitMargin,
          demandScore: rawProduct.demandScore,
          aiScore: rawProduct.aiScore,
          status: 'listed',
        }
      })
      
      // Auto-notify if meets criteria
      if (rawProduct.profitMargin > 40 && rawProduct.demandScore > 8) {
        await notificationQueue.add({
          type: 'high_opportunity',
          productId: rawProduct.vintedId,
        })
      }
    }
  }
}
```

---

## 📊 Project Status

### ✅ Working
- All 10 N8N agents configured
- API routes calling agents correctly
- Stripe webhooks processing
- Fallback patterns implemented
- Chat interface functional
- Test endpoint working

### 🔄 In Progress
- Scheduled automation (4h/6h cycles)
- PostgreSQL indexing for RAG search

### ⚠️ TODO
- Automatic watchlist creation
- Product database sync (Prisma ↔ N8N PostgreSQL)
- Advanced notification rules
- Error tracking & monitoring
- Job retry logic
- Performance optimization

---

## 🚀 Deployment Checklist

- [ ] Set N8N_WEBHOOK_BASE_URL in production .env
- [ ] Configure PostgreSQL connection for N8N (if using cloud)
- [ ] Deploy to Vercel/Railway/Docker
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure Stripe webhook endpoints
- [ ] Set up SSL certificates (HTTPS)
- [ ] Test all N8N workflows in production
- [ ] Enable rate limiting on API routes
- [ ] Set up backup jobs for database

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| [lib/n8n-agents.ts](lib/n8n-agents.ts) | Central agent configuration |
| [lib/n8n-integration.md](lib/n8n-integration.md) | Integration guide |
| [schema.prisma](schema.prisma) | Data models |
| [app/api/ai/\*/route.ts](app/api/ai/) | AI endpoint routes |
| [app/api/vinted/\*/route.ts](app/api/vinted/) | Vinted data routes |
| [app/(dashboard)/dashboard/workflows/page.tsx](app/(dashboard)/dashboard/workflows/page.tsx) | Workflow management UI |
| [stripe-service.ts](stripe-service.ts) | Stripe integration |
| [middleware.ts](middleware.ts) | Security headers |

---

Generated: July 6, 2026 | Next.js 15 | TypeScript | N8N Cloud Integration
