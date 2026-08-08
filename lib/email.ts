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
  const from = process.env.RESEND_FROM || 'ResellQ <onboarding@resellq.app>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.info(`[email] ${kind} code for ${email}: ${token}`)
    return { ok: true }
  }

  const subject = kind === '2fa'
    ? 'Votre code de connexion à deux facteurs'
    : 'Vérifiez votre adresse email'

  const bodyText = kind === '2fa'
    ? `Votre code de validation est ${token}. Il expire dans 10 minutes.`
    : `Vérifiez votre adresse email en cliquant sur ce lien : ${appUrl}/api/auth/verify?token=${token}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<p>${bodyText.replace(/\n/g, '<br />')}</p>`,
      text: bodyText,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[email] failed for ${email}:`, text)
    return { ok: false, error: text }
  }

  return { ok: true }
}

export async function sendVerificationEmailToUser(email: string, token: string, kind: 'verify' | '2fa') {
  return sendVerificationEmail(email, token, kind)
}
