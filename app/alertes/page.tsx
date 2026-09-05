'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { IntegrationsNotice } from '@/components/integrations-notice'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { BellDot, Plus, Trash2, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { VINTED_CATEGORIES } from '@/vinted'

interface AlertRule {
  id: string
  category: string
  /**
   * `condition` reste une chaîne libre côté lecture : la base contient encore
   * des alertes « profit_margin », une condition retirée parce qu'elle ne
   * pouvait jamais se déclencher. Les afficher telles quelles vaut mieux que
   * les faire disparaître de la liste sans explication.
   */
  condition: string
  threshold: number
  active: boolean
}

/** Une catégorie réellement suivie, telle que la collecte la nomme en base. */
interface CategorieSuivie {
  name: string
  history_days: number
  confidence: string
}

interface TriggeredSignal {
  id: string
  title: string
  message: string
  createdAt: string
}

const CONDITION_LABELS: Record<string, string> = {
  profit_margin: 'Marge bénéficiaire (condition retirée)',
  price_drop: 'Baisse du prix demandé',
  demand_spike: 'Pic de demande',
}

/** Ce que chaque condition compare, dit dans les mots de la donnée réelle. */
const CONDITION_EXPLICATIONS: Record<string, string> = {
  price_drop:
    "Se déclenche quand le prix demandé médian de la catégorie recule d'au moins ce pourcentage d'un relevé à l'autre.",
  demand_spike:
    "Se déclenche quand le nombre d'annonces en ligne dans la catégorie augmente d'au moins ce pourcentage d'un relevé à l'autre.",
}

