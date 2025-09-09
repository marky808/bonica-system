import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Get purchases with remaining quantity > 0
    const whereClause: any = {
      remainingQuantity: {
        gt: 0,
      },
    }

    if (search) {
      whereClause.OR = [
        {
          productName: {
            contains: search,
          },
        },
        {
          category: {
            name: {
              contains: search,
            },
          },
        },
      ]
    }

    const availablePurchases = await prisma.purchase.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: [
        {
          purchaseDate: 'asc', // Older stock first (FIFO)
        },
        {
          productName: 'asc',
        },
      ],
    })

    return NextResponse.json(availablePurchases)
  } catch (error) {
    console.error('Failed to fetch available purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available purchases' },
      { status: 500 }
    )
  }
}