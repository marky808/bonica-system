import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const createCustomerSchema = z.object({
  companyName: z.string().min(1, '会社名を入力してください'),
  contactPerson: z.string().min(1, '担当者名を入力してください'),
  phone: z.string().min(1, '電話番号を入力してください'),
  deliveryAddress: z.string().min(1, '配送先住所を入力してください'),
  billingAddress: z.string().min(1, '請求先住所を入力してください'),
  deliveryTimePreference: z.string().optional(),
  specialRequests: z.string().optional(),
  specialNotes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)

    const customers = await prisma.customer.findMany({
      orderBy: {
        companyName: 'asc',
      },
    })

    return NextResponse.json(customers)
  } catch (error: any) {
    console.error('Get customers error:', error)
    return NextResponse.json(
      { error: error.message || '顧客一覧の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    const {
      companyName,
      contactPerson,
      phone,
      deliveryAddress,
      billingAddress,
      deliveryTimePreference,
      specialRequests,
      specialNotes,
      billingCycle = 'monthly',
      billingDay = 31,
      paymentTerms = '30days',
      invoiceRegistrationNumber,
      invoiceNotes
    } = await request.json()

    if (!companyName || !contactPerson || !phone || !deliveryAddress || !billingAddress) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        companyName,
        contactPerson,
        phone,
        deliveryAddress,
        billingAddress,
        deliveryTimePreference,
        specialRequests,
        specialNotes,
        billingCycle,
        billingDay,
        paymentTerms,
        invoiceRegistrationNumber,
        invoiceNotes
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error('Create customer error:', error)
    return NextResponse.json(
      { error: error.message || '顧客作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}