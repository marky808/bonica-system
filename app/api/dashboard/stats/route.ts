import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('=== ダッシュボード統計API開始 ===')
  
  try {
    await requireAuth(request)
    
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 当月の開始日と終了日
    const monthStart = new Date(currentYear, currentMonth - 1, 1)
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
    
    console.log(`📊 統計期間: ${monthStart.toISOString()} ～ ${monthEnd.toISOString()}`)
    
    // 当月仕入れ金額の集計
    const monthlyPurchases = await prisma.purchase.aggregate({
      where: {
        purchaseDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        price: true,
      },
      _count: {
        id: true,
      },
    })
    
    // 当月納品金額の集計
    const monthlyDeliveries = await prisma.delivery.aggregate({
      where: {
        deliveryDate: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: 'DELIVERED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    })
    
    // 在庫状況（remainingQuantity > 0の商品）
    const inventoryStats = await prisma.purchase.aggregate({
      where: {
        remainingQuantity: {
          gt: 0,
        },
      },
      _sum: {
        unitPrice: true,
      },
      _count: {
        id: true,
      },
    })
    
    // 在庫総額を計算（remainingQuantity * unitPrice）
    const inventoryItems = await prisma.purchase.findMany({
      where: {
        remainingQuantity: {
          gt: 0,
        },
      },
      select: {
        remainingQuantity: true,
        unitPrice: true,
      },
    })
    
    const totalInventoryValue = inventoryItems.reduce(
      (total, item) => total + (item.remainingQuantity * item.unitPrice),
      0
    )
    
    const monthlyPurchaseAmount = monthlyPurchases._sum.price || 0
    const monthlyDeliveryAmount = monthlyDeliveries._sum.totalAmount || 0
    const monthlyProfit = monthlyDeliveryAmount - monthlyPurchaseAmount
    const totalInventoryItems = inventoryStats._count.id || 0
    
    console.log(`📈 統計結果:`)
    console.log(`- 当月仕入れ: ${monthlyPurchaseAmount.toLocaleString()}円 (${monthlyPurchases._count.id}件)`)
    console.log(`- 当月納品: ${monthlyDeliveryAmount.toLocaleString()}円 (${monthlyDeliveries._count.id}件)`)
    console.log(`- 当月粗利: ${monthlyProfit.toLocaleString()}円`)
    console.log(`- 在庫: ${totalInventoryItems}品目, 総額${totalInventoryValue.toLocaleString()}円`)
    
    const stats = {
      monthlyPurchaseAmount,
      monthlyDeliveryAmount,
      monthlyProfit,
      totalInventoryValue,
      totalInventoryItems,
      period: {
        year: currentYear,
        month: currentMonth,
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      },
    }
    
    console.log('=== ダッシュボード統計API完了 ===')
    
    return NextResponse.json({
      success: true,
      data: stats,
    })
    
  } catch (error: any) {
    console.error('ダッシュボード統計API エラー:', error)
    return NextResponse.json(
      { error: error.message || 'ダッシュボード統計の取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}