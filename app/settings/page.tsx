'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Sliders, Eye, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import VintedConnectModal from '@/app/components/VintedConnectModal'

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark')
  const [aiModel, setAiModel] = useState('gpt-4')
  const [saved, setSaved] = useState(false)

  const savePreferences = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <PageHeader title="Paramètres" description="Personnalisez votre expérience ResellQ" />

        <div className="space-y-6">
          {saved ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Préférences enregistrées.
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sliders className="w-4 h-4 text-muted-foreground" />
                Paramètres généraux
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Thème</label>
                <select value={theme} onChange={(e) => { setTheme(e.target.value); savePreferences() }} className="input-field">
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="auto">Automatique</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Langue</label>
                <select className="input-field" onChange={savePreferences}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 text-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base text-white">Connectez Vinted en un clic</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              <div className="space-y-3">
                <p className="text-sm text-slate-200">Analysez automatiquement vos ventes, suivez les performances et prenez des décisions rapides sans complication.</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Connexion directe via navigateur, sans mot de passe stocké</li>
                  <li>• Synchronisation sécurisée de vos annonces et ventes</li>
                  <li>• Statistiques personnelles dans votre tableau de bord</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <VintedConnectModal />
                <Button variant="outline" size="sm" className="text-white border-white/30 hover:border-white hover:bg-white/10" onClick={() => window.location.href = '/vinted-dashboard'}>Accéder au tableau de bord</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Préférences IA
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Modèle IA</label>
                <select value={aiModel} onChange={(e) => { setAiModel(e.target.value); savePreferences() }} className="input-field">
                  <option value="gpt-4">GPT-4o (Recommandé)</option>
                  <option value="gpt-3.5">GPT-3.5 (Plus rapide)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Niveau de détail</label>
                <select className="input-field" onChange={savePreferences}>
                  <option value="short">Court</option>
                  <option value="medium">Moyen</option>
                  <option value="detailed">Détaillé</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-foreground">Suggestions automatiques</span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
