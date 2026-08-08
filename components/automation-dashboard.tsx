'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Zap, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface AutomationStatus {
  automationEnabled: boolean
  queues: {
    automation: number
    productSync: number
    analysis: number
    watchlist: number
  }
  config: {
    enabled: boolean
    autoCreateWatchlist: boolean
    autoAnalyze: boolean
    autoNotify: boolean
    minProfitMargin: number
    maxRiskLevel: string
    checkInterval: number
  }
  recentJobs: any[]
}

export function AutomationDashboard() {
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Refresh every 5s
    return () => clearInterval(interval)
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
    setTriggering(true)
    try {
      const res = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType,
          payload: { limit: 100 },
        }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`✅ ${result.type} job queued: ${result.jobId}`)
        fetchStatus()
      } else {
        alert('❌ Failed to trigger job')
      }
    } catch (error) {
      console.error('Failed to trigger job:', error)
    } finally {
      setTriggering(false)
    }
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
      {/* Main Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Automation Hub
            </CardTitle>
            <CardDescription>Gestion des jobs d&apos;automation et synchronisation</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Activé</span>
              <Switch checked={status?.config.enabled ?? false} onCheckedChange={toggleAutomation} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Queue Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Automation</div>
              <div className="text-2xl font-bold">{status?.queues.automation || 0}</div>
              <div className="text-xs text-slate-500 mt-1">jobs en attente</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Sync Produits</div>
              <div className="text-2xl font-bold">{status?.queues.productSync || 0}</div>
              <div className="text-xs text-slate-500 mt-1">syncs planifiés</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Analyses</div>
              <div className="text-2xl font-bold">{status?.queues.analysis || 0}</div>
              <div className="text-xs text-slate-500 mt-1">produits à analyser</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Watchlists</div>
              <div className="text-2xl font-bold">{status?.queues.watchlist || 0}</div>
              <div className="text-xs text-slate-500 mt-1">à créer</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Actions rapides</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerJob('sync-products')}
                disabled={triggering}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Produits
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerJob('analyze-products')}
                disabled={triggering}
              >
                <Zap className="w-4 h-4 mr-2" />
                Analyser
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerJob('create-watchlist')}
                disabled={triggering}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Watchlist Auto
              </Button>

              <Button size="sm" variant="outline" onClick={fetchStatus} disabled={triggering}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold">Configuration</h3>
            <div className="space-y-1 text-sm text-slate-400">
              <div>
                ✓ Marge min profit:{' '}
                <span className="text-white font-semibold">{status?.config.minProfitMargin}%</span>
              </div>
              <div>
                ✓ Niveau risque max:{' '}
                <span className="text-white font-semibold">{status?.config.maxRiskLevel}</span>
              </div>
              <div>
                ✓ Intervalle check:{' '}
                <span className="text-white font-semibold">
                  {status?.config.checkInterval ? Math.round(status.config.checkInterval / 60) + ' min' : 'N/A'}
                </span>
              </div>
              <div>
                ✓ Auto-watchlist:{' '}
                <span className="text-white font-semibold">
                  {status?.config.autoCreateWatchlist ? '✅' : '❌'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
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
                    <div className="font-medium">{job.jobType}</div>
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
