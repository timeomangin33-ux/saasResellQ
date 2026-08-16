'use client'

import { useState } from 'react'

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
  { id: 'U3McPbngZ0FoGaOq', name: 'Vinted Scraper', published: true, schedule: 'Toutes les 4h', description: 'Scrape les 14 catégories Vinted, calcule les scores IA et maintient le Top 20.', category: 'Collecte' },
  { id: 'es6ikrJgjjqmhOcP', name: 'Setup Data Tables', published: true, description: 'Initialise les tables de données locales.', category: 'Infrastructure' },
  { id: 'BWa9LVp8UNkihXl5', name: 'PostgreSQL Schema Setup', published: true, description: 'Crée les tables PostgreSQL (mémoire, RAG, rapports, historique chat).', category: 'Infrastructure' },
  { id: '6wIPeheYSlA57yR1', name: 'RAG Indexer', published: true, schedule: 'Toutes les 6h', description: 'Génère les embeddings OpenAI et les indexe dans pgvector.', category: 'IA' },
  { id: '1HKzZaiaSzj8U53x', name: 'RAG Search', published: true, endpoint: '/webhook/resellq-rag-search', description: 'Recherche sémantique dans pgvector.', category: 'IA' },
  { id: 'i6fYAcqniM6fSKd1', name: 'Memory Manager', published: true, endpoint: '/webhook/resellq-memory', description: 'Sauvegarde la mémoire à long terme des sessions dans PostgreSQL.', category: 'IA' },
  { id: 'MrKjgfpRHInHkMbK', name: 'AI Chat Endpoint', published: true, endpoint: '/webhook/resellq-ai-chat', description: 'Point d\'entrée principal du chat IA. GPT-4o avec mémoire PostgreSQL.', category: 'IA' },
  { id: '0ffwRxXCKZL8zj7k', name: 'AI Router', published: true, endpoint: '/webhook/resellq-chat', description: 'Routeur IA avec 7 outils et fallback Groq.', category: 'IA' },
  { id: 'ZZ2Wa9Rpek9DksM2', name: 'Product Analyzer', published: true, endpoint: '/webhook/resellq-analyze-product', description: 'Analyse détaillée d\'un produit : tendance, score de revente.', category: 'Analyse' },
  { id: '0DJZ2ckcXG6qK1AL', name: 'Category Analyzer', published: true, endpoint: '/webhook/resellq-analyze-category', description: 'Analyse une catégorie Vinted : croissance, concurrence, prix moyen.', category: 'Analyse' },
  { id: 'zYPtVhnZPkM5MdlT', name: 'Opportunity Finder', published: true, endpoint: '/webhook/resellq-opportunities', description: 'Détecte les opportunités de revente à forte marge.', category: 'Analyse' },
  { id: 'h6K62ESUniZ4e1qP', name: 'Deal Finder', published: true, endpoint: '/webhook/resellq-deals', description: 'Trouve les meilleures affaires du moment.', category: 'Analyse' },
  { id: '23nv17HoXt5Hpwhu', name: 'Trend Analyzer', published: true, endpoint: '/webhook/resellq-trends', description: 'Analyse les tendances du marché : catégories en hausse, marques populaires.', category: 'Analyse' },
  { id: 'cCr0zHwMpoj24eOi', name: 'Report Generator', published: true, endpoint: '/webhook/resellq-report', description: 'Génère un rapport de marché complet en HTML ou JSON.', category: 'Rapports' },
  { id: 'y5gCuIPzcoTELrtX', name: 'Notification Agent', published: true, endpoint: '/webhook/resellq-notify', description: 'Envoie des alertes par e-mail et dans l\'application pour les opportunités détectées.', category: 'Notifications' },
]

const CATEGORIES = ['Tous', 'Collecte', 'Infrastructure', 'IA', 'Analyse', 'Rapports', 'Notifications']

const CAT_COLORS: Record<string, string> = {
  Collecte: 'bg-blue-100 text-blue-700',
  Infrastructure: 'bg-gray-100 text-gray-600',
  IA: 'bg-purple-100 text-purple-700',
  Analyse: 'bg-orange-100 text-orange-700',
  Rapports: 'bg-green-100 text-green-700',
  Notifications: 'bg-yellow-100 text-yellow-700',
}

export default function WorkflowsPage() {
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = activeCategory === 'Tous' ? WORKFLOWS : WORKFLOWS.filter(w => w.category === activeCategory)

  const copy = (endpoint: string, id: string) => {
    navigator.clipboard.writeText(endpoint)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workflows</h1>
        <p className="text-gray-500 mt-1">{WORKFLOWS.filter(w => w.published).length}/{WORKFLOWS.length} workflows actifs</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['Collecte','Infrastructure','IA','Analyse','Rapports'].map(cat => (
          <div key={cat} className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold">{WORKFLOWS.filter(w => w.category === cat).length}</div>
            <div className="text-xs text-gray-500 mt-1">{cat}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(w => (
          <div key={w.id} className="bg-white rounded-xl border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{w.name}</h3>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[w.category]}`}>{w.category}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${w.published ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-xs font-medium ${w.published ? 'text-green-600' : 'text-gray-400'}`}>{w.published ? 'Actif' : 'Brouillon'}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{w.description}</p>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="flex-1 min-w-0">
                {w.schedule && <span className="text-xs text-blue-600 font-medium">⏱ {w.schedule}</span>}
                {w.endpoint && <span className="text-xs text-gray-400 font-mono truncate block">{w.endpoint}</span>}
                {!w.schedule && !w.endpoint && <span className="text-xs text-gray-400">Déclenchement manuel</span>}
              </div>
              {w.endpoint && (
                <button onClick={() => copy(w.endpoint!, w.id)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0">
                  {copiedId === w.id ? '✓ Copie' : 'Copier URL'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Endpoints webhook</h2>
          <p className="text-sm text-gray-500 mt-0.5">URLs à appeler depuis Next.js</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Workflow</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Methode</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {WORKFLOWS.filter(w => w.endpoint).map(w => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{w.name}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-bold">POST</span></td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{w.endpoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
