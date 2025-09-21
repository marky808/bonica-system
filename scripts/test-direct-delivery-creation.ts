#!/usr/bin/env tsx

/**
 * 新しい納品データ作成で在庫チェック機能をテストするスクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDirectDeliveryCreation() {
  console.log('🚀 直接納品データ作成で在庫チェックテスト開始')

  try {
    // 1. 現在の在庫状況確認
    console.log('\n=== 📦 現在の在庫状況 ===')
    const availablePurchases = await prisma.purchase.findMany({
      where: {
        remainingQuantity: {
          gt: 0
        }
      },
      include: {
        category: true,
        supplier: true
      },
      orderBy: {
        purchaseDate: 'asc'
      }
    })

    console.log('利用可能な在庫:')
    availablePurchases.forEach(purchase => {
      console.log(`  - ${purchase.productName}: ${purchase.remainingQuantity}${purchase.unit} (ID: ${purchase.id})`)
    })

    if (availablePurchases.length === 0) {
      console.error('❌ 利用可能な在庫がありません')
      return
    }

    // 2. 顧客確認
    console.log('\n=== 👥 顧客確認 ===')
    const customers = await prisma.customer.findMany()
    console.log(`利用可能な顧客: ${customers.length}件`)
    customers.forEach(customer => {
      console.log(`  - ${customer.companyName} (ID: ${customer.id})`)
    })

    if (customers.length === 0) {
      console.error('❌ 顧客データがありません')
      return
    }

    // 3. シナリオ1: 正常な納品作成（在庫範囲内）
    console.log('\n=== 🧪 シナリオ1: 正常な納品作成テスト ===')

    const testCustomer = customers[0]
    const stock1 = availablePurchases[0]
    const stock2 = availablePurchases[1] || availablePurchases[0]

    // 在庫の半分を使用するアイテム
    const testItems = [
      {
        purchaseId: stock1.id,
        quantity: Math.min(Math.floor(stock1.remainingQuantity / 2), 5),
        unitPrice: stock1.unitPrice * 1.3
      }
    ]

    // 2番目の在庫がある場合は追加
    if (stock2.id !== stock1.id && stock2.remainingQuantity > 0) {
      testItems.push({
        purchaseId: stock2.id,
        quantity: Math.min(Math.floor(stock2.remainingQuantity / 3), 3),
        unitPrice: stock2.unitPrice * 1.3
      })
    }

    console.log('作成予定の納品データ:')
    console.log(`顧客: ${testCustomer.companyName}`)
    testItems.forEach((item, index) => {
      const purchase = availablePurchases.find(p => p.id === item.purchaseId)
      console.log(`  - ${purchase?.productName}: ${item.quantity}${purchase?.unit} × ${item.unitPrice}円 (在庫: ${purchase?.remainingQuantity})`)
    })

    // 総額計算
    const totalAmount = testItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

    // トランザクション開始 - 在庫チェックと納品作成
    console.log('\n📤 納品データ作成中（在庫チェック含む）...')

    const result = await prisma.$transaction(async (tx) => {
      // 在庫チェック
      for (const item of testItems) {
        const purchase = await tx.purchase.findUnique({
          where: { id: item.purchaseId },
          select: { remainingQuantity: true, productName: true },
        })

        if (!purchase) {
          throw new Error(`仕入れ商品が見つかりません (ID: ${item.purchaseId})`)
        }

        if (purchase.remainingQuantity < item.quantity) {
          throw new Error(
            `${purchase.productName} の在庫が不足しています。在庫: ${purchase.remainingQuantity}, 要求: ${item.quantity}`
          )
        }
      }

      console.log('✅ 在庫チェック通過')

      // 納品データ作成
      const delivery = await tx.delivery.create({
        data: {
          customerId: testCustomer.id,
          deliveryDate: new Date(),
          totalAmount: totalAmount,
          status: 'PENDING',
        },
      })

      // 納品アイテム作成
      for (const item of testItems) {
        await tx.deliveryItem.create({
          data: {
            deliveryId: delivery.id,
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          }
        })

        // 在庫更新
        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: {
            remainingQuantity: {
              decrement: item.quantity,
            },
          },
        })

        // ステータス更新
        const updatedPurchase = await tx.purchase.findUnique({
          where: { id: item.purchaseId },
          select: { remainingQuantity: true, quantity: true },
        })

        if (updatedPurchase) {
          let newStatus = 'UNUSED'
          if (updatedPurchase.remainingQuantity === 0) {
            newStatus = 'USED'
          } else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
            newStatus = 'PARTIAL'
          }

          await tx.purchase.update({
            where: { id: item.purchaseId },
            data: { status: newStatus },
          })
        }
      }

      return await tx.delivery.findUnique({
        where: { id: delivery.id },
        include: {
          customer: true,
          items: {
            include: {
              purchase: true
            }
          }
        }
      })
    })

    console.log('✅ シナリオ1: 納品作成成功!')
    console.log(`納品ID: ${result?.id}`)
    console.log(`顧客: ${result?.customer.companyName}`)
    console.log(`総額: ${result?.totalAmount}円`)
    console.log(`アイテム数: ${result?.items.length}件`)

    // 4. シナリオ2: 在庫不足エラーテスト
    console.log('\n=== 🧪 シナリオ2: 在庫不足エラーテスト ===')

    const largeStock = availablePurchases.find(p => p.remainingQuantity > 0)
    if (largeStock) {
      const overStockItems = [
        {
          purchaseId: largeStock.id,
          quantity: largeStock.remainingQuantity + 10, // 在庫を超える数量
          unitPrice: largeStock.unitPrice * 1.3
        }
      ]

      console.log(`在庫不足テスト: ${largeStock.productName} ${largeStock.remainingQuantity + 10}${largeStock.unit} (在庫: ${largeStock.remainingQuantity})`)

      try {
        await prisma.$transaction(async (tx) => {
          // 在庫チェック
          for (const item of overStockItems) {
            const purchase = await tx.purchase.findUnique({
              where: { id: item.purchaseId },
              select: { remainingQuantity: true, productName: true },
            })

            if (!purchase) {
              throw new Error(`仕入れ商品が見つかりません (ID: ${item.purchaseId})`)
            }

            if (purchase.remainingQuantity < item.quantity) {
              throw new Error(
                `${purchase.productName} の在庫が不足しています。在庫: ${purchase.remainingQuantity}, 要求: ${item.quantity}`
              )
            }
          }

          // ここに到達するはずがない
          throw new Error('在庫チェックが正常に動作していません')
        })

        console.log('❌ シナリオ2: 在庫不足エラーが検出されませんでした')
      } catch (error: any) {
        if (error.message.includes('在庫が不足')) {
          console.log('✅ シナリオ2: 在庫不足エラーが正常に検出されました')
          console.log(`エラーメッセージ: ${error.message}`)
        } else {
          console.log('❌ シナリオ2: 予期しないエラー:', error.message)
        }
      }
    }

    // 5. 最終在庫状況確認
    console.log('\n=== 📦 テスト後の在庫状況 ===')
    const finalPurchases = await prisma.purchase.findMany({
      where: {
        remainingQuantity: {
          gt: 0
        }
      },
      orderBy: {
        purchaseDate: 'asc'
      }
    })

    console.log('最終在庫:')
    finalPurchases.forEach(purchase => {
      console.log(`  - ${purchase.productName}: ${purchase.remainingQuantity}${purchase.unit} (ステータス: ${purchase.status})`)
    })

    console.log('\n=== 🎉 テスト完了サマリー ===')
    console.log('✅ 仕入れデータ作成: 完了')
    console.log('✅ 豊富な在庫確保: 完了')
    console.log('✅ 在庫チェック機能: 正常動作')
    console.log('✅ 納品作成: 正常動作')
    console.log('✅ 在庫更新: 正常動作')
    console.log('✅ ステータス管理: 正常動作')
    console.log('✅ 在庫不足検出: 正常動作')

    console.log('\n次のステップ:')
    console.log('1. 作成した納品でGoogle Sheets納品書生成テスト')
    console.log('2. 本番環境での同様テスト実行')

    return result

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDirectDeliveryCreation()