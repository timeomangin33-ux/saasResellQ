'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorMessage, setTwoFactorMessage] = useState('')
  const [twoFactorError, setTwoFactorError] = useState('')
  const planLabel = session?.user?.subscriptionPlan ? session.user.subscriptionPlan.toLowerCase() : 'standard'
  const isActive = session?.user?.subscriptionStatus === 'ACTIVE'
  const emailVerified = Boolean((session?.user as any)?.emailVerifiedAt)
  const twoFactorEnabled = Boolean((session?.user as any)?.twoFactorEnabled)

  const handleEnable2FA = async () => {
    setTwoFactorLoading(true)
    setTwoFactorError('')
    setTwoFactorMessage('')

    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d’envoyer le code.')
      }
      setTwoFactorMessage(data.message || 'Un code a été envoyé à votre email.')
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const handleConfirm2FA = async () => {
    if (!twoFactorCode.trim()) {
      setTwoFactorError('Saisissez le code reçu par email')
      return
    }

    setTwoFactorLoading(true)
    setTwoFactorError('')
    setTwoFactorMessage('')

    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Code invalide')
      }
      setTwoFactorMessage(data.message || 'Authentification à deux facteurs activée.')
      setTwoFactorCode('')
      window.location.reload()
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setTwoFactorLoading(false)
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
          <Card className="border border-white/10 bg-[#111116] text-white">
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
                    Votre compte est <span className="font-semibold text-white">{isActive ? 'actif' : 'en attente d’activation'}</span> sur ResellQ.
                  </div>

                  <div className={`rounded-2xl border px-4 py-3 text-sm ${emailVerified ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                    <p className="font-medium">{emailVerified ? 'Adresse email vérifiée' : 'Vérification email requise'}</p>
                    <p className="mt-1 text-xs">{emailVerified ? 'Votre email est validé pour l’accès au tableau de bord.' : 'Un email de vérification a été envoyé lors de votre inscription. Utilisez le lien envoyé pour confirmer votre compte.'}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Button variant="outline" className="w-full justify-start">Changer le mot de passe</Button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Authentification à deux facteurs</p>
                    <p className="text-xs text-zinc-400">{twoFactorEnabled ? 'Activée via code envoyé par email.' : 'Activez une vérification supplémentaire à chaque connexion.'}</p>
                  </div>
                  <Badge variant={twoFactorEnabled ? 'success' : 'default'}>{twoFactorEnabled ? 'Activée' : 'Désactivée'}</Badge>
                </div>

                {!twoFactorEnabled ? (
                  <>
                    <Button variant="outline" className="w-full justify-start" onClick={handleEnable2FA} disabled={twoFactorLoading}>
                      {twoFactorLoading ? 'Envoi du code…' : 'Envoyer un code de validation'}
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value)}
                      placeholder="Code à 6 chiffres"
                      className="w-full"
                    />
                    <Button variant="default" className="w-full" onClick={handleConfirm2FA} disabled={twoFactorLoading}>
                      {twoFactorLoading ? 'Vérification…' : 'Valider l’activation'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-emerald-300">La sécurité renforcée est déjà active sur votre compte.</p>
                )}

                {twoFactorMessage && <p className="text-sm text-emerald-300">{twoFactorMessage}</p>}
                {twoFactorError && <p className="text-sm text-red-400">{twoFactorError}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                Préférences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Mode sombre</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Notifications par email</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
