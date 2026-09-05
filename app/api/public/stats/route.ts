import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'

export const revalidate = 300

export async function GET() {
  try {
    const [productsTracked, categoriesTracked] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.categoryMarket.count(),
    ])

    return NextResponse.json({ productsTracked, categoriesTracked })
  } catch (error) {
    // Cette route rendait `{ productsTracked: 0, categoriesTracked: 0 }` en 200
    // quand la base était injoignable. Zéro annonce suivie est une affirmation
    // sur le marché ; ne pas savoir en est une autre. Le client doit pouvoir
    // faire la différence et afficher « indisponible » plutôt que « 0 ».
    console.error('public/stats: comptage impossible', error)
    return NextResponse.json(
      {
        productsTracked: null,
        categoriesTracked: null,
        error: 'Statistiques momentanément indisponibles.',
        cause: 'database',
      },
      { status: 503 },
    )
  }
}
