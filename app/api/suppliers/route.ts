import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    
    const suppliers = await prisma.supplier.findMany({
      orderBy: { companyName: 'asc' }
    })

    return NextResponse.json(suppliers)

  } catch (error: any) {
    console.error('Get suppliers error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ先一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
    
    const {
      companyName,
      contactPerson,
      phone,
      address,
      paymentTerms,
      deliveryConditions,
      specialNotes
    } = await request.json()

    if (!companyName || !contactPerson || !phone || !address) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyName,
        contactPerson,
        phone,
        address,
        paymentTerms,
        deliveryConditions,
        specialNotes
      }
    })

    return NextResponse.json(supplier, { status: 201 })

  } catch (error: any) {
    console.error('Create supplier error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ先作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}