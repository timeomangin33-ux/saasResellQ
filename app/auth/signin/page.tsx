'use client'

import type { FormEvent } from 'react'
import { Suspense, useEffect, useState } from 'react'
import { getCsrfToken, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'


function SignInPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const verified = searchParams.get('verified')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [csrfToken, setCsrfToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void getCsrfToken().then((token) => {
      if (token) {
        setCsrfToken(token as string)
      }
    })
  }, [])

  const authenticate = async (emailValue: string, passwordValue: string) => {
    const token = csrfToken || (await getCsrfToken())
    const result = await signIn('credentials', {
      email: emailValue,
      password: passwordValue,
      csrfToken: token,
      type: 'credentials',
      redirect: false,
    })

    if (result?.error) {
      if (result.error === 'EMAIL_NOT_VERIFIED') {
        throw new Error('Veuillez vérifier votre adresse email. Un nouveau lien vient d’être envoyé.')
      }
      throw new Error('bad credentials')
    }

    router.replace(callbackUrl)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authenticate(email, password)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace ResellQ">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
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
                  placeholder="••••••••"
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

            {verified === '1' && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                Adresse email vérifiée avec succès. Vous pouvez maintenant vous connecter.
              </p>
            )}

            {verified === '0' && (
              <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                Le lien de vérification est invalide ou a expiré. Un nouveau lien peut être envoyé lors de votre prochaine connexion.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>

          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthLayout title="Connexion" subtitle="Accédez à votre espace ResellQ"><Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Chargement...</p></CardContent></Card></AuthLayout>}>
      <SignInPageContent />
    </Suspense>
  )
}
