#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPurchaseQuantities() {
  console.log('🔧 仕入データ残数量修正開始\n')
  
  try {
    // Get all purchases
    const purchases = await prisma.purchase.findMany({
      include: {
        deliveryItems: {
          include: {
            delivery: true
          }
        }
      }
    })

    console.log(`📦 修正対象の仕入データ: ${purchases.length}件`)

    let fixedCount = 0
    let errorCount = 0

    // Process each purchase
    for (const purchase of purchases) {
      try {
        // Calculate total delivered quantity (only for DELIVERED status)
        const totalDelivered = purchase.deliveryItems
          .filter(item => item.delivery.status === 'DELIVERED')
          .reduce((sum, item) => sum + item.quantity, 0)

        const correctRemainingQuantity = purchase.quantity - totalDelivered
        const correctStatus = correctRemainingQuantity <= 0 ? 'USED' : 
                             correctRemainingQuantity < purchase.quantity ? 'PARTIAL' : 'UNUSED'

        // Only update if values are different
        if (Math.abs(purchase.remainingQuantity - correctRemainingQuantity) > 0.001 || 
            purchase.status !== correctStatus) {
          
          console.log(`📝 修正中: ${purchase.productName}`)
          console.log(`   元数量: ${purchase.quantity}`)
          console.log(`   使用量: ${totalDelivered} (DELIVEREDのみ)`)
          console.log(`   現在残量: ${purchase.remainingQuantity} → 正しい残量: ${correctRemainingQuantity}`)
          console.log(`   現在ステータス: ${purchase.status} → 正しいステータス: ${correctStatus}`)

          await prisma.purchase.update({
            where: { id: purchase.id },
            data: {
              remainingQuantity: correctRemainingQuantity,
              status: correctStatus
            }
          })

          fixedCount++
        }
      } catch (error) {
        console.error(`❌ ${purchase.productName}の修正エラー:`, error)
        errorCount++
      }
    }

    console.log(`\n✅ 修正完了:`)
    console.log(`   修正件数: ${fixedCount}`)
    console.log(`   エラー件数: ${errorCount}`)
    console.log(`   処理総数: ${purchases.length}`)

    // Verification
    console.log('\n🔍 修正後の検証:')
    
    const statusStats = await prisma.purchase.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: {
        quantity: true,
        remainingQuantity: true
      }
    })

    statusStats.forEach(stat => {
      const usedQuantity = (stat._sum.quantity || 0) - (stat._sum.remainingQuantity || 0)
      console.log(`   ${stat.status}: ${stat._count.id}件, 使用済み: ${usedQuantity.toFixed(1)}`)
    })

    // Check for negative remaining quantities
    const negativeQuantities = await prisma.purchase.count({
      where: {
        remainingQuantity: { lt: 0 }
      }
    })

    console.log(`   マイナス在庫: ${negativeQuantities}件`)

    console.log('\n✨ 残数量修正完了!')

  } catch (error) {
    console.error('❌ 修正エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixPurchaseQuantities().catch(console.error)
}

export { fixPurchaseQuantities }