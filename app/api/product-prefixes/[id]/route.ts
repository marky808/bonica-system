import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/product-prefixes/[id] - プレフィックス詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const prefix = await prisma.productPrefix.findUnique({
      where: { id: params.id }
    })

    if (!prefix) {
      return NextResponse.json(
        { error: 'プレフィックスが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(prefix)

  } catch (error: any) {
    console.error('Get product prefix error:', error)
    return NextResponse.json(
      { error: error.message || 'プレフィックスの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// PUT /api/product-prefixes/[id] - プレフィックス更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const { name } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'プレフィックス名が必要です' },
        { status: 400 }
      )
    }

    // 既存のプレフィックスを確認
    const existing = await prisma.productPrefix.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'プレフィックスが見つかりません' },
        { status: 404 }
      )
    }

    // 名前の重複チェック（自分以外）
    const duplicate = await prisma.productPrefix.findFirst({
      where: {
        name: name.trim(),
        id: { not: params.id }
      }
    })

    if (duplicate) {
      return NextResponse.json(
        { error: '同じ名前のプレフィックスが既に存在します' },
        { status: 400 }
      )
    }

    const prefix = await prisma.productPrefix.update({
      where: { id: params.id },
      data: { name: name.trim() }
    })

    return NextResponse.json(prefix)

  } catch (error: any) {
    console.error('Update product prefix error:', error)
    return NextResponse.json(
      { error: error.message || 'プレフィックスの更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/product-prefixes/[id] - プレフィックス削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    // プレフィックスが使用されているかチェック
    const purchaseCount = await prisma.purchase.count({
      where: { productPrefixId: params.id }
    })

    if (purchaseCount > 0) {
      return NextResponse.json(
        { error: 'このプレフィックスは使用されているため削除できません' },
        { status: 400 }
      )
    }

    await prisma.productPrefix.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete product prefix error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'プレフィックスが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'プレフィックスの削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
