import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * 仕入れ未紐付けの納品一覧を取得
 */
export async function GET(request: Request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 仕入れ未紐付けの納品を取得
    const deliveries = await prisma.delivery.findMany({
      where: {
        purchaseLinkStatus: 'UNLINKED',
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        items: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      deliveries,
      count: deliveries.length,
    })
  } catch (error) {
    console.error('Failed to fetch unlinked deliveries:', error)
    return NextResponse.json(
      { error: '仕入れ未登録の納品一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
