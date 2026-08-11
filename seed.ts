import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

async function main() {
  // Use environment variable or skip admin creation
  const adminEmail = process.env.ADMIN_EMAIL || 'botvintedscrapper@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.log('ℹ️  ADMIN_PASSWORD not set in .env.local - skipping admin creation')
    console.log('📝 To create admin, set ADMIN_PASSWORD environment variable')
    return
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'BUSINESS',
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      email: adminEmail,
      name: 'Admin Vinted Scrapper',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'BUSINESS',
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Admin créé:', admin.email)
  console.log('📧 Email:', adminEmail)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
