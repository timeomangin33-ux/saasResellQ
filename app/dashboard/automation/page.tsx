'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { AutomationDashboard } from '@/components/automation-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { PageHeader } from '@/components/ui/page-header'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8 space-y-8">
        <PageHeader
          title="Automation & Intelligence Artificielle"
          kicker="IA"
          icon={Bot}
          description="Gérez vos agents IA et l'automation 100% automatique des catégories, produits et watchlists"
        />

        {/* Main Automation Dashboard */}
        <Reveal><AutomationDashboard /></Reveal>

        {/* Info Cards */}
        <StaggerGroup className="grid md:grid-cols-2 gap-6">
          <motion.div variants={staggerItem}>
          <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
          <Card className="bg-gradient-to-br from-emerald-950/30 to-slate-950 border-emerald-900/30 transition-colors hover:border-emerald-400/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>🤖</span> Agents IA Actifs
              </CardTitle>
              <CardDescription>10 agents d'automatisation en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <div>✓ Chat Assistant (GPT-4o)</div>
              <div>✓ Product Analyzer (scoring profitabilité)</div>
              <div>✓ Category Analyzer (tendances marché)</div>
              <div>✓ Deal Finder (meilleures affaires)</div>
              <div>✓ Opportunity Finder (marges élevées)</div>
              <div>✓ Trend Analyzer (analyse tendances)</div>
              <div>✓ Report Generator (rapports HTML)</div>
              <div>✓ RAG Search (recherche sémantique)</div>
              <div>✓ Memory Agent (contexte persistant)</div>
              <div>✓ Notification Agent (alertes)</div>
            </CardContent>
          </Card>
          </SpotlightCard>
          </motion.div>

          <motion.div variants={staggerItem}>
          <SpotlightCard spotlightColor="rgba(45,212,191,0.14)">
          <Card className="bg-gradient-to-br from-teal-950/30 to-slate-950 border-teal-900/30 transition-colors hover:border-teal-400/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>⚙️</span> Tâches Automatisées
              </CardTitle>
              <CardDescription>Exécution 100% sans intervention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <div>✓ Sync produits Vinted (toutes les 4h)</div>
              <div>✓ Analyse profitabilité (en temps réel)</div>
              <div>✓ Remplissage automatique des catégories</div>
              <div>✓ Création de watchlists par tendance</div>
              <div>✓ Notifications alertes profit</div>
              <div>✓ Génération rapports marché</div>
              <div>✓ Scoring de risque produits</div>
              <div>✓ Indexation RAG (embeddings)</div>
              <div>✓ Cache données catégories</div>
              <div>✓ Nettoyage données expirées</div>
            </CardContent>
          </Card>
          </SpotlightCard>
          </motion.div>
        </StaggerGroup>

        {/* How It Works */}
        <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
        <Reveal>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">💡 Comment fonctionne l'automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="space-y-2">
              <h4 className="font-semibold text-white">1️⃣ Collection de données</h4>
              <p className="text-slate-400">
                Les agents automatisés scrapent Vinted toutes les 4 heures et remplissent automatiquement les catégories, 
                prix, marques et conditions avec l'IA
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white">2️⃣ Analyse & Scoring</h4>
              <p className="text-slate-400">
                Chaque produit est analysé par GPT-4o pour calculer la marge bénéficiaire, 
                le potentiel de profit et le niveau de risque
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white">3️⃣ Auto-Watchlists</h4>
              <p className="text-slate-400">
                Les watchlists sont créées automatiquement basées sur les tendances de marché, 
                catégories en croissance et marges d'intérêt
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white">4️⃣ Notifications Intelligentes</h4>
              <p className="text-slate-400">
                Recevez des alertes en temps réel quand une opportunité de profit {'>'} 25% 
                apparaît, traitée par l'IA pour éviter les faux positifs
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white">5️⃣ Rapports Générés</h4>
              <p className="text-slate-400">
                Des rapports HTML/JSON sont générés automatiquement chaque jour avec 
                les meilleures opportunités, tendances et insights
              </p>
            </div>
          </CardContent>
        </Card>
        </Reveal>
        </SpotlightCard>
      </div>
    </DashboardLayout>
  )
}
