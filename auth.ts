import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { z } from 'zod'
// Email/2FA flows temporarily disabled: do not send verification emails

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Enforce NEXTAUTH_SECRET presence in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be set in production')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret' : undefined),
  session: { strategy: 'jwt' },
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        try {
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) return null

          const normalizedEmail = parsed.data.email.trim().toLowerCase()

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          })

          if (!user || !user.password) return null

          const isValid = await bcrypt.compare(parsed.data.password, user.password)
          if (!isValid) return null

          if (!user.emailVerifiedAt) {
            // Mark user as verified until email flow is re-enabled
            try {
              await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
              user.emailVerifiedAt = new Date()
            } catch (e) {
              // ignore failures here; allow login to proceed
              console.warn('[auth] failed to mark email as verified:', e)
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan,
            emailVerifiedAt: user.emailVerifiedAt,
            twoFactorEnabled: user.twoFactorEnabled,
          }
        } catch (err: any) {
          // Log the error server-side to help debugging in Vercel logs
          console.error('[NextAuth][Credentials][authorize] error:', err?.message || err)
          // Re-throw known verification flow to be handled by client
          if (err?.message === 'EMAIL_NOT_VERIFIED') throw err
          // For other errors, surface a generic server error to the client
          throw new Error('SERVER_AUTH_ERROR')
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
      }
      // Re-read subscription/role state from the DB on every request instead of
      // only at sign-in, so a Stripe webhook (or an admin fix) takes effect
      // immediately without forcing the user to log out and back in.
      if (token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            subscriptionStatus: true,
            subscriptionPlan: true,
            subscriptionEnd: true,
            emailVerifiedAt: true,
            twoFactorEnabled: true,
          },
        })
        if (fresh) {
          token.role = fresh.role
          token.subscriptionStatus = fresh.subscriptionStatus
          token.subscriptionPlan = fresh.subscriptionPlan
          token.subscriptionEnd = fresh.subscriptionEnd
          token.emailVerifiedAt = fresh.emailVerifiedAt
          token.twoFactorEnabled = fresh.twoFactorEnabled
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).subscriptionStatus = token.subscriptionStatus
        ;(session.user as any).subscriptionPlan = token.subscriptionPlan
        ;(session.user as any).subscriptionEnd = token.subscriptionEnd
        ;(session.user as any).emailVerifiedAt = token.emailVerifiedAt
        ;(session.user as any).twoFactorEnabled = token.twoFactorEnabled
      }
      return session
    },
  },
})
