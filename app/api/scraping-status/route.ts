import { NextResponse } from 'next/server'
import { requireInternalAccess } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = requireInternalAccess(request)
  if ('response' in access) return access.response

  return NextResponse.json({
    status: 'disabled',
    lastRun: null,
    categoriesCount: 0,
  })
}

