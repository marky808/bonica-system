import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // パスワードは除外
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)

  } catch (error: any) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: error.message || 'ユーザー一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// POST /api/users - ユーザー新規作成
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    const body = await request.json()
    const { name, email, password, role } = body

    // バリデーション
    if (!name?.trim()) {
      return NextResponse.json(
        { error: '名前が必要です' },
        { status: 400 }
      )
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    if (!password?.trim()) {
      return NextResponse.json(
        { error: 'パスワードが必要です' },
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

    // 重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '同じメールアドレスのユーザーが既に存在します' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'USER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'ユーザー作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}
