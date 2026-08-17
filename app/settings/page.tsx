'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Sliders, Eye, CheckCircle2, Loader2, AlertCircle, User, Lock, BellRing, ShieldAlert, Trash2, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  emailDealAlerts: boolean
  emailWeeklyReport: boolean
  emailProductUpdates: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  language: 'fr',
  aiModel: 'gpt-4',
  detailLevel: 'medium',
  autoSuggest: true,
  emailDealAlerts: true,
  emailWeeklyReport: true,
  emailProductUpdates: false,
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const [showVintedModal, setShowVintedModal] = useState(false)
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  async function handleDeleteAccount() {
    setDeleteError('')
    if (deleteConfirmText !== 'SUPPRIMER') {
      setDeleteError('Tape SUPPRIMER pour confirmer.')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'SUPPRIMER' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Échec de la suppression.')
      }
      await signOut({ callbackUrl: '/' })
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur inconnue.')
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <PageHeader title="Paramètres" kicker="Espace de travail" icon={Sliders} description="Gérez votre compte, vos préférences et votre confidentialité" />

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

            {/* Compte */}
            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nom</label>
                      <Input value={session?.user?.name || ''} disabled className="opacity-60" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input value={session?.user?.email || ''} disabled className="opacity-60" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.02] px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground">Nom, mot de passe et sécurité</p>
                      <p className="text-xs text-muted-foreground">Modifiables depuis votre profil.</p>
                    </div>
                    <Magnetic strength={0.15}>
                      <Link href="/profile" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-foreground transition hover:border-emerald-400/40">
                        <Lock className="h-3.5 w-3.5" /> Ouvrir le profil
                      </Link>
                    </Magnetic>
                  </div>
                </CardContent>
              </Card>
              </Reveal>
            </SpotlightCard>

            {/* Général */}
            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal delay={0.03}>
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

            {/* Vinted */}
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
                  <Magnetic strength={0.15}>
                    <Button className="btn-shine w-full sm:w-auto" onClick={() => setShowVintedModal(true)}>
                      <Link2 className="mr-1.5 h-4 w-4" /> Connecter mon compte Vinted
                    </Button>
                  </Magnetic>
                  <Magnetic strength={0.15}>
                    <Button variant="outline" size="sm" className="text-white border-white/30 hover:border-white hover:bg-white/10" onClick={() => window.location.href = '/vinted-dashboard'}>Accéder au tableau de bord</Button>
                  </Magnetic>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {showVintedModal && <VintedConnectModal onClose={() => setShowVintedModal(false)} redirectTo="/settings" />}
            </AnimatePresence>

            {/* Préférences IA */}
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

            {/* Notifications */}
            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal delay={0.07}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BellRing className="w-4 h-4 text-muted-foreground" />
                    Notifications par email
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">Alertes de deals</p>
                      <p className="text-xs text-muted-foreground">Recevez un email quand une opportunité forte marge est détectée.</p>
                    </div>
                    <Toggle checked={prefs.emailDealAlerts} onChange={(v) => updatePreference('emailDealAlerts', v)} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">Rapport hebdomadaire</p>
                      <p className="text-xs text-muted-foreground">Résumé de votre activité et des tendances marché chaque semaine.</p>
                    </div>
                    <Toggle checked={prefs.emailWeeklyReport} onChange={(v) => updatePreference('emailWeeklyReport', v)} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">Nouveautés produit</p>
                      <p className="text-xs text-muted-foreground">Annonces de nouvelles fonctionnalités ResellQ.</p>
                    </div>
                    <Toggle checked={prefs.emailProductUpdates} onChange={(v) => updatePreference('emailProductUpdates', v)} />
                  </div>
                </CardContent>
              </Card>
              </Reveal>
            </SpotlightCard>

            {/* Zone dangereuse */}
            <Reveal delay={0.1}>
              <Card className="border-red-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-300">
                    <ShieldAlert className="w-4 h-4" />
                    Zone dangereuse
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/[.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
                      <p className="text-xs text-muted-foreground">Action irréversible. Résilie votre abonnement et supprime définitivement toutes vos données.</p>
                    </div>
                    <Button variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={() => setShowDeleteForm((v) => !v)}>
                      {showDeleteForm ? 'Annuler' : 'Supprimer mon compte'}
                    </Button>
                  </div>

                  {showDeleteForm && (
                    <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/[.04] p-4">
                      <p className="text-sm text-zinc-300">Tape <span className="font-mono font-semibold text-red-300">SUPPRIMER</span> pour confirmer la suppression définitive de ton compte.</p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="SUPPRIMER"
                      />
                      {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
                      <Button
                        variant="outline"
                        disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
                        className="border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                        onClick={handleDeleteAccount}
                      >
                        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Supprimer définitivement
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
