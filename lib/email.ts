import { prisma } from '../prisma'

const EMAIL_TTL_MS = 10 * 60 * 1000

function createCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createVerificationToken({ userId, type }: { userId: string; type: 'verify' | '2fa' }) {
  const identifier = `${type}:${userId}`
  const token = createCode()

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + EMAIL_TTL_MS),
    },
  })

  return token
}

export async function consumeVerificationToken({ userId, type, token }: { userId: string; type: 'verify' | '2fa'; token: string }) {
  const identifier = `${type}:${userId}`
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token,
    },
  })

  if (!record || record.expires < new Date()) {
    return false
  }

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  return true
}

export async function sendVerificationEmail(email: string, token: string, kind: 'verify' | '2fa') {
  // Email sending is disabled temporarily. Do not perform any network calls to Resend.
  // Keep a local log so devs can retrieve the token if needed.
  console.info(`[email][disabled] ${kind} code for ${email}: ${token}`)
  return { ok: true }
}

export async function sendVerificationEmailToUser(email: string, token: string, kind: 'verify' | '2fa') {
  return sendVerificationEmail(email, token, kind)
}
