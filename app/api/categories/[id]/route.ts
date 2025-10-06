import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/categories/[id] - カテゴリー詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const category = await prisma.category.findUnique({
      where: { id: params.id }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)

  } catch (error: any) {
    console.error('Get category error:', error)
    return NextResponse.json(
      { error: error.message || 'カテゴリーの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// PUT /api/categories/[id] - カテゴリー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const body = await request.json()
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'カテゴリー名が必要です' },
        { status: 400 }
      )
    }

    // 既存のカテゴリーを確認
    const existing = await prisma.category.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'カテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    // 名前の重複チェック（自分以外）
    const duplicate = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: params.id }
      }
    })

    if (duplicate) {
      return NextResponse.json(
        { error: '同じ名前のカテゴリーが既に存在します' },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name: name.trim() }
    })

    return NextResponse.json(category)

  } catch (error: any) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: error.message || 'カテゴリーの更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/categories/[id] - カテゴリー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    // カテゴリーが使用されているかチェック
    const purchaseCount = await prisma.purchase.count({
      where: { categoryId: params.id }
    })

    if (purchaseCount > 0) {
      return NextResponse.json(
        { error: 'このカテゴリーは使用されているため削除できません' },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete category error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'カテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'カテゴリーの削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
