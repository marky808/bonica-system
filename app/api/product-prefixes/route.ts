import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/product-prefixes - 全プレフィックス取得
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)

    const prefixes = await prisma.productPrefix.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(prefixes)

  } catch (error: any) {
    console.error('Get product prefixes error:', error)
    return NextResponse.json(
      { error: error.message || 'プレフィックス一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// POST /api/product-prefixes - プレフィックス作成
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    const { name } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'プレフィックス名が必要です' },
        { status: 400 }
      )
    }

    // 重複チェック
    const existing = await prisma.productPrefix.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: '同じ名前のプレフィックスが既に存在します' },
        { status: 400 }
      )
    }

    const prefix = await prisma.productPrefix.create({
      data: { name: name.trim() }
    })

    return NextResponse.json(prefix, { status: 201 })

  } catch (error: any) {
    console.error('Create product prefix error:', error)
    return NextResponse.json(
      { error: error.message || 'プレフィックス登録に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
