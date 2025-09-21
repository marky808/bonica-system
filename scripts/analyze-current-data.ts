#!/usr/bin/env tsx

/**
 * 現在のデータ状況分析スクリプト
 * 仕入れ→在庫→納品の流れを確認
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeCurrentData() {
  console.log('📊 現在のデータ状況分析開始')

  try {
    // 1. 仕入れデータ分析
    console.log('\n=== 🛒 仕入れデータ分析 ===')
    const purchases = await prisma.purchase.findMany({
      include: {
        category: true,
        supplier: true
      }
    })

    console.log(`仕入れ件数: ${purchases.length}件`)

    purchases.forEach(purchase => {
      console.log(`  - ${purchase.productName}: ${purchase.quantity}${purchase.unit} (残り: ${purchase.remainingQuantity}) - ステータス: ${purchase.status}`)
      console.log(`    カテゴリ: ${purchase.category.name}, 仕入先: ${purchase.supplier.companyName}`)
      console.log(`    単価: ${purchase.unitPrice}円, 総額: ${purchase.price}円`)
    })

    // 2. 在庫状況分析
    console.log('\n=== 📦 在庫状況分析 ===')
    const availableStock = purchases.filter(p => p.remainingQuantity > 0)
    console.log(`在庫有り商品: ${availableStock.length}件`)

    availableStock.forEach(stock => {
      console.log(`  ✅ ${stock.productName}: ${stock.remainingQuantity}${stock.unit} 在庫有り`)
    })

    const outOfStock = purchases.filter(p => p.remainingQuantity === 0)
    console.log(`\n在庫切れ商品: ${outOfStock.length}件`)

    outOfStock.forEach(stock => {
      console.log(`  ❌ ${stock.productName}: 在庫切れ`)
    })

    // 3. 顧客データ分析
    console.log('\n=== 👥 顧客データ分析 ===')
    const customers = await prisma.customer.findMany()
    console.log(`顧客数: ${customers.length}件`)

    customers.forEach(customer => {
      console.log(`  - ${customer.companyName} (担当: ${customer.contactPerson})`)
      console.log(`    配送先: ${customer.deliveryAddress}`)
    })

    // 4. 既存納品データ分析
    console.log('\n=== 📋 既存納品データ分析 ===')
    const deliveries = await prisma.delivery.findMany({
      include: {
        customer: true,
        items: {
          include: {
            purchase: true
          }
        }
      }
    })

    console.log(`納品件数: ${deliveries.length}件`)

    deliveries.forEach(delivery => {
      console.log(`  - ${delivery.customer.companyName}: ${delivery.totalAmount}円 (${delivery.status})`)
      console.log(`    納品日: ${delivery.deliveryDate.toISOString().split('T')[0]}`)
      console.log(`    アイテム数: ${delivery.items.length}件`)
      delivery.items.forEach(item => {
        console.log(`      * ${item.purchase.productName}: ${item.quantity}${item.purchase.unit} × ${item.unitPrice}円`)
      })
    })

    // 5. テストデータ作成に向けた推奨事項
    console.log('\n=== 💡 テストデータ作成推奨事項 ===')

    if (availableStock.length === 0) {
      console.log('⚠️ 在庫が全くありません。新しい仕入れデータを作成する必要があります。')
    } else {
      console.log('✅ 在庫があります。納品テストが可能です。')
    }

    if (customers.length === 0) {
      console.log('⚠️ 顧客データがありません。新しい顧客データを作成する必要があります。')
    } else {
      console.log('✅ 顧客データがあります。納品テストが可能です。')
    }

    // 6. 推奨テストシナリオ
    console.log('\n=== 🎯 推奨テストシナリオ ===')
    console.log('1. 新しい仕入れデータを作成（十分な在庫確保）')
    console.log('2. 在庫内で納品可能な数量で納品データ作成')
    console.log('3. 在庫不足エラーのテスト（在庫を超える数量での納品テスト）')
    console.log('4. 複数商品での納品テスト')
    console.log('5. Google Sheets納品書作成テスト')

  } catch (error) {
    console.error('❌ データ分析エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeCurrentData()