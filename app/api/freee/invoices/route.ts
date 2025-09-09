import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { freeeClient } from '@/lib/freee-client'

// GET /api/freee/invoices - Get invoices from freee
export async function GET(request: NextRequest) {
  try {
    requireAuth(request)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const partnerId = searchParams.get('partner_id')
    const partnerCode = searchParams.get('partner_code')
    const invoiceStatus = searchParams.get('invoice_status')
    const paymentStatus = searchParams.get('payment_status')

    const invoicesResult = await freeeClient.getInvoices({
      start_issue_date: startDate || undefined,
      end_issue_date: endDate || undefined,
      partner_id: partnerId ? parseInt(partnerId) : undefined,
      partner_code: partnerCode || undefined,
      invoice_status: invoiceStatus || undefined,
      payment_status: paymentStatus || undefined,
      limit: 100
    })

    if (!invoicesResult.data) {
      return NextResponse.json(
        { error: invoicesResult.error || 'freee請求書の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invoices: invoicesResult.data,
      count: invoicesResult.data.length
    })

  } catch (error: any) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { error: error.message || 'freee請求書の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}