export default function AlertesPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [signals, setSignals] = useState<TriggeredSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [categoriesSuivies, setCategoriesSuivies] = useState<CategorieSuivie[]>([])
  const [form, setForm] = useState<{ category: string; condition: string; threshold: string }>({
    category: '',
    condition: 'price_drop',
    threshold: '10',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [alertsRes, notifRes] = await Promise.all([
          fetch('/api/alerts'),
          fetch('/api/notifications'),
        ])
        if (!alertsRes.ok) throw new Error('Impossible de charger vos alertes.')
        const alertsData = await alertsRes.json()
        const notifData = notifRes.ok ? await notifRes.json().catch(() => ({})) : {}
        setAlerts(alertsData.alerts ?? [])
        setSignals(
          (notifData.notifications ?? []).filter((n: { type: string }) => n.type === 'alert' || n.type === 'deal')
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /**
   * Les catégories proposées viennent de la collecte, pas d'une saisie libre.
   *
   * Le champ était un champ texte : le cron cherche la catégorie par son nom
   * exact dans `CategoryMarket` et passe son tour sans rien dire dès qu'il ne la
   * trouve pas. « chaussure », « Chaussures  » ou « Sneakers » donnaient une
   * alerte enregistrée, affichée active, et muette à vie.
   */
  useEffect(() => {
    let monte = true
    async function chargerCategories() {
      try {
        const res = await fetch('/api/vinted/top-categories')
        if (!res.ok) throw new Error('indisponible')
        const data = await res.json()
        const liste: CategorieSuivie[] = (data.categories ?? []).map((c: Record<string, unknown>) => ({
          name: String(c.name),
          history_days: Number(c.history_days ?? 0),
          confidence: String(c.confidence ?? 'insuffisant'),
        }))
        if (monte && liste.length > 0) setCategoriesSuivies(liste)
      } catch {
        // Repli sur la liste de référence : mieux vaut une liste fermée que la
        // saisie libre qui a créé le problème.
        if (monte) {
          setCategoriesSuivies(
            VINTED_CATEGORIES.map((c) => ({ name: c.name, history_days: 0, confidence: 'insuffisant' })),
          )
        }
      }
    }
    void chargerCategories()
    return () => {
      monte = false
    }
  }, [])

  const categorieChoisie = categoriesSuivies.find((c) => c.name === form.category) ?? null
  const conditionHistorique = form.condition === 'price_drop' || form.condition === 'demand_spike'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.category.trim()) {
      setFormError('Choisissez une catégorie suivie dans la liste.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category.trim(),
          condition: form.condition,
          threshold: Number(form.threshold) || 0,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec de la création.')
      setAlerts((prev) => [data.alert, ...prev])
      setForm({ category: '', condition: 'price_drop', threshold: '10' })
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(alert: AlertRule) {
    setBusyId(alert.id)
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !alert.active }),
      })
      if (!res.ok) throw new Error('Échec de la mise à jour.')
      const data = await res.json()
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? data.alert : a)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAlert(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression.')
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <PageHeader
          title="Alertes"
          kicker="Signaux de marché"
          icon={BellDot}
          description="Configurez des seuils par catégorie et soyez notifié dès qu'une opportunité les dépasse."
          actions={
            <Magnetic strength={0.2}>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-shine inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-emerald-400 to-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Annuler' : 'Nouvelle alerte'}
            </button>
            </Magnetic>
          }
        />

        <IntegrationsNotice cles={['Envoi des e-mails']} />

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="panel mt-6 overflow-hidden p-6"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Choisir une catégorie suivie</option>
                  {categoriesSuivies.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                  className="input-field"
                >
                  <option value="price_drop">Baisse du prix demandé</option>
                  <option value="demand_spike">Pic de demande</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                    placeholder="Seuil (%)"
                    className="input-field flex-1"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-shine rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{CONDITION_EXPLICATIONS[form.condition]}</p>

              {/* Ces deux conditions se comparent à un historique de relevés. Sur
                  une catégorie suivie depuis un ou deux jours, la comparaison
                  n'existe pas encore : l'alerte est bien enregistrée mais elle
                  restera muette quelques jours, et le dire ici évite de le
                  laisser découvrir par le silence. */}
              {conditionHistorique && categorieChoisie && (
                <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                  {categorieChoisie.confidence === 'confirme'
                    ? `« ${categorieChoisie.name} » compte ${categorieChoisie.history_days} jour(s) de relevés : cette alerte peut se déclencher dès le prochain passage du robot.`
                    : `« ${categorieChoisie.name} » ne compte que ${categorieChoisie.history_days} jour(s) de relevés. Cette alerte compare deux périodes : elle sera enregistrée maintenant et commencera à surveiller dès que la catégorie aura assez d'historique — comptez quelques jours.`}
                </p>
              )}

              {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
            </motion.form>
          )}
        </AnimatePresence>

        {loading && (
          <div className="mt-8 flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && error && <div className="panel mt-6 p-6 text-sm text-red-400">{error}</div>}

        {!loading && !error && (
          <>
            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)" className="mt-8 panel overflow-hidden">
              <div className="border-b border-border px-5 py-3.5">
                <p className="text-sm font-medium">Alertes configurées</p>
              </div>
              {alerts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aucune alerte configurée. Créez-en une pour être notifié dès qu'un seuil est atteint.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{alert.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {CONDITION_LABELS[alert.condition] ?? alert.condition} — seuil {alert.threshold}%
                        </p>
                        {alert.condition === 'profit_margin' && (
                          <p className="mt-0.5 text-xs text-amber-300/80">
                            Cette condition ne peut pas se déclencher : la marge moyenne par catégorie n'est pas
                            mesurée. L'alerte a été désactivée, vous pouvez la supprimer.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Une alerte « marge » ne peut pas être réactivée :
                            elle serait aussitôt remise hors service par le cron. */}
                        <button
                          onClick={() => toggleActive(alert)}
                          disabled={busyId === alert.id || alert.condition === 'profit_margin'}
                          title={alert.condition === 'profit_margin' ? 'Condition retirée : cette alerte ne peut plus être activée.' : undefined}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium transition disabled:opacity-60 ${alert.active ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}
                        >
                          {alert.active ? 'Actif' : 'Inactif'}
                        </button>
                        <button
                          onClick={() => removeAlert(alert.id)}
                          disabled={busyId === alert.id}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition disabled:opacity-60"
                        >
                          {busyId === alert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(16,185,129,0.1)" className="mt-6 panel overflow-hidden">
              <div className="border-b border-border px-5 py-3.5">
                <p className="text-sm font-medium">Signaux déclenchés récemment</p>
              </div>
              {signals.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aucun signal déclenché pour le moment. Retrouvez tout l'historique dans les{' '}
                  <Link href="/notifications" className="text-primary hover:underline">notifications</Link>.
                </div>
              ) : (
                signals.map((s) => (
                  <div key={s.id} className="border-b border-border px-5 py-3.5 last:border-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                ))
              )}
            </SpotlightCard>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
