'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Bell, Plus, Trash2, RefreshCw, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'opportunity' | 'trend' | 'alert' | 'report'
  read: boolean
  createdAt: string
}

interface Alert {
  id: string
  category: string
  condition: string
  threshold: number
  active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  opportunity: 'Opportunité',
  trend: 'Tendance',
  alert: 'Alerte',
  report: 'Rapport',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'notifications' | 'alerts'>('notifications')
  const [newAlert, setNewAlert] = useState({ category: '', condition: 'profit_margin', threshold: 40 })

  useEffect(() => {
    setTimeout(() => {
      setNotifications([
        { id: '1', title: 'Nouvelle opportunité détectée', message: 'Nike Air Jordan 1 sous-évalué de 40 % — marge estimée : 85 €', type: 'opportunity', read: false, createdAt: new Date().toISOString() },
        { id: '2', title: 'Tendance haussière', message: 'Le segment des sacs de luxe progresse de +52 % cette semaine', type: 'trend', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', title: 'Rapport hebdomadaire disponible', message: 'Votre rapport du 20/06/2026 est prêt', type: 'report', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
      ])
      setAlerts([
        { id: '1', category: 'Chaussures', condition: 'profit_margin', threshold: 40, active: true },
        { id: '2', category: 'Electronique', condition: 'price_drop', threshold: 30, active: true },
      ])
      setLoading(false)
    }, 400)
  }, [])

  async function checkForNew() {
    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        title: 'Vérification locale terminée',
        message: 'Le système a analysé vos alertes en local.',
        type: 'alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  const markRead = (id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  const del = (id: string) => setNotifications(p => p.filter(n => n.id !== id))
  const addAlert = () => {
    if (!newAlert.category) return
    setAlerts(p => [...p, { id: Date.now().toString(), ...newAlert, active: true }])
    setNewAlert({ category: '', condition: 'profit_margin', threshold: 40 })
  }
  const removeAlert = (id: string) => setAlerts(p => p.filter(a => a.id !== id))
  const unread = notifications.filter(n => !n.read).length

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                Notifications
                {unread > 0 && <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">{unread}</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Alertes et notifications de l';agent IA</p>
            </div>
            <button onClick={checkForNew} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition">
              <RefreshCw className="w-3.5 h-3.5" /> Vérifier
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border">
            {[
              { id: 'notifications', label: `Notifications${unread > 0 ? ` (${unread})` : ''}` },
              { id: 'alerts', label: 'Mes alertes' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'notifications' && (
            <div className="space-y-2">
              {loading ? [...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-muted/40 rounded w-1/3" />
                  <div className="h-3 bg-muted/40 rounded w-2/3" />
                </div>
              )) : notifications.length === 0 ? (
                <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground">
                  Aucune notification pour le moment.
                </div>
              ) : notifications.map(n => (
                <div key={n.id} className={`bg-card border rounded-xl px-5 py-4 flex items-start gap-4 transition ${n.read ? 'border-border/40 opacity-60' : 'border-border'}`}>
                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{TYPE_LABELS[n.type]}</span>
                    </div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => del(n.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-5">
              {/* Créer une alerte */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Nouvelle alerte</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input value={newAlert.category} onChange={e => setNewAlert({ ...newAlert, category: e.target.value })}
                    placeholder="Catégorie (ex : Chaussures)"
                    className="px-3 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none placeholder:text-muted-foreground" />
                  <select value={newAlert.condition} onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none">
                    <option value="profit_margin">Marge bénéficiaire</option>
                    <option value="price_drop">Baisse de prix</option>
                    <option value="demand_spike">Pic de demande</option>
                  </select>
                  <div className="flex gap-2">
                    <input type="number" value={newAlert.threshold} onChange={e => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                      placeholder="Seuil (%)"
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none" />
                    <button onClick={addAlert}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition">
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste alertes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-sm font-medium">Alertes configurées</p>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune alerte configurée.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {alerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium">{alert.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.condition === 'profit_margin' ? 'Marge bénéficiaire' : alert.condition === 'price_drop' ? 'Baisse de prix' : 'Pic de demande'} — seuil {alert.threshold}%
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.active ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                            {alert.active ? 'Actif' : 'Inactif'}
                          </span>
                          <button onClick={() => removeAlert(alert.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

