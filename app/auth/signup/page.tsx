'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PLAN_FEATURES } from '@/lib/constants'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue')
      } else {
        // Account is auto-verified in the backend; redirect with success flag
        router.push('/auth/signin?verified=1')
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Créer un compte ResellQ"
      subtitle="Gratuit, sans carte bancaire. Accédez aux données du marché en lecture dès l'inscription."
    >
      <div className="space-y-5 mb-6">
        <div className="panel p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Compte gratuit, sans carte bancaire.</p>
          <p className="mt-2">Vous accédez immédiatement aux données du marché en lecture : top produits, catégories et tendances. Les veilles, alertes, analyses IA et rapports nécessitent un forfait.</p>
        </div>

        <div className="space-y-1.5">
          {PLAN_FEATURES.slice(0, 3).map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nom complet</label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jean Dupont"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>



            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                'Créer un compte gratuit'
              )}
            </Button>

            <p className="mt-3 text-xs text-center text-muted-foreground">
              Aucune carte bancaire demandée. Vous choisissez un forfait seulement si vous en voulez un.
            </p>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/cgv" className="text-primary hover:underline">CGV</Link>
            {' '}et notre{' '}
            <Link href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
