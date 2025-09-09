#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDataConsistency() {
  console.log('🔍 データ連携整合性検証開始\n')
  
  try {
    // 1. 基本統計の取得
    const purchaseStats = await prisma.purchase.aggregate({
      _count: { id: true },
      _sum: {
        quantity: true,
        remainingQuantity: true,
        price: true
      }
    })
    
    const deliveryItemStats = await prisma.deliveryItem.aggregate({
      _count: { id: true },
      _sum: {
        quantity: true,
        amount: true
      }
    })
    
    const deliveryStats = await prisma.delivery.aggregate({
      _count: { id: true },
      _sum: { totalAmount: true }
    })
    
    console.log('📊 基本統計:')
    console.log(`  仕入データ: ${purchaseStats._count.id}件`)
    console.log(`  仕入総数量: ${purchaseStats._sum.quantity}`)
    console.log(`  残数量合計: ${purchaseStats._sum.remainingQuantity}`)
    console.log(`  使用済み数量: ${(purchaseStats._sum.quantity || 0) - (purchaseStats._sum.remainingQuantity || 0)}`)
    console.log(`  納品明細: ${deliveryItemStats._count.id}件`)
    console.log(`  納品総数量: ${deliveryItemStats._sum.quantity}`)
    console.log(`  納品データ: ${deliveryStats._count.id}件\n`)
    
    // 2. 残数量が0未満または元の数量を超える異常なデータをチェック
    const invalidPurchases = await prisma.purchase.findMany({
      where: {
        OR: [
          { remainingQuantity: { lt: 0 } },
          { 
            remainingQuantity: {
              gt: prisma.purchase.fields.quantity
            }
          }
        ]
      }
    })
    
    console.log('⚠️ 異常な残数量データ:')
    console.log(`  異常データ件数: ${invalidPurchases.length}`)
    if (invalidPurchases.length > 0) {
      invalidPurchases.forEach(purchase => {
        console.log(`    ID: ${purchase.id}, 商品: ${purchase.productName}`)
        console.log(`    元数量: ${purchase.quantity}, 残数量: ${purchase.remainingQuantity}`)
      })
    }
    console.log('')
    
    // 3. 納品明細と仕入データの整合性チェック
    console.log('🔗 納品明細と仕入データの整合性:')
    
    const deliveryItems = await prisma.deliveryItem.findMany({
      include: {
        purchase: true,
        delivery: true
      }
    })
    
    // 各仕入データに対する使用量の集計
    const usageByPurchase = new Map<string, number>()
    
    deliveryItems.forEach(item => {
      const currentUsage = usageByPurchase.get(item.purchaseId) || 0
      usageByPurchase.set(item.purchaseId, currentUsage + item.quantity)
    })
    
    let consistencyErrors = 0
    
    for (const [purchaseId, totalUsed] of usageByPurchase.entries()) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId }
      })
      
      if (purchase) {
        const calculatedRemaining = purchase.quantity - totalUsed
        if (Math.abs(calculatedRemaining - purchase.remainingQuantity) > 0.01) {
          console.log(`    ❌ 整合性エラー - 商品: ${purchase.productName}`)
          console.log(`       元数量: ${purchase.quantity}`)
          console.log(`       使用量: ${totalUsed}`)
          console.log(`       計算上残量: ${calculatedRemaining}`)
          console.log(`       DB残量: ${purchase.remainingQuantity}`)
          consistencyErrors++
        }
      }
    }
    
    console.log(`  整合性エラー: ${consistencyErrors}件\n`)
    
    // 4. ステータス別の分析
    const statusBreakdown = await prisma.purchase.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: {
        quantity: true,
        remainingQuantity: true
      }
    })
    
    console.log('📋 仕入データステータス別分析:')
    statusBreakdown.forEach(status => {
      const usedQuantity = (status._sum.quantity || 0) - (status._sum.remainingQuantity || 0)
      console.log(`  ${status.status}: ${status._count.id}件`)
      console.log(`    総数量: ${status._sum.quantity}, 残量: ${status._sum.remainingQuantity}, 使用済み: ${usedQuantity}`)
    })
    console.log('')
    
    // 5. 納品ステータス別分析
    const deliveryStatusBreakdown = await prisma.delivery.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalAmount: true }
    })
    
    console.log('🚚 納品データステータス別分析:')
    deliveryStatusBreakdown.forEach(status => {
      console.log(`  ${status.status}: ${status._count.id}件, 総額: ${status._sum.totalAmount?.toLocaleString()}円`)
    })
    console.log('')
    
    // 6. 最近の納品による在庫影響の検証
    const recentDeliveries = await prisma.delivery.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 過去1週間
        }
      },
      include: {
        items: {
          include: {
            purchase: true
          }
        },
        customer: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log('📅 最近の納品と在庫影響:')
    recentDeliveries.forEach(delivery => {
      console.log(`  納品ID: ${delivery.id.slice(0, 8)}..., 顧客: ${delivery.customer.companyName}`)
      console.log(`  日時: ${delivery.createdAt.toLocaleString()}, ステータス: ${delivery.status}`)
      delivery.items.forEach(item => {
        console.log(`    商品: ${item.purchase.productName}, 納品量: ${item.quantity}, 残量: ${item.purchase.remainingQuantity}`)
      })
    })
    console.log('')
    
    // 7. 在庫切れ商品の確認
    const outOfStockItems = await prisma.purchase.findMany({
      where: {
        remainingQuantity: { lte: 0 }
      },
      include: {
        category: true,
        supplier: true
      }
    })
    
    console.log('📦 在庫切れ商品:')
    console.log(`  在庫切れ件数: ${outOfStockItems.length}`)
    outOfStockItems.slice(0, 10).forEach(item => {
      console.log(`    ${item.productName} (${item.category.name}) - 残量: ${item.remainingQuantity}`)
    })
    
    // 8. 総合判定
    console.log('\n✅ 総合判定:')
    if (consistencyErrors === 0 && invalidPurchases.length === 0) {
      console.log('  🎉 データ整合性: 正常')
      console.log('  📊 在庫管理: 正常に動作中')
      console.log('  🔄 仕入→納品→在庫の連携: 正常')
    } else {
      console.log('  ⚠️ データ整合性: 問題あり')
      console.log(`     - 整合性エラー: ${consistencyErrors}件`)
      console.log(`     - 異常データ: ${invalidPurchases.length}件`)
      console.log('  🔧 修正が必要です')
    }
    
    console.log('\n✨ データ連携整合性検証完了!')
    
  } catch (error) {
    console.error('❌ 検証エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyDataConsistency().catch(console.error)
}

export { verifyDataConsistency }