import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/purchases/[id] - Get specific purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)
    
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        supplier: true
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: '仕入れが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)

  } catch (error: any) {
    console.error('Get purchase error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ詳細の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// PUT /api/purchases/[id] - Update purchase
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      deliveryFee,
      status
    } = data

    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: params.id }
    })

    if (!existingPurchase) {
      return NextResponse.json(
        { error: '仕入れが見つかりません' },
        { status: 404 }
      )
    }

    // Verify category and supplier exist if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        return NextResponse.json(
          { error: 'カテゴリーが見つかりません' },
          { status: 400 }
        )
      }
    }

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
      if (!supplier) {
        return NextResponse.json(
          { error: '仕入れ先が見つかりません' },
          { status: 400 }
        )
      }
    }

    // Calculate remaining quantity if quantity changes
    let remainingQuantity = existingPurchase.remainingQuantity
    if (quantity && parseFloat(quantity) !== existingPurchase.quantity) {
      const usedQuantity = existingPurchase.quantity - existingPurchase.remainingQuantity
      remainingQuantity = parseFloat(quantity) - usedQuantity
      remainingQuantity = Math.max(0, remainingQuantity) // Can't be negative
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id: params.id },
      data: {
        ...(productName && { productName }),
        ...(categoryId && { categoryId }),
        ...(quantity && { quantity: parseFloat(quantity), remainingQuantity }),
        ...(unit && { unit }),
        ...(unitNote !== undefined && { unitNote }),
        ...(unitPrice && { unitPrice: parseFloat(unitPrice) }),
        ...(price && { price: parseFloat(price) }),
        ...(taxType && { taxType }),
        ...(supplierId && { supplierId }),
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(deliveryFee !== undefined && { deliveryFee }),
        ...(status && { status })
      },
      include: {
        category: true,
        supplier: true
      }
    })

    return NextResponse.json(updatedPurchase)

  } catch (error: any) {
    console.error('Update purchase error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/purchases/[id] - Delete purchase
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)
    
    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: { deliveryItems: true }
    })

    if (!existingPurchase) {
      return NextResponse.json(
        { error: '仕入れが見つかりません' },
        { status: 404 }
      )
    }

    // Check if purchase is used in any deliveries
    if (existingPurchase.deliveryItems.length > 0) {
      return NextResponse.json(
        { error: '納品で使用されているため削除できません' },
        { status: 400 }
      )
    }

    await prisma.purchase.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: '仕入れを削除しました' })

  } catch (error: any) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { error: error.message || '仕入れ削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}