'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { motion } from 'framer-motion'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { LifeBuoy, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function SupportPage() {
  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f0e] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex items-center gap-3 text-sm text-emerald-300">
            <LifeBuoy className="h-5 w-5" />
            <span>Support</span>
          </div>
          <h1 className="relative mt-4 text-3xl font-semibold tracking-tight text-white">Support ResellQ</h1>
          <p className="relative mt-3 max-w-2xl text-sm text-slate-400">Besoin d'aide pour configurer votre SaaS premium ou optimiser vos veilles ? Nous sommes là pour vous.</p>

          <div className="relative mt-10 grid gap-4 lg:grid-cols-3">
            <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
              <Reveal className="panel panel-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">Contact</h2>
                <p className="mt-2 text-sm text-slate-400">contact@resellq.com</p>
              </Reveal>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
              <Reveal delay={0.08} className="panel panel-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">Sécurité</h2>
                <p className="mt-2 text-sm text-slate-400">Assistance sur données, confidentialité et authentification.</p>
              </Reveal>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(34,211,238,0.14)">
              <Reveal delay={0.16} className="panel panel-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">FAQ</h2>
                <p className="mt-2 text-sm text-slate-400">Retrouvez les réponses aux questions les plus courantes.</p>
              </Reveal>
            </SpotlightCard>
          </div>

          <Reveal delay={0.1} className="relative mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Service premium</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Support business disponible</h2>
            <p className="mt-2 text-sm text-slate-400">Nous vous aidons à faire de ResellQ votre centre d'analyse Vinted, sans compromis sur le sérieux.</p>
            <Magnetic strength={0.15} className="mt-6 inline-block">
              <Link href="mailto:contact@resellq.com" className="btn-shine inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                Envoyer un message
              </Link>
            </Magnetic>
          </Reveal>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
