'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0d0f0e]/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-[90px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <PageHeader
            title="API & intégrations"
            kicker="Développeurs"
            icon={Code}
            description="Documentation légère pour connecter ResellQ à vos flux, webhooks et automations."
          />
          <p className="relative mt-3 text-sm text-slate-400">Utilisez ces endpoints pour synchroniser votre flux de produits, générer des analyses rapides et automatiser vos veilles.</p>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <Reveal className="panel panel-hover p-6">
              <div className="flex items-center gap-3 text-emerald-300 text-sm font-semibold uppercase tracking-[0.24em]"><Code className="h-4 w-4" />Endpoints standards</div>
              <div className="mt-6 space-y-4">
                {endpoints.map((endpoint, index) => (
                  <motion.div
                    key={endpoint.path}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    whileHover={{ x: 4 }}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-emerald-400/25"
                  >
                    <p className="font-mono text-sm font-medium text-white">{endpoint.path}</p>
                    <p className="mt-2 text-sm text-slate-400">{endpoint.description}</p>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <Reveal delay={0.1} className="panel panel-hover p-6">
              <div className="flex items-center gap-3 text-emerald-300 text-sm font-semibold uppercase tracking-[0.24em]"><ServerCog className="h-4 w-4" />Intégrations</div>
              <div className="mt-6 space-y-4 text-sm text-slate-400">
                <p>ResellQ se connecte à votre pipeline via des API internes et des webhooks directs. Les flux de produits et de catégories sont actualisés selon votre configuration.</p>
                <p>Pour les projets avancés, utilisez les endpoints ResellQ dans votre solution d'automatisation ou votre orchestrateur préféré.</p>
                <p className="text-white">Contactez notre support pour une intégration sur-mesure et l'accès aux endpoints privés.</p>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <LinkIcon className="h-4 w-4 text-emerald-300" />
                <span>Exemples de réservations et webhooks disponibles sur demande.</span>
              </div>
            </Reveal>
          </SpotlightCard>
        </div>
      </div>
    </DashboardLayout>
  )
}
