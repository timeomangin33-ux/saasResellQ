'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, RefreshCw, Check, Trash2, Loader2, BellDot } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Magnetic } from '@/components/ui/magnetic'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  info: 'Info',
  alert: 'Alerte',
  deal: 'Deal',
  opportunity: 'Opportunité',
  trend: 'Tendance',
  report: 'Rapport',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function fetchNotifications() {
    const res = await fetch('/api/notifications')
    if (!res.ok) throw new Error('Impossible de charger vos notifications.')
    const data = await res.json()
    return data.notifications ?? []
  }

  async function refresh() {
    setRefreshing(true)
    setError(null)
    try {
      setNotifications(await fetchNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        setNotifications(await fetchNotifications())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function markRead(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      if (!res.ok) throw new Error('Échec de la mise à jour.')
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setBusyId(null)
    }
  }

  async function del(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression.')
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setBusyId(null)
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <PageHeader
            title="Notifications"
            kicker="Centre de notifications"
            icon={Bell}
            description="Toutes vos alertes, deals et signaux, en un seul endroit."
            actions={
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <motion.span
                    className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    {unread}
                  </motion.span>
                )}
                <Magnetic strength={0.2}>
                  <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
                  </button>
                </Magnetic>
                <Magnetic strength={0.2}>
                  <Link
                    href="/alertes"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    <BellDot className="w-3.5 h-3.5" /> Gérer les alertes
                  </Link>
                </Magnetic>
              </div>
            }
          />

          <div className="space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="panel p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-muted/40 rounded w-1/3" />
                  <div className="h-3 bg-muted/40 rounded w-2/3" />
                </div>
              ))
            ) : error ? (
              <div className="panel px-5 py-12 text-center text-sm text-red-400">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="panel px-5 py-12 text-center text-sm text-muted-foreground">
                Aucune notification pour le moment.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                    className={`panel mb-2 flex items-start gap-4 px-5 py-4 transition ${n.read ? 'opacity-60' : ''}`}
                  >
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          disabled={busyId === n.id}
                          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition disabled:opacity-60"
                        >
                          {busyId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => del(n.id)}
                        disabled={busyId === n.id}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition disabled:opacity-60"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
