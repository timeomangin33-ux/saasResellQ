'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Sliders, Eye, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import VintedConnectModal from '@/app/components/VintedConnectModal'

interface Preferences {
  language: 'fr' | 'en' | 'de'
  aiModel: 'gpt-4' | 'gpt-3.5'
  detailLevel: 'short' | 'medium' | 'detailed'
  autoSuggest: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  language: 'fr',
  aiModel: 'gpt-4',
  detailLevel: 'medium',
  autoSuggest: true,
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : { preferences: {} }))
      .then((data) => setPrefs((prev) => ({ ...prev, ...data.preferences })))
      .finally(() => setLoading(false))
  }, [])

  async function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1800)
    } catch {
      setSaveState('error')
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <PageHeader title="Paramètres" kicker="Espace de travail" icon={Sliders} description="Personnalisez votre expérience ResellQ" />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {saveState === 'saved' && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> Préférences enregistrées.
              </div>
            )}
            {saveState === 'error' && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4" /> Échec de l'enregistrement, réessayez.
              </div>
            )}

            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sliders className="w-4 h-4 text-muted-foreground" />
                    Paramètres généraux
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Langue</label>
                    <select
                      value={prefs.language}
                      onChange={(e) => updatePreference('language', e.target.value as Preferences['language'])}
                      className="input-field"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                    <p className="text-xs text-muted-foreground">L'interface reste en français pour le moment ; cette préférence sera appliquée aux prochaines fonctionnalités multilingues.</p>
                  </div>
                </CardContent>
              </Card>
              </Reveal>
            </SpotlightCard>

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
                  <Magnetic strength={0.15}>
                    <Button variant="outline" size="sm" className="text-white border-white/30 hover:border-white hover:bg-white/10" onClick={() => window.location.href = '/vinted-dashboard'}>Accéder au tableau de bord</Button>
                  </Magnetic>
                </div>
              </CardContent>
            </Card>

            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal delay={0.05}>
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
                    <select
                      value={prefs.aiModel}
                      onChange={(e) => updatePreference('aiModel', e.target.value as Preferences['aiModel'])}
                      className="input-field"
                    >
                      <option value="gpt-4">GPT-4o (Recommandé)</option>
                      <option value="gpt-3.5">GPT-3.5 (Plus rapide)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Niveau de détail</label>
                    <select
                      value={prefs.detailLevel}
                      onChange={(e) => updatePreference('detailLevel', e.target.value as Preferences['detailLevel'])}
                      className="input-field"
                    >
                      <option value="short">Court</option>
                      <option value="medium">Moyen</option>
                      <option value="detailed">Détaillé</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.autoSuggest}
                      onChange={(e) => updatePreference('autoSuggest', e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground">Suggestions automatiques</span>
                  </label>
                </CardContent>
              </Card>
              </Reveal>
            </SpotlightCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
