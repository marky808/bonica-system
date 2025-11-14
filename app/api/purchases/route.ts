import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/purchases - Get all purchases with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const supplier = searchParams.get('supplier')
    const month = searchParams.get('month')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (category) {
      where.category = { name: category }
    }
    
    if (supplier) {
      where.supplier = { companyName: { contains: supplier } }
    }
    
    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999)
      where.purchaseDate = {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { supplier: { companyName: { contains: search } } }
      ]
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          category: true,
          supplier: true
        },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.purchase.count({ where })
    ])

    return NextResponse.json({
      purchases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// POST /api/purchases - Create new purchase
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
    
    const data = await request.json()
    const {
      productName,
      categoryId,
      quantity,
      unit,
      unitNote,
      unitPrice,
      price,
      taxType,
      supplierId,
      purchaseDate,
      expiryDate,
      deliveryFee
    } = data

    // Validate required fields
    if (!productName || !categoryId || !quantity || !unit || unitPrice === undefined || unitPrice === null || !supplierId || !purchaseDate) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    // Verify category and supplier exist
    const [category, supplier] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.supplier.findUnique({ where: { id: supplierId } })
    ])

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリーが見つかりません' },
        { status: 400 }
      )
    }

    if (!supplier) {
      return NextResponse.json(
        { error: '仕入れ先が見つかりません' },
        { status: 400 }
      )
    }

    const purchase = await prisma.purchase.create({
      data: {
        productName,
        categoryId,
        quantity: parseFloat(quantity),
        unit,
        unitNote,
        unitPrice: parseFloat(unitPrice),
        price: parseFloat(price),
        taxType: taxType || 'TAXABLE',
        supplierId,
        purchaseDate: new Date(purchaseDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        deliveryFee,
        status: 'UNUSED',
        remainingQuantity: parseFloat(quantity)
      },
      include: {
        category: true,
        supplier: true
      }
    })

    return NextResponse.json(purchase, { status: 201 })

  } catch (error: any) {
    console.error('Create purchase error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ登録に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}