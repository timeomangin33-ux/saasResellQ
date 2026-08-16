'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { BellDot, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <div className="rounded-[32px] border border-white/10 bg-[#111116] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 text-sm text-violet-300">
            <BellDot className="h-5 w-5" />
            <span>Alertes marché</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Alertes intelligentes</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Configurez des seuils et recevez des notifications dès qu';un produit répond à vos critères de marge, de marque ou de prix.</p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Alerte par marque</h2>
              <p className="mt-2 text-sm text-slate-400">Recevez un signal quand une marque Premium redevient disponible à prix attractif.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Alerte marge</h2>
              <p className="mt-2 text-sm text-slate-400">Paramétrez un seuil de marge minimale et soyez alerté quand une opportunité le dépasse.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Alertes critiques</h2>
              <p className="mt-2 text-sm text-slate-400">Soyez averti dès qu';un produit rare ou très demandé apparaît dans une catégorie prioritaire.</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Aucune alerte active</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Votre tableau d';alertes est prêt.</h2>
            <p className="mt-2 text-sm text-slate-400">Créez votre première alerte pour suivre les signaux de marge, de prix et de demande.</p>
            <div className="mt-6 inline-flex rounded-full bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
              <Link href="/dashboard">Configurer une alerte</Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
