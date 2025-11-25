import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください"),
  contactPerson: z.string().min(1, "担当者名を入力してください"),
  phone: z.string().min(1, "電話番号を入力してください"),
  deliveryAddress: z.string().min(1, "納品住所を入力してください"),
  billingAddress: z.string().min(1, "請求先住所を入力してください"),
  deliveryTimePreference: z.string().optional(),
  specialRequests: z.string().optional(),
  specialNotes: z.string().optional(),
  billingCycle: z.string().default("monthly"),
  billingDay: z.number().min(1).max(31).default(31),
  paymentTerms: z.string().default("30days"),
  invoiceRegistrationNumber: z.string().optional(),
  invoiceNotes: z.string().optional(),
  billingCustomerId: z.string().nullable().optional(),
})

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== 顧客更新API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { id } = params
    console.log(`📝 顧客更新: ID=${id}`)
    
    const body = await request.json()
    console.log('📋 更新データ:', JSON.stringify(body, null, 2))
    
    // バリデーション
    const validatedData = updateCustomerSchema.parse(body)
    
    // 既存の顧客を確認
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    })
    
    if (!existingCustomer) {
      console.error('❌ 顧客が見つかりません:', id)
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      )
    }
    
    // 会社名の重複チェック（自分以外）
    if (validatedData.companyName !== existingCustomer.companyName) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          companyName: validatedData.companyName,
          id: { not: id }
        }
      })
      
      if (duplicateCustomer) {
        console.error('❌ 会社名が重複しています:', validatedData.companyName)
        return NextResponse.json(
          { error: 'この会社名は既に登録されています' },
          { status: 400 }
        )
      }
    }
    
    // 顧客を更新
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        companyName: validatedData.companyName,
        contactPerson: validatedData.contactPerson,
        phone: validatedData.phone,
        deliveryAddress: validatedData.deliveryAddress,
        billingAddress: validatedData.billingAddress,
        deliveryTimePreference: validatedData.deliveryTimePreference || null,
        specialRequests: validatedData.specialRequests || null,
        specialNotes: validatedData.specialNotes || null,
        billingCycle: validatedData.billingCycle,
        billingDay: validatedData.billingDay,
        paymentTerms: validatedData.paymentTerms,
        invoiceRegistrationNumber: validatedData.invoiceRegistrationNumber || null,
        invoiceNotes: validatedData.invoiceNotes || null,
        billingCustomerId: validatedData.billingCustomerId || null,
      },
      include: {
        billingCustomer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            deliveryAddress: true,
            billingAddress: true,
            billingCycle: true,
            billingDay: true,
            paymentTerms: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
            createdAt: true,
            updatedAt: true,
          }
        },
      }
    })
    
    console.log(`✅ 顧客更新成功: ${updatedCustomer.companyName}`)
    console.log('=== 顧客更新API完了 ===')
    
    return NextResponse.json(updatedCustomer)
    
  } catch (error: any) {
    console.error('顧客更新API エラー:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || '顧客の更新に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== 顧客詳細取得API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { id } = params
    console.log(`📋 顧客詳細取得: ID=${id}`)
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        billingCustomer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            deliveryAddress: true,
            billingAddress: true,
            billingCycle: true,
            billingDay: true,
            paymentTerms: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        deliveries: {
          orderBy: { deliveryDate: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                purchase: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!customer) {
      console.error('❌ 顧客が見つかりません:', id)
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      )
    }
    
    console.log(`✅ 顧客詳細取得成功: ${customer.companyName}`)
    console.log('=== 顧客詳細取得API完了 ===')
    
    return NextResponse.json(customer)
    
  } catch (error: any) {
    console.error('顧客詳細取得API エラー:', error)
    return NextResponse.json(
      { error: error.message || '顧客情報の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== 顧客削除API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { id } = params
    console.log(`🗑️ 顧客削除: ID=${id}`)
    
    // 既存の顧客を確認
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deliveries: true
      }
    })
    
    if (!existingCustomer) {
      console.error('❌ 顧客が見つかりません:', id)
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      )
    }
    
    // 関連する納品があるかチェック
    if (existingCustomer.deliveries.length > 0) {
      console.error('❌ 関連する納品データが存在します:', existingCustomer.deliveries.length)
      return NextResponse.json(
        { error: '関連する納品データが存在するため削除できません' },
        { status: 400 }
      )
    }
    
    // 顧客を削除
    await prisma.customer.delete({
      where: { id }
    })
    
    console.log(`✅ 顧客削除成功: ${existingCustomer.companyName}`)
    console.log('=== 顧客削除API完了 ===')
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('顧客削除API エラー:', error)
    return NextResponse.json(
      { error: error.message || '顧客の削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}