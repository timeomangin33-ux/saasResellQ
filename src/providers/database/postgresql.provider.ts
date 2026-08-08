import { prisma } from '@/prisma'

export const PostgreSQLProvider = {
  getClient() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL non configurée')
    }
    return prisma
  },
}
