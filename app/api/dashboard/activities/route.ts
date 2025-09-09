import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  console.log('=== 最近の活動API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log(`📋 最近の活動取得: 上位${limit}件`)
    
    // 最近の仕入れを取得
    const recentPurchases = await prisma.purchase.findMany({
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        category: true,
      },
    })
    
    // 最近の納品を取得
    const recentDeliveries = await prisma.delivery.findMany({
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: {
          include: {
            purchase: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    })
    
    // 最近のfreee請求書連携活動を取得
    const recentInvoiceActivities = await prisma.delivery.findMany({
      where: {
        freeeInvoiceId: {
          not: null,
        },
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 過去7日以内
        },
      },
      take: Math.ceil(limit / 3),
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
      },
    })
    
    // アクティビティデータを統合
    const activities = []
    
    // 仕入れアクティビティ
    for (const purchase of recentPurchases) {
      activities.push({
        id: `purchase-${purchase.id}`,
        type: 'purchase',
        description: `${purchase.supplier.companyName}から${purchase.productName} ${purchase.quantity}${purchase.unit}仕入れ`,
        amount: purchase.price,
        timestamp: purchase.createdAt.toISOString(),
        status: purchase.status === 'COMPLETED' ? 'success' : 
                purchase.status === 'PENDING' ? 'pending' : 'success',
        relatedId: purchase.id,
      })
    }
    
    // 納品アクティビティ
    for (const delivery of recentDeliveries) {
      const mainItem = delivery.items[0]
      const itemCount = delivery.items.length
      const description = itemCount === 1
        ? `${delivery.customer.companyName}へ${mainItem?.purchase.productName || '商品'} ${mainItem?.quantity || 0}${mainItem?.purchase.unit || '個'}納品`
        : `${delivery.customer.companyName}へ${itemCount}品目納品`
      
      activities.push({
        id: `delivery-${delivery.id}`,
        type: 'delivery',
        description,
        amount: delivery.totalAmount,
        timestamp: delivery.createdAt.toISOString(),
        status: delivery.status === 'DELIVERED' ? 'success' :
                delivery.status === 'PENDING' ? 'pending' : 'success',
        relatedId: delivery.id,
      })
    }
    
    // 請求書アクティビティ
    for (const invoiceActivity of recentInvoiceActivities) {
      activities.push({
        id: `invoice-${invoiceActivity.id}`,
        type: 'invoice',
        description: `${invoiceActivity.customer.companyName}の請求書をfreeeに連携`,
        amount: invoiceActivity.totalAmount,
        timestamp: invoiceActivity.updatedAt.toISOString(),
        status: 'success',
        relatedId: invoiceActivity.freeeInvoiceId,
      })
    }
    
    // 時系列でソート
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // 指定件数に制限
    const limitedActivities = activities.slice(0, limit)
    
    console.log(`📊 活動統計: 仕入れ${recentPurchases.length}件, 納品${recentDeliveries.length}件, 請求書${recentInvoiceActivities.length}件`)
    console.log(`📋 最終活動数: ${limitedActivities.length}件`)
    
    console.log('=== 最近の活動API完了 ===')
    
    return NextResponse.json({
      success: true,
      data: {
        activities: limitedActivities,
        counts: {
          purchases: recentPurchases.length,
          deliveries: recentDeliveries.length,
          invoices: recentInvoiceActivities.length,
          total: limitedActivities.length,
        },
      },
    })
    
  } catch (error: any) {
    console.error('最近の活動API エラー:', error)
    return NextResponse.json(
      { error: error.message || '最近の活動データの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}