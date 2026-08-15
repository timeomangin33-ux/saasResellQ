#!/usr/bin/env node
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

function parseArg(keyShort, keyLong) {
  const argv = process.argv.slice(2)
  const idx = argv.findIndex((a) => a === `--${keyLong}` || a === `-${keyShort}`)
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]
  return undefined
}

const emailArg = parseArg('e', 'email')
const passwordArg = parseArg('p', 'password')
const nameArg = parseArg('n', 'name')

const email = emailArg || process.env.ADMIN_EMAIL || process.env.TEST_USER_EMAIL
const password = passwordArg || process.env.ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD
const name = nameArg || 'Test User'

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
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
