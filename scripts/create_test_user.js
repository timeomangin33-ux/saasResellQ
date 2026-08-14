#!/usr/bin/env node
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

async function main() {
  const argv = require('minimist')(process.argv.slice(2))
  const email = argv.email || argv.e
  const password = argv.password || argv.p
  const name = argv.name || 'Test User'

  if (!email || !password) {
    console.error('Usage: node scripts/create_test_user.js --email user@example.com --password YourPass123')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const hashed = bcrypt.hashSync(password, 10)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.log('Utilisateur existant, mise à jour du mot de passe...')
      await prisma.user.update({ where: { email }, data: { password: hashed, emailVerifiedAt: new Date() } })
      console.log('Mis à jour.')
    } else {
      await prisma.user.create({ data: { email, password: hashed, name, emailVerifiedAt: new Date() } })
      console.log('Utilisateur créé.')
    }
  } catch (err) {
    console.error('Erreur:', err.message || err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
