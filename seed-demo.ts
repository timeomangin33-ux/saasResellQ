import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nextMonthlyReset } from './lib/plans'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let value = match[2].trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

const prisma = new PrismaClient()

const demoAccounts = [
  {
    email: 'demo-starter@resellq.com',
    name: 'Demo Starter',
    password: 'StarterDemo123!',
    subscriptionPlan: 'STARTER',
  },
  {
    email: 'demo-pro@resellq.com',
    name: 'Demo Pro',
    password: 'ProDemo123!',
    subscriptionPlan: 'PRO',
  },
  {
    email: 'demo-business@resellq.com',
    name: 'Demo Business',
    password: 'BusinessDemo123!',
    subscriptionPlan: 'BUSINESS',
  },
]

async function main() {
  console.log('🔧 Création des comptes de démonstration ResellQ...')

  for (const demo of demoAccounts) {
    const passwordHash = await bcrypt.hash(demo.password, 12)
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        password: passwordHash,
        role: 'USER',
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: demo.subscriptionPlan,
        subscriptionEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        aiCreditsUsed: 0,
        aiCreditsResetAt: nextMonthlyReset(),
      },
      create: {
        email: demo.email,
        name: demo.name,
        password: passwordHash,
        role: 'USER',
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: demo.subscriptionPlan,
        subscriptionEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        aiCreditsUsed: 0,
        aiCreditsResetAt: nextMonthlyReset(),
      },
    })
    console.log(`✅ ${demo.subscriptionPlan} créé : ${user.email}`)
  }

  console.log('✅ Les comptes de démonstration sont prêts à l&apos;usage.')
}

main()
  .catch((error) => {
    console.error('❌ Erreur lors de la création des comptes de démonstration', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
