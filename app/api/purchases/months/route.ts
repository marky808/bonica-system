import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/purchases/months - Get list of all available months
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)

    // 全仕入れデータの purchaseDate から年月を取得
    const purchases = await prisma.purchase.findMany({
      select: {
        purchaseDate: true
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })

    // 年月のユニークなリストを生成
    const monthsSet = new Set<string>()
    purchases.forEach(p => {
      const date = new Date(p.purchaseDate)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      monthsSet.add(`${year}-${month}`)
    })

    // 新しい順にソート
    const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a))

    return NextResponse.json({ months })

  } catch (error: any) {
    console.error('Get purchase months error:', error)
    return NextResponse.json(
      { error: error.message || '月一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
