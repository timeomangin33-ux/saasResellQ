'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Lock, Loader2, Mail, ShieldCheck, User } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const planLabel = session?.user?.subscriptionPlan ? session.user.subscriptionPlan.toLowerCase() : 'standard'
  const isActive = session?.user?.subscriptionStatus === 'ACTIVE'
  const twoFactorEnabled = false

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordState, setPasswordState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [passwordError, setPasswordError] = useState('')

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    setPasswordState('saving')
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec de la mise à jour.')
      setPasswordState('saved')
      setPasswordForm({ current: '', next: '', confirm: '' })
      window.setTimeout(() => { setPasswordState('idle'); setShowPasswordForm(false) }, 1800)
    } catch (e) {
      setPasswordState('error')
      setPasswordError(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <PageHeader
          title="Profil"
          description="Gérez votre compte et vos informations"
          actions={
            <Badge variant={isActive ? 'success' : 'default'}>
              {isActive ? `Abonnement ${planLabel} actif` : 'Compte standard'}
            </Badge>
          }
        />

        <div className="space-y-6">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
            <Reveal as="div">
            <Card className="border border-white/10 bg-[#0d0f0e] text-white">
              <CardHeader>
                <CardTitle className="text-base">Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Nom
                  </label>
                  <Input type="text" value={session?.user?.name || ''} disabled className="opacity-60" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </label>
                  <Input type="email" value={session?.user?.email || ''} disabled className="opacity-60" />
                </div>

                {status === 'loading' ? (
                  <p className="text-sm text-zinc-400">Chargement du profil…</p>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                      Votre compte est <span className="font-semibold text-white">{isActive ? 'actif' : 'en attente d\'activation'}</span> sur ResellQ.
                    </div>

                    <div className="rounded-2xl border px-4 py-3 text-sm border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <p className="font-medium">Adresse email vérifiée</p>
                      <p className="mt-1 text-xs">Votre adresse email est considérée comme vérifiée pour l'accès au tableau de bord.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </Reveal>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
            <Reveal as="div" delay={0.06}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowPasswordForm((v) => !v)}>
                  {showPasswordForm ? 'Annuler' : 'Changer le mot de passe'}
                </Button>

                <AnimatePresence>
                  {showPasswordForm && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleChangePassword}
                      className="space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <Input type="password" placeholder="Mot de passe actuel" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} required />
                      <Input type="password" placeholder="Nouveau mot de passe (8 caractères min.)" value={passwordForm.next} onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} required minLength={8} />
                      <Input type="password" placeholder="Confirmer le nouveau mot de passe" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} required minLength={8} />
                      {passwordState === 'error' && (
                        <p className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="h-3.5 w-3.5" /> {passwordError}</p>
                      )}
                      {passwordState === 'saved' && (
                        <p className="flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Mot de passe mis à jour.</p>
                      )}
                      <Button type="submit" disabled={passwordState === 'saving'} className="w-full">
                        {passwordState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmer'}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Authentification à deux facteurs</p>
                      <p className="text-xs text-zinc-400">{twoFactorEnabled ? 'Activée via code envoyé par email.' : 'Activez une vérification supplémentaire à chaque connexion.'}</p>
                    </div>
                    <Badge variant={twoFactorEnabled ? 'success' : 'default'}>{twoFactorEnabled ? 'Activée' : 'Désactivée'}</Badge>
                  </div>

                  <p className="text-sm text-zinc-400">La vérification à deux facteurs est temporairement désactivée.</p>
                </div>
              </CardContent>
            </Card>
            </Reveal>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
            <Reveal as="div" delay={0.12}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  Préférences
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-zinc-400">Gérez la langue, l'assistant IA et vos préférences depuis la page{' '}
                  <Link href="/settings" className="text-primary hover:underline">Paramètres</Link>.
                </p>
              </CardContent>
            </Card>
            </Reveal>
          </SpotlightCard>
        </div>
      </div>
    </DashboardLayout>
  )
}
