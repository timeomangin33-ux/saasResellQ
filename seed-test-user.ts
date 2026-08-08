import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Vérifier si l'utilisateur existe déjà
  const existing = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  })

  if (existing) {
    console.log('✓ Utilisateur test existe déjà')
    return
  }

  // Use environment variable for test password
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'
  
  console.log('⚠️  Using TEST_USER_PASSWORD from environment')
  if (!process.env.TEST_USER_PASSWORD) {
    console.log('📝 For security, set TEST_USER_PASSWORD in .env.local')
  }

  // Créer l'utilisateur de test
  const hashedPassword = await bcrypt.hash(testPassword, 10)

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Utilisateur Test',
      password: hashedPassword,
      role: 'USER',
      subscriptionStatus: 'INACTIVE',
    },
  })

  console.log('✓ Utilisateur test créé:')
  console.log(`  Email: ${user.email}`)
  console.log(`  ID: ${user.id}`)
}

main()
  .catch((e) => {
    console.error('Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
