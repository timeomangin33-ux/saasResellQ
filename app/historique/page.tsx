'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Clock3, Archive, History } from 'lucide-react'

export default function HistoryPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <div className="rounded-[32px] border border-white/10 bg-[#111116] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 text-sm text-violet-300">
            <Clock3 className="h-5 w-5" />
            <span>Historique</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Suivi des analyses</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Retrouvez l&apos;historique de vos analyses, exportations et décisions prises dans ResellQ.</p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {['Analyse produit', 'Veille catégorie', 'Rapport exporté'].map((item, index) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-700 text-slate-200">
                  <Archive className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{item}</h2>
                <p className="mt-2 text-sm text-slate-400">Consultation rapide des actions passées et des opportunités déjà évaluées.</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <History className="mx-auto h-10 w-10 text-violet-300" />
            <h2 className="mt-4 text-2xl font-semibold text-white">Aucun historique chargé</h2>
            <p className="mt-2 text-sm text-slate-400">Votre activité sera listée ici dès que vous aurez lancé des analyses ou exporté des rapports.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
