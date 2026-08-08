'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WorkflowItem {
  id: string
  name: string
  published: boolean
  endpoint?: string
  schedule?: string
  description: string
  category: string
}

const WORKFLOWS: WorkflowItem[] = [
  { id: 'U3McPbngZ0FoGaOq', name: 'Vinted Scraper', published: true, schedule: 'Toutes les 4h', description: 'Scrape les 14 catégories Vinted, calcule les AI scores, maintient le Top 20 global et par catégorie.', category: 'Collecte' },
  { id: 'es6ikrJgjjqmhOcP', name: 'Setup Data Tables', published: true, description: 'Initialise les tables de données locales (produits, catégories, opportunités, tendances, Top 20, conversations).', category: 'Infrastructure' },
  { id: 'BWa9LVp8UNkihXl5', name: 'PostgreSQL Schema Setup', published: true, description: 'Crée les tables PostgreSQL (mémoire, RAG, rapports, préférences, historique chat).', category: 'Infrastructure' },
  { id: '6wIPeheYSlA57yR1', name: 'RAG Indexer', published: true, schedule: 'Toutes les 6h', description: 'Génère les embeddings OpenAI et les indexe dans pgvector pour la recherche sémantique.', category: 'IA' },
  { id: '1HKzZaiaSzj8U53x', name: 'RAG Search', published: true, endpoint: '/webhook/resellq-rag-search', description: 'Recherche sémantique dans pgvector — utilisé en interne par l\'agent IA.', category: 'IA' },
  { id: 'i6fYAcqniM6fSKd1', name: 'Memory Manager', published: true, endpoint: '/webhook/resellq-memory', description: 'Sauvegarde et récupère la mémoire long-terme des sessions dans PostgreSQL.', category: 'IA' },
  { id: 'MrKjgfpRHInHkMbK', name: 'AI Chat Endpoint', published: true, endpoint: '/webhook/resellq-ai-chat', description: 'Point d\'entrée principal du chat IA. GPT-4o avec mémoire PostgreSQL et 4 outils.', category: 'IA' },
  { id: '0ffwRxXCKZL8zj7k', name: 'AI Router', published: true, endpoint: '/webhook/resellq-chat', description: 'Routeur IA avec 7 outils (recherche, tendances, opportunités, Top 20...) et fallback Groq.', category: 'IA' },
  { id: 'ZZ2Wa9Rpek9DksM2', name: 'Product Analyzer', published: true, endpoint: '/webhook/resellq-analyze-product', description: 'Analyse détaillée d\'un produit : historique prix, tendance, score de revente.', category: 'Analyse' },
  { id: '0DJZ2ckcXG6qK1AL', name: 'Category Analyzer', published: true, endpoint: '/webhook/resellq-analyze-category', description: 'Analyse une catégorie Vinted : croissance, concurrence, prix moyen.', category: 'Analyse' },
  { id: 'zYPtVhnZPkM5MdlT', name: 'Opportunity Finder', published: true, endpoint: '/webhook/resellq-opportunities', description: 'Détecte les opportunités de revente à forte marge dans les données scrappées.', category: 'Analyse' },
  { id: 'h6K62ESUniZ4e1qP', name: 'Deal Finder', published: true, endpoint: '/webhook/resellq-deals', description: 'Trouve les meilleures affaires du moment — articles sous-cotés avec fort potentiel.', category: 'Analyse' },
  { id: '23nv17HoXt5Hpwhu', name: 'Trend Analyzer', published: true, endpoint: '/webhook/resellq-trends', description: 'Analyse les tendances marché : catégories en hausse, marques populaires, saisonnalité.', category: 'Analyse' },
  { id: 'cCr0zHwMpoj24eOi', name: 'Report Generator', published: true, endpoint: '/webhook/resellq-report', description: 'Génère un rapport marché complet en HTML ou JSON avec résumé GPT-4o-mini.', category: 'Rapports' },
  { id: 'y5gCuIPzcoTELrtX', name: 'Notification Agent', published: true, endpoint: '/webhook/resellq-notify', description: 'Envoie des alertes par e-mail (Gmail) et dans l&apos;application pour les opportunités et les deals détectés.', category: 'Notifications' },
]

const CATEGORIES = ['Tous', 'Collecte', 'Infrastructure', 'IA', 'Analyse', 'Rapports', 'Notifications']

const CAT_COLORS: Record<string, string> = {
  Collecte: 'bg-blue-500/10 text-blue-400',
  Infrastructure: 'bg-muted text-muted-foreground',
  IA: 'bg-purple-500/10 text-purple-400',
  Analyse: 'bg-orange-500/10 text-orange-400',
  Rapports: 'bg-accent/10 text-accent',
  Notifications: 'bg-amber-500/10 text-amber-400',
}

export default function WorkflowsPage() {
  const { data: session, status } = useSession()
  const planKey = normalizePlan(session?.user?.subscriptionPlan)
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>
  }

  if (planKey === 'STARTER') {
    return (
      <DashboardLayout>
        <PlanGate planKey={planKey} minimumPlan="PRO" feature="Automatisations">
          <></>
        </PlanGate>
      </DashboardLayout>
    )
  }

  const filtered = activeCategory === 'Tous' ? WORKFLOWS : WORKFLOWS.filter(w => w.category === activeCategory)

  const copy = (endpoint: string, id: string) => {
    navigator.clipboard.writeText(endpoint)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <DashboardLayout>
      <div className="page-container space-y-6">
        <PageHeader
          title="Workflows"
          description={`${WORKFLOWS.filter(w => w.published).length}/${WORKFLOWS.length} workflows actifs`}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['Collecte', 'Infrastructure', 'IA', 'Analyse', 'Rapports'].map(cat => (
            <Card key={cat}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xl font-semibold tabular-nums">{WORKFLOWS.filter(w => w.category === cat).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(w => (
            <Card key={w.id} className="flex flex-col">
              <CardContent className="pt-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{w.name}</h3>
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-md font-medium ${CAT_COLORS[w.category]}`}>
                      {w.category}
                    </span>
                  </div>
                  <Badge variant={w.published ? 'success' : 'default'}>
                    {w.published ? 'Actif' : 'Brouillon'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{w.description}</p>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex-1 min-w-0">
                    {w.schedule && <span className="text-xs text-muted-foreground">{w.schedule}</span>}
                    {w.endpoint && <span className="text-xs text-muted-foreground font-mono truncate block">{w.endpoint}</span>}
                    {!w.schedule && !w.endpoint && <span className="text-xs text-muted-foreground">Déclenchement manuel</span>}
                  </div>
                  {w.endpoint && (
                    <Button variant="outline" size="sm" onClick={() => copy(w.endpoint!, w.id)}>
                      {copiedId === w.id ? 'Copié' : 'Copier'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Endpoints webhook</CardTitle>
            <p className="text-xs text-muted-foreground">URLs à appeler depuis votre frontend Next.js</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Workflow</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Méthode</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {WORKFLOWS.filter(w => w.endpoint).map(w => (
                  <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{w.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="primary" className="font-mono">POST</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {w.endpoint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
