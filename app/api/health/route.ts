import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      service: 'resellq',
      timestamp: new Date().toISOString(),
      database: 'ok',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'resellq',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
