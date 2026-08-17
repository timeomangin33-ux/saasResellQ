import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

const footerLinks = [
  { href: '/cgv', label: 'CGV' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/payment', label: 'Abonnement' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#04070b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            ResellQ
          </div>
          <p className="text-sm leading-7 text-slate-400">
            Une plateforme premium pour analyser les opportunités Vinted, prioriser les deals et gagner en marge sans perdre de temps. Support 24h direct.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-3 text-sm text-slate-400">
            {footerLinks.map(link => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Ouvrir un compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  )
}

