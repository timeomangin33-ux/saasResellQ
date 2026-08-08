'use client'

import Link from 'next/link'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { type PlanKey } from '@/lib/plans'

const PLAN_RANK = { FREE: 0, STARTER: 1, PRO: 2, BUSINESS: 3 } as const
const MINIMUM_LABEL: Record<keyof typeof PLAN_RANK, string> = {
  FREE: 'Découverte',
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

export function hasMinimumPlan(planKey: PlanKey, minimumPlan: keyof typeof PLAN_RANK) {
  return PLAN_RANK[planKey] >= PLAN_RANK[minimumPlan]
}

export function PlanGate({
  planKey,
  minimumPlan,
  feature,
  children,
}: {
  planKey: PlanKey
  minimumPlan: keyof typeof PLAN_RANK
  feature: string
  children: React.ReactNode
}) {
  if (hasMinimumPlan(planKey, minimumPlan)) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-500/10 text-violet-200">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-white">{feature} est réservé au forfait {MINIMUM_LABEL[minimumPlan]}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400">
        Passez au forfait {MINIMUM_LABEL[minimumPlan]} pour débloquer cette fonctionnalité, obtenir plus de crédits IA et accéder à des analyses avancées.
      </p>
      <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <Link href="/pricing">Découvrir le forfait {MINIMUM_LABEL[minimumPlan]}</Link>
      </div>
    </div>
  )
}
