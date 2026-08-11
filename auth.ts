import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { z } from 'zod'
import { createVerificationToken, sendVerificationEmail } from '@/lib/email'

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
        console.info('[auth] authorize() called')
        console.info('[auth] email present:', !!credentials?.email)
        console.info('[auth] password present:', !!credentials?.password)

        try {
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) {
            console.info('[auth] credentials validation failed')
            return null
          }

          const normalizedEmail = parsed.data.email.trim().toLowerCase()

          try {
            await prisma.$queryRaw`SELECT 1`
            console.info('[auth] prisma ping ok')
          } catch (error) {
            console.error('[auth] prisma ping failed:', {
              name: error instanceof Error ? error.name : 'UnknownError',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
            throw error
          }

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          })

          console.info('[auth] user found:', !!user)
          console.info('[auth] user.password present:', !!user?.password)

          if (!user || !user.password) return null

          const passwordMatches = await bcrypt.compare(parsed.data.password, user.password)
          console.info('[auth] bcrypt.compare result:', passwordMatches)
          if (!passwordMatches) return null

          if (!user.emailVerifiedAt) {
            const token = await createVerificationToken({ userId: user.id, type: 'verify' })
            await sendVerificationEmail(user.email, token, 'verify')
            throw new Error('EMAIL_NOT_VERIFIED')
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
        } catch (error) {
          console.error('[auth] authorize error:', {
            name: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.subscriptionStatus = (user as any).subscriptionStatus
        token.subscriptionPlan = (user as any).subscriptionPlan
        token.subscriptionEnd = (user as any).subscriptionEnd
        token.emailVerifiedAt = (user as any).emailVerifiedAt
        token.twoFactorEnabled = (user as any).twoFactorEnabled
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
