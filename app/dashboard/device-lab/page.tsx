'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Compass, LockKeyhole, MonitorSmartphone, ShieldCheck, Sparkles } from 'lucide-react'

const ROADMAP = [
  {
    title: 'Environnements virtuels isolés',
    description: 'Appareils Android/iOS sandboxés pour tester vos flux Vinted sans risque sur vos comptes réels.',
    icon: MonitorSmartphone,
  },
  {
    title: 'Sessions partagées en équipe',
    description: "Ouvrez une session, invitez un collaborateur, suivez l'activité en direct.",
    icon: Sparkles,
  },
  {
    title: 'Permissions granulaires',
    description: 'Contrôlez précisément quels accès (API, stockage, réseau) chaque environnement peut utiliser.',
    icon: ShieldCheck,
  },
]

export default function DeviceLabPage() {
  const { data: session, status } = useSession()
  const business = session?.user?.subscriptionPlan === 'BUSINESS'

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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <p className="kicker">Business workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Device Lab</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Cette fonctionnalité est en cours de construction. Voici ce qui arrive pour votre forfait Business.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
          <Compass className="h-3.5 w-3.5" /> Bêta — bientôt disponible
        </div>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {ROADMAP.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="panel panel-hover p-6"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
              <item.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 panel p-6">
        <p className="text-sm font-medium text-white">Une idée précise pour Device Lab ?</p>
        <p className="mt-2 text-sm text-zinc-400">Écrivez-nous depuis le support pour orienter les prochaines fonctionnalités livrées sur votre forfait Business.</p>
        <Link href="/support" className="mt-4 inline-flex text-xs font-semibold text-violet-200">Contacter le support →</Link>
      </div>
    </div>
  )
}
