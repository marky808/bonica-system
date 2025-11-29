import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { freeeClient } from '@/lib/freee-client'

// POST /api/freee/create-invoice - Create invoice in freee
export async function POST(request: NextRequest) {
  console.log('=== freee請求書作成API開始 ===')
  
  try {
    await requireAuth(request)

    const { deliveryIds, customerId, issueDate, dueDate } = await request.json()
    console.log(`📄 請求書作成リクエスト: ${deliveryIds?.length || 0}件の納品`)

    if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
      console.error('❗ 納品IDが指定されていません')
      return NextResponse.json(
        { error: '納品IDが指定されていません' },
        { status: 400 }
      )
    }

    // Get deliveries with details
    console.log(`📄 納品データ取得: ${deliveryIds.join(', ')}`)
    const deliveries = await prisma.delivery.findMany({
      where: {
        id: { in: deliveryIds },
        customerId: customerId || undefined
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            deliveryAddress: true,
            billingAddress: true,
            deliveryTimePreference: true,
            specialRequests: true,
            specialNotes: true,
            billingCycle: true,
            billingDay: true,
            paymentTerms: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
          }
        },
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
    })

    if (deliveries.length === 0) {
      console.error('❗ 指定された納品が見つかりません')
      return NextResponse.json(
        { error: '指定された納品が見つかりません' },
        { status: 404 }
      )
    }
    
    console.log(`✅ 納品データ取得成功: ${deliveries.length}件`)

    // Check all deliveries are for the same customer
    const uniqueCustomerIds = [...new Set(deliveries.map(d => d.customerId))]
    if (uniqueCustomerIds.length > 1) {
      console.error('❗ 複数の異なる顧客の納品が含まれています')
      return NextResponse.json(
        { error: '複数の異なる顧客の納品が含まれています' },
        { status: 400 }
      )
    }

    const customer = deliveries[0].customer
    console.log(`👥 顧客情報: ${customer.companyName}`)

    // Search for existing freee partner by company name
    console.log(`🔍 freee取引先検索: ${customer.companyName}`)
    const partnersResult = await freeeClient.getPartners({
      keyword: customer.companyName,
      limit: 10
    })

    if (partnersResult.error) {
      console.error('❌ freee取引先検索エラー:', partnersResult.error)
      return NextResponse.json(
        { error: `freee取引先検索エラー: ${partnersResult.error}` },
        { status: 500 }
      )
    }

    let partner = partnersResult.data?.find(p => p.name === customer.companyName)
    
    if (!partner || !partner.id) {
      console.log(`⚠️ freee取引先が見つかりません: ${customer.companyName}`)
      console.log('💡 既存のデモ取引先を使用します')
      
      // Use first available demo partner as fallback
      const allPartnersResult = await freeeClient.getPartners({ limit: 1 })
      if (allPartnersResult.data && allPartnersResult.data.length > 0) {
        partner = allPartnersResult.data[0]
        console.log(`📝 代替取引先使用: ${partner.name} (ID: ${partner.id})`)
      } else {
        console.error('❌ freee取引先が全く見つかりません')
        return NextResponse.json(
          { error: 'freee取引先が見つかりません。先に取引先同期を実行してください。' },
          { status: 404 }
        )
      }
    } else {
      console.log(`✅ freee取引先見つかりました: ${partner.name} (ID: ${partner.id})`)
    }

    // Prepare invoice contents
    const invoiceContents: any[] = []
    let totalAmount = 0

    console.log(`📋 請求書明細作成中...`)
    for (const delivery of deliveries) {
      for (const item of delivery.items) {
        const amount = item.quantity * item.unitPrice
        totalAmount += amount

        invoiceContents.push({
          type: 'normal',
          qty: item.quantity,
          unit: item.purchase.unit,
          unit_price: item.unitPrice,
          description: `${item.purchase.productName} (${item.purchase.category.name})`,
          tax_code: 2, // 10% tax
          amount: amount
        })
      }
    }

    console.log(`💰 合計金額: ${totalAmount.toLocaleString()}円, 明細数: ${invoiceContents.length}`)
    
    // Create invoice in freee
    const invoiceData = {
      partner_id: partner.id,
      partner_code: partner.code,
      issue_date: issueDate || new Date().toISOString().split('T')[0],
      due_date: dueDate,
      title: `請求書 - ${customer.companyName}`,
      invoice_status: 'draft' as const,
      posting_status: 'unrequested' as const,
      invoice_contents: invoiceContents,
      partner_display_name: customer.companyName,
      partner_title: customer.contactPerson,
      partner_address1: customer.billingAddress,
      partner_contact_info: customer.phone,
      memo: `納品ID: ${deliveryIds.join(', ')}`
    }

    console.log(`📮 freee請求書作成リクエスト送信...`)
    const invoiceResult = await freeeClient.createInvoice(invoiceData)

    if (!invoiceResult.data) {
      console.error('❌ freee請求書作成エラー:', invoiceResult.error)
      return NextResponse.json(
        { error: `freee請求書の作成に失敗しました: ${invoiceResult.error}` },
        { status: 500 }
      )
    }
    
    console.log(`✅ freee請求書作成成功: ID ${invoiceResult.data.id}`)

    // Update deliveries with freee invoice ID
    if (invoiceResult.data.id) {
      console.log(`📝 納品データ更新: freee請求書ID ${invoiceResult.data.id}`)
      await prisma.delivery.updateMany({
        where: { id: { in: deliveryIds } },
        data: { 
          freeeInvoiceId: invoiceResult.data.id.toString(),
          freeeInvoiceNumber: invoiceResult.data.invoice_number || null
        }
      })
    }

    console.log('=== freee請求書作成API完了 ===')
    
    return NextResponse.json({
      success: true,
      message: 'freee請求書を作成しました',
      data: {
        invoiceId: invoiceResult.data.id,
        invoiceNumber: invoiceResult.data.invoice_number,
        totalAmount,
        deliveryCount: deliveries.length,
        itemCount: invoiceContents.length,
        customerName: customer.companyName,
        partnerName: partner.name,
        partnerId: partner.id
      }
    })

  } catch (error: any) {
    console.error('freee請求書作成API エラー:', error)
    return NextResponse.json(
      { error: error.message || 'freee請求書の作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}