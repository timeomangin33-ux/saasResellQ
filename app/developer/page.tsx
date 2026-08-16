'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Code, ServerCog, Link as LinkIcon } from 'lucide-react'

const endpoints = [
  { path: '/api/vinted/top-categories', description: 'Top catégories Vinted synchronisées.' },
  { path: '/api/vinted/top-products', description: 'Top produits Vinted prioritaires.' },
  { path: '/api/ai/opportunities', description: 'Optimisation IA des opportunités.' },
  { path: '/api/ai/product-analyzer', description: 'Analyse produit basée IA.' },
]

export default function DeveloperPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-[#0f172a]/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <PageHeader
            title="API & intégrations"
            description="Documentation légère pour connecter ResellQ à vos flux, webhooks et automations."
          />
          <p className="mt-3 text-sm text-slate-400">Utilisez ces endpoints pour synchroniser votre flux de produits, générer des analyses rapides et automatiser vos veilles.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#111116] p-6">
            <div className="flex items-center gap-3 text-violet-300 text-sm font-semibold uppercase tracking-[0.24em]"><Code className="h-4 w-4" />Endpoints standards</div>
            <div className="mt-6 space-y-4">
              {endpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">{endpoint.path}</p>
                  <p className="mt-2 text-sm text-slate-400">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111116] p-6">
            <div className="flex items-center gap-3 text-violet-300 text-sm font-semibold uppercase tracking-[0.24em]"><ServerCog className="h-4 w-4" />Intégrations</div>
            <div className="mt-6 space-y-4 text-sm text-slate-400">
              <p>ResellQ se connecte à votre pipeline via des API internes et des webhooks directs. Les flux de produits et de catégories sont actualisés selon votre configuration.</p>
              <p>Pour les projets avancés, utilisez les endpoints ResellQ-* dans votre solution d\'automatisation ou votre orchestrateur préféré.</p>
              <p className="text-white">Contactez notre support pour une intégration sur-mesure et l\'accès aux endpoints privés.</p>
            </div>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 flex items-center gap-3 text-sm text-slate-300">
              <LinkIcon className="h-4 w-4 text-violet-300" />
              <span>Exemples de réservations et webhooks disponibles sur demande.</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
