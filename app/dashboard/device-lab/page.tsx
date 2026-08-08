'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { LockKeyhole, Play, Plus, ShieldCheck, Smartphone, Wifi } from 'lucide-react'

const ENVIRONMENTS = [
  {
    id: 'sandbox-01',
    name: 'Sandbox 01',
    description: 'Environnement Android 14 isolé pour tester vos flux Vinted.',
    status: 'Prêt',
    coverage: 'Appareil virtuel, réseau privé, permissions REST',
  },
  {
    id: 'sandbox-02',
    name: 'Sandbox 02',
    description: 'Environnement iOS simulé pour validation de navigation.',
    status: 'Préparé',
    coverage: 'Capture d’écran, journaux de session, accès restreint',
  },
  {
    id: 'sandbox-03',
    name: 'Sandbox 03',
    description: 'Environnement web sécurisé pour tests de tableau de bord et API.',
    status: 'Disponible',
    coverage: 'Sessions live, proxy isolé, données chiffrées',
  },
]

const TABS = ['Dashboard', 'Logs', 'Sessions', 'Permissions'] as const

type TabName = (typeof TABS)[number]

export default function DeviceLabPage() {
  const { data: session, status } = useSession()
  const business = session?.user?.subscriptionPlan === 'BUSINESS'
  const [selectedEnvId, setSelectedEnvId] = useState(ENVIRONMENTS[0].id)
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard')
  const selectedEnv = useMemo(
    () => ENVIRONMENTS.find((env) => env.id === selectedEnvId) ?? ENVIRONMENTS[0],
    [selectedEnvId],
  )

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#09090b]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-200">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">Device Lab est réservé au forfait Business</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">Un espace sécurisé pour administrer vos environnements de test virtuels et vos autorisations.</p>
        <Link href="/pricing" className="mt-6 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950">
          Découvrir Business
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Business workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Device Lab</h1>
          <p className="mt-2 text-sm text-zinc-400">Gérez vos environnements virtuels, vos sessions et vos permissions d’accès.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm shadow-white/5">
          <Plus className="h-4 w-4" /> Nouvel environnement
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6 rounded-[28px] border border-white/[.08] bg-[#111116] p-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Environnement actif</p>
                    <p className="mt-1 text-xs text-zinc-400">Visualisez et testez un appareil comme si vous étiez en session.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">{selectedEnv.status}</span>
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-lg font-semibold text-white">{selectedEnv.name}</p>
                  <p className="text-sm text-zinc-400">{selectedEnv.description}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`rounded-3xl border px-4 py-4 text-left text-sm transition ${env.id === selectedEnvId ? 'border-violet-400/40 bg-violet-400/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <p className="font-semibold text-white">{env.name}</p>
                    <p className="mt-2 text-xs text-zinc-400">{env.coverage}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Détails de l’infrastructure</p>
                  <p className="mt-1 text-xs text-zinc-500">Passez rapidement en revue les composants connectés.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
                  <Play className="h-3.5 w-3.5" /> Ouvrir session
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <StatusRow icon={Smartphone} title="OS" value="Android 14" />
                <StatusRow icon={Wifi} title="Réseau" value="Isolé" />
                <StatusRow icon={ShieldCheck} title="Permissions" value="Auditées" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#09090f] p-5">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-violet-300 text-zinc-950' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950 p-5">
              {activeTab === 'Dashboard' && (
                <div className="space-y-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between gap-4 rounded-3xl bg-white/5 px-4 py-3">
                    <p className="font-medium text-white">État de synthèse</p>
                    <span className="text-xs text-emerald-300">OK</span>
                  </div>
                  <p>Les sessions sont prêtes. Aucune erreur critique détectée.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatItem label="Sessions actives" value="2" />
                    <StatItem label="Actions en file" value="1" />
                  </div>
                </div>
              )}
              {activeTab === 'Logs' && (
                <div className="space-y-3 text-sm text-zinc-300">
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="font-medium text-white">Flux de logs</p>
                    <p className="mt-2 text-xs text-zinc-500">Dernière activité : 2 min</p>
                  </div>
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-3xl bg-[#040507] p-4 text-xs text-zinc-400">Connexion virtuelle initialisée
Session Android 14 prête
Synchronisation du navigateur en cours...</pre>
                </div>
              )}
              {activeTab === 'Sessions' && (
                <div className="space-y-4 text-sm text-zinc-300">
                  <SessionRow label="Sandbox 01" status="En ligne" />
                  <SessionRow label="Sandbox 02" status="En attente" />
                  <SessionRow label="Sandbox 03" status="Disponible" />
                </div>
              )}
              {activeTab === 'Permissions' && (
                <div className="space-y-4 text-sm text-zinc-300">
                  <PermissionRow label="Accès API" detail="Crédits gérés" />
                  <PermissionRow label="Accès navigateur" detail="Autorisé" />
                  <PermissionRow label="Accès stockage" detail="Limité" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-[28px] border border-white/[.08] bg-[#111116] p-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-medium text-white">Usage responsable</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Construisez et testez uniquement des flux qui respectent vos autorisations.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-white">Prochaines étapes</p>
            <ul className="mt-4 space-y-3 text-sm text-zinc-400">
              <li>1. Connectez un fournisseur d’appareils virtuels.</li>
              <li>2. Lancez une session de test ciblée.</li>
              <li>3. Exportez les logs ou récupérez les captures d’écran.</li>
            </ul>
            <Link href="/settings" className="mt-5 inline-flex text-xs font-semibold text-violet-200">Configurer l’infrastructure →</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatusRow({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white/5 px-4 py-3">
      <span className="rounded-2xl bg-white/10 p-2 text-zinc-300"><Icon className="h-4 w-4" /></span>
      <div>
        <p className="text-xs font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-zinc-400">{value}</p>
      </div>
    </div>
  )
}

function SessionRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="rounded-3xl bg-[#09090f] p-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="mt-1 text-xs text-zinc-400">Statut : {status}</p>
    </div>
  )
}

function PermissionRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-3xl bg-[#09090f] p-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="mt-1 text-xs text-zinc-400">{detail}</p>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#09090f] p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
