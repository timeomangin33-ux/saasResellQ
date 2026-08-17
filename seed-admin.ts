import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'botvintedscrapper@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = 'Admin Vinted Scrapper'

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD must be set before running the admin seed')
  }

  console.log('🔄 Créating admin account...')
  console.log(`📧 Email: ${adminEmail}`)

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'BUSINESS',
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      name: adminName,
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'BUSINESS',
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Admin account ready')
  console.log('📧 Email:', admin.email)
  console.log('👤 Role:', admin.role)
  console.log('💳 Subscription:', admin.subscriptionStatus)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
