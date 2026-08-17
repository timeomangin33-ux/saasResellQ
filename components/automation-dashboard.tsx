'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Zap, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

interface AutomationStatus {
  automationEnabled: boolean
  lastRunByType: Record<string, string | null>
  config: {
    enabled: boolean
    autoCreateWatchlist: boolean
    autoAnalyze: boolean
    autoNotify: boolean
    minProfitMargin: number
    maxRiskLevel: string
  }
  recentJobs: any[]
}

const JOB_LABELS: Record<string, string> = {
  'sync-products': 'Scan des annonces',
  'analyze-products': 'Scoring IA',
  'create-watchlist': 'Watchlists auto',
  'notify-user': 'Notification',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Jamais exécuté'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

export function AutomationDashboard() {
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/automation/status')
      if (res.ok) {
        setStatus(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch automation status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function triggerJob(jobType: string) {
    setTriggering(jobType)
    setLastMessage(null)
    try {
      const res = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, payload: {} }),
      })

      const data = await res.json()
      if (res.ok) {
        setLastMessage({ type: 'success', text: summarizeResult(jobType, data.result) })
        fetchStatus()
      } else {
        setLastMessage({ type: 'error', text: data.error || "Échec de l'exécution." })
      }
    } catch (error) {
      setLastMessage({ type: 'error', text: 'Erreur réseau.' })
    } finally {
      setTriggering(null)
    }
  }

  function summarizeResult(jobType: string, result: any) {
    if (!result) return `${JOB_LABELS[jobType]} : terminé.`
    if (jobType === 'sync-products') return `${result.synced} annonce(s) scannée(s) sur ${result.categoriesScanned} catégorie(s).`
    if (jobType === 'analyze-products') return result.analyzed > 0 ? `${result.analyzed} produit(s) analysé(s).` : (result.message || 'Rien à analyser.')
    if (jobType === 'create-watchlist') return result.created > 0 ? `${result.created} watchlist(s) créée(s).` : (result.message || 'Aucune nouvelle watchlist.')
    return 'Terminé.'
  }

  async function toggleAutomation() {
    try {
      const enabled = !status?.config.enabled
      const res = await fetch('/api/automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (res.ok) {
        fetchStatus()
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Automation
            </CardTitle>
            <CardDescription>Scan de marché automatique et actions manuelles</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Scan quotidien activé</span>
            <Switch checked={status?.config.enabled ?? false} onCheckedChange={toggleAutomation} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Actions manuelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => triggerJob('sync-products')} disabled={triggering !== null}>
                {triggering === 'sync-products' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Scanner Vinted maintenant
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerJob('analyze-products')} disabled={triggering !== null}>
                {triggering === 'analyze-products' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Analyser les produits
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerJob('create-watchlist')} disabled={triggering !== null}>
                {triggering === 'create-watchlist' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Créer des watchlists tendance
              </Button>
            </div>
            {lastMessage && (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${lastMessage.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                {lastMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                {lastMessage.text}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold">Dernière exécution</h3>
            <div className="space-y-1 text-sm text-slate-400">
              {Object.entries(JOB_LABELS).filter(([type]) => type !== 'notify-user').map(([type, label]) => (
                <div key={type} className="flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-white font-medium">{timeAgo(status?.lastRunByType[type] ?? null)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {status?.recentJobs && status.recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs récents</CardTitle>
            <CardDescription>Historique des 10 derniers jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded border border-slate-800">
                  <div>
                    <div className="font-medium">{JOB_LABELS[job.jobType] || job.jobType}</div>
                    <div className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        job.status === 'completed'
                          ? 'bg-green-900/30 text-green-400'
                          : job.status === 'failed'
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
