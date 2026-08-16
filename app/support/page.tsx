'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { LifeBuoy, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function SupportPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <div className="rounded-[32px] border border-white/10 bg-[#111116] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 text-sm text-violet-300">
            <LifeBuoy className="h-5 w-5" />
            <span>Support</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Support ResellQ</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Besoin d\'aide pour configurer votre SaaS premium ou optimiser vos veilles ? Nous sommes là pour vous.</p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-200">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Contact</h2>
              <p className="mt-2 text-sm text-slate-400">contact@resellq.com</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Sécurité</h2>
              <p className="mt-2 text-sm text-slate-400">Assistance sur données, confidentialité et authentification.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">FAQ</h2>
              <p className="mt-2 text-sm text-slate-400">Retrouvez les réponses aux questions les plus courantes.</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Service premium</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Support business disponible</h2>
            <p className="mt-2 text-sm text-slate-400">Nous vous aidons à faire de ResellQ votre centre d\'analyse Vinted, sans compromis sur le sérieux.</p>
            <div className="mt-6 inline-flex rounded-full bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
              <Link href="mailto:contact@resellq.com">Envoyer un message</Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
