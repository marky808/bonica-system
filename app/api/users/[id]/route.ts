import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/users/[id] - ユーザー詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)

  } catch (error: any) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: error.message || 'ユーザーの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// PUT /api/users/[id] - ユーザー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const body = await request.json()
    const { name, email, password, role } = body

    // 既存ユーザーの確認
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // バリデーション
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: '名前が必要です' },
        { status: 400 }
      )
    }

    if (email !== undefined) {
      if (!email?.trim()) {
        return NextResponse.json(
          { error: 'メールアドレスが必要です' },
          { status: 400 }
        )
      }

      // メールアドレス形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: '正しいメールアドレス形式で入力してください' },
          { status: 400 }
        )
      }

      // メールアドレス重複チェック（自分以外）
      const duplicate = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          id: { not: params.id }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: '同じメールアドレスのユーザーが既に存在します' },
          { status: 400 }
        )
      }
    }

    // 更新データを準備
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.toLowerCase().trim()
    if (role !== undefined) updateData.role = role

    // パスワードが提供されている場合はハッシュ化
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user)

  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: error.message || 'ユーザーの更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/users/[id] - ユーザー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    // 削除対象のユーザーを確認
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 管理者が最低1人残るかチェック
    if (user.role === 'ADMIN' || user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'admin' }
          ]
        }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '管理者は最低1人必要です。削除できません。' },
          { status: 400 }
        )
      }
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete user error:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'ユーザーの削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
