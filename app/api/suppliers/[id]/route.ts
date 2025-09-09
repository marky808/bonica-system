import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        companyName,
        contactPerson,
        phone,
        address,
        paymentTerms,
        deliveryConditions,
        specialNotes,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(supplier)

  } catch (error: any) {
    console.error('Update supplier error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '指定された仕入れ先が見つかりません' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || '仕入れ先の更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    await prisma.supplier.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete supplier error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: '指定された仕入れ先が見つかりません' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || '仕入れ先の削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}