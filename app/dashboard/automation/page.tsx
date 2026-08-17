'use client'

import { AutomationDashboard } from '@/components/automation-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { PageHeader } from '@/components/ui/page-header'
import { motion } from 'framer-motion'
import { Bot, Radar, Sparkles, BellRing, Mail, Search, ListChecks } from 'lucide-react'

export default function AutomationPage() {
  return (
    <div className="page-container py-8 space-y-8">
      <PageHeader
        title="Automation"
        kicker="En continu"
        icon={Bot}
        description="Ce qui tourne réellement en arrière-plan pour garder vos données à jour, sans que vous ayez à y penser."
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
              <Radar className="h-4 w-4 text-emerald-400" /> Scan de marché
            </CardTitle>
            <CardDescription>Une fois par jour, sur vos catégories principales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2"><Search className="h-3.5 w-3.5 text-emerald-400/70" /> Scan des annonces Vinted par catégorie</div>
            <div className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5 text-emerald-400/70" /> Prix moyen, médian et volume actualisés</div>
            <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-emerald-400/70" /> Score IA par produit (marge, risque, recommandation)</div>
          </CardContent>
        </Card>
        </SpotlightCard>
        </motion.div>

        <motion.div variants={staggerItem}>
        <SpotlightCard spotlightColor="rgba(45,212,191,0.14)">
        <Card className="bg-gradient-to-br from-teal-950/30 to-slate-950 border-teal-900/30 transition-colors hover:border-teal-400/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-teal-300" /> Alertes
            </CardTitle>
            <CardDescription>Évaluées à chaque scan de marché</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2"><BellRing className="h-3.5 w-3.5 text-teal-300/70" /> Vos seuils comparés aux données fraîches</div>
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-teal-300/70" /> Notification dans l'app, email si activé</div>
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
          <CardTitle className="text-base">Comment ça marche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <div className="space-y-2">
            <h4 className="font-semibold text-white">1. Scan des catégories</h4>
            <p className="text-slate-400">
              Une fois par jour, ResellQ scanne Vinted sur vos catégories suivies et enregistre les annonces trouvées : prix, marque, état.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">2. Scoring IA</h4>
            <p className="text-slate-400">
              Chaque lot d'annonces scannées est analysé pour estimer une marge de revente, un score d'opportunité et un niveau de risque.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">3. Évaluation des alertes</h4>
            <p className="text-slate-400">
              Vos seuils configurés (marge, baisse de prix, pic de demande) sont comparés aux données fraîches à chaque scan.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-white">4. Notification</h4>
            <p className="text-slate-400">
              Une alerte déclenchée crée une notification dans l'app, et un email si vous l'avez activé dans vos paramètres.
            </p>
          </div>
        </CardContent>
      </Card>
      </Reveal>
      </SpotlightCard>
    </div>
  )
}
