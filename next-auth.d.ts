declare module 'next-auth/react' {
  export interface SignInResponse {
    error?: string | null
    status?: number
    ok?: boolean
    url?: string | null
  }

  export function signIn(
    provider?: string | undefined,
    options?: Record<string, unknown>,
    authorizationParams?: Record<string, unknown>
  ): Promise<SignInResponse | undefined>
  export function signOut(options?: Record<string, unknown>): Promise<void>
  export function useSession(): {
    data: any
    status: 'authenticated' | 'unauthenticated' | 'loading'
  }
  export function getCsrfToken(options?: Record<string, unknown>): Promise<string | null>
  export function getProviders(): Promise<Record<string, any> | null>
  export function getSession(): Promise<any>
  export const SessionProvider: React.ComponentType<{ children: React.ReactNode }>
}

declare module 'next-auth' {
  function NextAuth(options: any): any
  export default NextAuth

  export interface User {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    subscriptionStatus?: string
    subscriptionPlan?: string
  }

  export interface Session {
    user?: User
    expires: string
  }

  export interface JWT {
    id?: string
    role?: string
    subscriptionStatus?: string
    subscriptionPlan?: string
  }
}

declare module 'next-auth/providers/*' {
  const provider: any
  export default provider
}

declare module 'next-auth/providers/credentials' {
  const CredentialsProvider: (options: any) => any
  export default CredentialsProvider
}

declare module 'next-auth/jwt' {
  export interface JWT {
    sub?: string
    role?: string
    subscriptionStatus?: string
    subscriptionPlan?: string
    [key: string]: unknown
  }

  export function getToken(options: {
    req: unknown
    secret?: string
    secureCookie?: boolean
  }): Promise<JWT | null>
}
