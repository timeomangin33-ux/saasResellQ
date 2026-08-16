import { NextResponse } from 'next/server'
import { prisma } from '../../../../prisma'

export async function GET(request: Request) {
  // Email verification flow is temporarily disabled.
  // Redirect to signin as verified so users can proceed.
  return NextResponse.redirect(new URL('/auth/signin?verified=1', request.url))
}
