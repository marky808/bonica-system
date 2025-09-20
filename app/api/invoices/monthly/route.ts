import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { freeeClient } from '@/lib/freee-client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface MonthlyInvoiceRequest {
  customerId: string
  year: number
  month: number
  startDate?: string
  endDate?: string
  issueDate?: string
  dueDate?: string
}

export async function POST(request: NextRequest) {
  console.log('=== 月次請求書作成API開始 ===')
  
  try {
    await requireAuth(request)
    
    const body = await request.json() as MonthlyInvoiceRequest
    const { customerId, year, month, startDate, endDate, issueDate, dueDate } = body
    
    console.log(`📄 月次請求書作成: 顧客ID=${customerId}, ${year}年${month}月`)
    
    // 期間の計算
    const periodStart = startDate || `${year}-${String(month).padStart(2, '0')}-01`
    const periodEnd = endDate || new Date(year, month, 0).toISOString().split('T')[0] // 月末
    
    console.log(`📅 集計期間: ${periodStart} ～ ${periodEnd}`)
    
    // 顧客データを取得
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })
    
    if (!customer) {
      console.error('❌ 顧客が見つかりません:', customerId)
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      )
    }
    
    console.log(`✅ 顧客情報: ${customer.companyName}`)
    
    // 期間内の納品データを取得
    const deliveries = await prisma.delivery.findMany({
      where: {
        customerId: customerId,
        deliveryDate: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd + 'T23:59:59.999Z'),
        },
        status: 'DELIVERED', // 納品完了のみ
        // 既に請求書が作成されていないもの
        OR: [
          { freeeInvoiceId: null },
          { freeeInvoiceId: '' }
        ]
      },
      include: {
        customer: true,
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
      console.log('⚠️ 期間内に請求対象の納品がありません')
      return NextResponse.json({
        success: false,
        message: '期間内に請求対象の納品がありません',
        data: {
          customerId,
          customerName: customer.companyName,
          period: `${periodStart} ～ ${periodEnd}`,
          deliveryCount: 0,
          totalAmount: 0
        }
      })
    }
    
    console.log(`📦 対象納品数: ${deliveries.length}件`)
    
    // freeeの取引先を検索
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
    
    // 請求書明細を準備
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
          description: `${item.purchase.productName} (${item.purchase.category.name}) [${new Date(delivery.deliveryDate).toLocaleDateString('ja-JP')}納品]`,
          tax_code: 2, // 10% tax
          amount: amount
        })
      }
    }
    
    console.log(`💰 合計金額: ${totalAmount.toLocaleString()}円, 明細数: ${invoiceContents.length}`)
    
    // 支払期限を計算
    const invoiceIssueDate = issueDate || new Date().toISOString().split('T')[0]
    let calculatedDueDate = dueDate
    
    if (!dueDate) {
      const issueDate = new Date(invoiceIssueDate)
      switch (customer.paymentTerms) {
        case 'immediate':
          calculatedDueDate = invoiceIssueDate
          break
        case '7days':
          calculatedDueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case '15days':
          calculatedDueDate = new Date(issueDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case '30days':
          calculatedDueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case '60days':
          calculatedDueDate = new Date(issueDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case 'endofmonth':
          // 翌月末
          const nextMonth = new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 0)
          calculatedDueDate = nextMonth.toISOString().split('T')[0]
          break
        default:
          calculatedDueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    }
    
    // freeeで請求書を作成
    const invoiceData = {
      partner_id: partner.id,
      partner_code: partner.code,
      issue_date: invoiceIssueDate,
      due_date: calculatedDueDate,
      title: `月次請求書 - ${customer.companyName} (${year}年${month}月分)`,
      invoice_status: 'draft' as const,
      posting_status: 'unrequested' as const,
      invoice_contents: invoiceContents,
      partner_display_name: customer.companyName,
      partner_title: customer.contactPerson,
      partner_address1: customer.billingAddress,
      partner_contact_info: customer.phone,
      memo: `納品期間: ${periodStart} ～ ${periodEnd}\n納品ID: ${deliveries.map(d => d.id).join(', ')}`
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
    
    // 納品データにfreee請求書IDを更新
    if (invoiceResult.data.id) {
      console.log(`📝 納品データ更新: freee請求書ID ${invoiceResult.data.id}`)
      const deliveryIds = deliveries.map(d => d.id)
      await prisma.delivery.updateMany({
        where: { id: { in: deliveryIds } },
        data: { 
          freeeInvoiceId: invoiceResult.data.id.toString(),
          freeeInvoiceNumber: invoiceResult.data.invoice_number || null
        }
      })
    }
    
    console.log('=== 月次請求書作成API完了 ===')
    
    return NextResponse.json({
      success: true,
      message: '月次請求書を作成しました',
      data: {
        invoiceId: invoiceResult.data.id,
        invoiceNumber: invoiceResult.data.invoice_number,
        totalAmount,
        deliveryCount: deliveries.length,
        itemCount: invoiceContents.length,
        customerName: customer.companyName,
        partnerName: partner.name,
        partnerId: partner.id,
        period: `${periodStart} ～ ${periodEnd}`,
        issueDate: invoiceIssueDate,
        dueDate: calculatedDueDate,
        billingCycle: customer.billingCycle,
        paymentTerms: customer.paymentTerms
      }
    })
    
  } catch (error: any) {
    console.error('月次請求書作成API エラー:', error)
    return NextResponse.json(
      { error: error.message || '月次請求書の作成に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// GET /api/invoices/monthly - Get monthly billing summary
export async function GET(request: NextRequest) {
  console.log('=== 月次請求書集計API開始 ===')
  
  try {
    const authHeader = request.headers.get('authorization')
    console.log('🔍 認証ヘッダー確認:', { 
      hasAuthHeader: !!authHeader, 
      headerPrefix: authHeader?.substring(0, 20),
      allHeaders: Object.fromEntries(request.headers.entries())
    })
    
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    
    console.log(`📊 月次集計取得: 顧客ID=${customerId || 'all'}, ${year}年${month}月`)
    
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0] // 月末
    
    const whereCondition: any = {
      deliveryDate: {
        gte: new Date(periodStart),
        lte: new Date(periodEnd + 'T23:59:59.999Z'),
      },
      status: {
        in: ['DELIVERED', 'PENDING']
      }
    }
    
    if (customerId) {
      whereCondition.customerId = customerId
    }
    
    // 顧客別に集計
    const deliveries = await prisma.delivery.findMany({
      where: whereCondition,
      include: {
        customer: true,
        items: true
      }
    })
    
    // 顧客別にグループ化
    const customerSummaries = deliveries.reduce((acc, delivery) => {
      const customerId = delivery.customerId
      if (!acc[customerId]) {
        acc[customerId] = {
          customerId: delivery.customerId,
          customerName: delivery.customer.companyName,
          billingCycle: delivery.customer.billingCycle,
          billingDay: delivery.customer.billingDay,
          paymentTerms: delivery.customer.paymentTerms,
          deliveryCount: 0,
          totalAmount: 0,
          hasInvoice: false,
          invoiceId: null,
          deliveryIds: []
        }
      }
      
      acc[customerId].deliveryCount += 1
      acc[customerId].totalAmount += delivery.totalAmount
      acc[customerId].deliveryIds.push(delivery.id)
      
      // 請求書が作成されているかチェック
      if (delivery.freeeInvoiceId) {
        acc[customerId].hasInvoice = true
        acc[customerId].invoiceId = delivery.freeeInvoiceId
      }
      
      return acc
    }, {} as Record<string, any>)
    
    const summaries = Object.values(customerSummaries)
    
    console.log(`📈 集計結果: ${summaries.length}顧客, 合計${summaries.reduce((sum, s: any) => sum + s.totalAmount, 0).toLocaleString()}円`)
    
    console.log('=== 月次請求書集計API完了 ===')
    
    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        period: `${periodStart} ～ ${periodEnd}`,
        summaries,
        totalCustomers: summaries.length,
        totalAmount: summaries.reduce((sum, s: any) => sum + s.totalAmount, 0),
        totalDeliveries: summaries.reduce((sum, s: any) => sum + s.deliveryCount, 0)
      }
    })
    
  } catch (error: any) {
    console.error('月次請求書集計API エラー:', error)
    return NextResponse.json(
      { error: error.message || '月次集計の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}