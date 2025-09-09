import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { freeeClient } from '@/lib/freee-client'
import { prisma } from '@/lib/db'

interface DeliverySlipRequest {
  deliveryId: string
  issueDate?: string
  description?: string
}

export async function POST(request: NextRequest) {
  console.log('=== freee納品書作成API開始 ===')
  
  try {
    // 認証確認
    await requireAuth(request)
    
    const body = await request.json() as DeliverySlipRequest
    const { deliveryId, issueDate, description } = body
    
    console.log(`📝 納品書作成リクエスト: ${deliveryId}`)
    
    // 納品データを取得
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
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
    
    if (!delivery) {
      console.error('❌ 納品データが見つかりません:', deliveryId)
      return NextResponse.json(
        { error: '納品データが見つかりません' },
        { status: 404 }
      )
    }
    
    console.log(`✅ 納品データ取得: ${delivery.customer.companyName} - ${delivery.items.length}品目`)
    
    // freeeの取引先を検索
    console.log(`🔍 freee取引先検索: ${delivery.customer.companyName}`)
    const partnersResult = await freeeClient.getPartners({
      keyword: delivery.customer.companyName,
      limit: 10
    })
    
    if (partnersResult.error) {
      console.error('❌ freee取引先検索エラー:', partnersResult.error)
      return NextResponse.json(
        { error: `freee取引先検索エラー: ${partnersResult.error}` },
        { status: 500 }
      )
    }
    
    const partner = partnersResult.data?.find(p => p.name === delivery.customer.companyName)
    if (!partner || !partner.id) {
      console.error('❌ freee取引先が見つかりません:', delivery.customer.companyName)
      return NextResponse.json(
        { error: `freee取引先「${delivery.customer.companyName}」が見つかりません。先に取引先同期を実行してください。` },
        { status: 404 }
      )
    }
    
    console.log(`✅ freee取引先見つかりました: ${partner.name} (ID: ${partner.id})`)
    
    // freee取引（納品書相当）を作成
    const dealDetails = delivery.items.map((item, index) => ({
      order: index + 1,
      type: 'normal' as const,
      account_item_id: 5, // 売上高（標準的な勘定科目ID）
      tax_code: 2, // 10%税率
      amount: Math.round(item.unitPrice * item.quantity),
      description: `${item.purchase.category.name} - ${item.purchase.productName} ${item.quantity}${item.purchase.unit || '個'} @${item.unitPrice}円`
    }))
    
    const totalAmount = dealDetails.reduce((sum, detail) => sum + detail.amount, 0)
    
    const dealData = {
      company_id: parseInt(process.env.FREEE_COMPANY_ID!),
      issue_date: issueDate || delivery.deliveryDate.toISOString().split('T')[0],
      type: 'income' as const,
      partner_id: partner.id,
      ref_number: `DEL-${delivery.id.slice(-8)}`, // 納品書番号
      description: description || `納品書 - ${delivery.customer.companyName}`,
      details: dealDetails
    }
    
    console.log(`💼 freee取引作成: 合計金額 ${totalAmount.toLocaleString()}円, ${dealDetails.length}明細`)
    
    // freee APIで取引を作成
    const createResult = await freeeClient['request']('/api/1/deals', {
      method: 'POST',
      body: JSON.stringify({ deal: dealData })
    })
    
    if (createResult.error) {
      console.error('❌ freee取引作成エラー:', createResult.error)
      return NextResponse.json(
        { error: `freee納品書作成エラー: ${createResult.error}` },
        { status: 500 }
      )
    }
    
    const createdDeal = createResult.data as any
    console.log(`✅ freee納品書作成成功: 取引ID ${createdDeal.deal?.id}`)
    
    // 納品データにfreee情報を更新
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        freeeDeliverySlipId: createdDeal.deal?.id ? String(createdDeal.deal.id) : null,
        freeeInvoiceNumber: createdDeal.deal?.ref_number || null
      }
    })
    
    console.log('=== freee納品書作成API完了 ===')
    
    return NextResponse.json({
      success: true,
      message: 'freee納品書を作成しました',
      data: {
        dealId: createdDeal.deal?.id,
        refNumber: createdDeal.deal?.ref_number,
        totalAmount,
        itemCount: dealDetails.length,
        customerName: delivery.customer.companyName,
        partnerName: partner.name,
        partnerId: partner.id
      }
    })
    
  } catch (error) {
    console.error('freee納品書作成API エラー:', error)
    return NextResponse.json(
      { error: 'freee納品書作成でエラーが発生しました' },
      { status: 500 }
    )
  }
}