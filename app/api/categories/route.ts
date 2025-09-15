import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(categories)

  } catch (error: any) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: error.message || 'カテゴリー一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
    
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'カテゴリー名が必要です' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: { name }
    })

    return NextResponse.json(category, { status: 201 })

  } catch (error: any) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: error.message || 'カテゴリー作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}