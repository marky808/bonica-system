#!/usr/bin/env tsx

/**
 * 仕入れ→在庫→納品の完全な流れのテストデータ作成スクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createComprehensiveTestData() {
  console.log('🚀 包括的テストデータ作成開始')

  try {
    // 1. 既存データの確認
    console.log('\n=== 📊 既存データ確認 ===')
    const existingPurchases = await prisma.purchase.count()
    const existingCustomers = await prisma.customer.count()
    const existingDeliveries = await prisma.delivery.count()

    console.log(`既存仕入れ: ${existingPurchases}件`)
    console.log(`既存顧客: ${existingCustomers}件`)
    console.log(`既存納品: ${existingDeliveries}件`)

    // 2. 新しい仕入れデータを追加（豊富な在庫確保）
    console.log('\n=== 🛒 新しい仕入れデータ作成 ===')

    // カテゴリとサプライヤーの取得
    const categories = await prisma.category.findMany()
    const suppliers = await prisma.supplier.findMany()

    if (categories.length === 0 || suppliers.length === 0) {
      console.error('❌ カテゴリまたはサプライヤーが存在しません')
      return
    }

    const fruitCategory = categories.find(c => c.name === '果物類')
    const vegetableCategory = categories.find(c => c.name === '果菜類')
    const supplier = suppliers[0]

    if (!fruitCategory || !vegetableCategory) {
      console.error('❌ 必要なカテゴリが見つかりません')
      return
    }

    // 新しい仕入れデータ
    const newPurchases = [
      {
        productName: 'りんご',
        categoryId: fruitCategory.id,
        quantity: 20.0,
        unit: 'kg',
        unitPrice: 300,
        price: 6000,
        supplierId: supplier.id,
        purchaseDate: new Date('2025-09-21'),
        remainingQuantity: 20.0
      },
      {
        productName: 'みかん',
        categoryId: fruitCategory.id,
        quantity: 30.0,
        unit: 'kg',
        unitPrice: 250,
        price: 7500,
        supplierId: supplier.id,
        purchaseDate: new Date('2025-09-21'),
        remainingQuantity: 30.0
      },
      {
        productName: 'にんじん',
        categoryId: vegetableCategory.id,
        quantity: 50.0,
        unit: '本',
        unitPrice: 80,
        price: 4000,
        supplierId: supplier.id,
        purchaseDate: new Date('2025-09-21'),
        remainingQuantity: 50.0
      },
      {
        productName: 'キャベツ',
        categoryId: vegetableCategory.id,
        quantity: 15.0,
        unit: '玉',
        unitPrice: 150,
        price: 2250,
        supplierId: supplier.id,
        purchaseDate: new Date('2025-09-21'),
        remainingQuantity: 15.0
      },
      {
        productName: 'じゃがいも',
        categoryId: vegetableCategory.id,
        quantity: 100.0,
        unit: '個',
        unitPrice: 50,
        price: 5000,
        supplierId: supplier.id,
        purchaseDate: new Date('2025-09-21'),
        remainingQuantity: 100.0
      }
    ]

    const createdPurchases = []
    for (const purchaseData of newPurchases) {
      const purchase = await prisma.purchase.create({
        data: purchaseData,
        include: {
          category: true,
          supplier: true
        }
      })
      createdPurchases.push(purchase)
      console.log(`✅ 仕入れ作成: ${purchase.productName} ${purchase.quantity}${purchase.unit} (残り: ${purchase.remainingQuantity})`)
    }

    // 3. 新しい顧客データ作成
    console.log('\n=== 👥 新しい顧客データ作成 ===')

    const newCustomers = [
      {
        companyName: 'D商店',
        contactPerson: '田中太郎',
        phone: '03-1234-5678',
        deliveryAddress: '東京都新宿区1-2-3',
        billingAddress: '東京都新宿区1-2-3'
      },
      {
        companyName: 'E八百屋',
        contactPerson: '山田花子',
        phone: '03-9876-5432',
        deliveryAddress: '東京都渋谷区4-5-6',
        billingAddress: '東京都渋谷区4-5-6'
      }
    ]

    const createdCustomers = []
    for (const customerData of newCustomers) {
      try {
        const customer = await prisma.customer.create({
          data: customerData
        })
        createdCustomers.push(customer)
        console.log(`✅ 顧客作成: ${customer.companyName} (担当: ${customer.contactPerson})`)
      } catch (error) {
        console.log(`⚠️ 顧客 ${customerData.companyName} は既に存在します`)
      }
    }

    // 4. 在庫状況確認
    console.log('\n=== 📦 最新在庫状況 ===')
    const allPurchases = await prisma.purchase.findMany({
      where: {
        remainingQuantity: {
          gt: 0
        }
      },
      include: {
        category: true,
        supplier: true
      }
    })

    console.log('利用可能な在庫:')
    allPurchases.forEach(purchase => {
      console.log(`  - ${purchase.productName}: ${purchase.remainingQuantity}${purchase.unit} (ID: ${purchase.id})`)
    })

    // 5. テストシナリオ用納品データ作成
    console.log('\n=== 📋 テストシナリオ用納品データ作成 ===')

    const allCustomers = await prisma.customer.findMany()
    if (allCustomers.length === 0) {
      console.error('❌ 顧客データがありません')
      return
    }

    // シナリオ1: 正常な納品（在庫範囲内）
    console.log('\n--- シナリオ1: 正常な納品 ---')
    const scenario1Customer = allCustomers[0]
    const scenario1Items = [
      {
        purchaseId: allPurchases[0].id, // りんご
        quantity: 5.0,
        unitPrice: 400
      },
      {
        purchaseId: allPurchases[1].id, // みかん
        quantity: 8.0,
        unitPrice: 350
      }
    ]

    console.log(`顧客: ${scenario1Customer.companyName}`)
    scenario1Items.forEach((item, index) => {
      const purchase = allPurchases.find(p => p.id === item.purchaseId)
      console.log(`  - ${purchase?.productName}: ${item.quantity}${purchase?.unit} × ${item.unitPrice}円 (在庫: ${purchase?.remainingQuantity})`)
    })

    // シナリオ2: 在庫ぎりぎりの納品
    console.log('\n--- シナリオ2: 在庫ぎりぎりの納品 ---')
    const scenario2Customer = allCustomers[1] || allCustomers[0]
    const scenario2Items = [
      {
        purchaseId: allPurchases[2].id, // にんじん
        quantity: 30.0, // 在庫50本中30本使用
        unitPrice: 120
      }
    ]

    console.log(`顧客: ${scenario2Customer.companyName}`)
    scenario2Items.forEach((item, index) => {
      const purchase = allPurchases.find(p => p.id === item.purchaseId)
      console.log(`  - ${purchase?.productName}: ${item.quantity}${purchase?.unit} × ${item.unitPrice}円 (在庫: ${purchase?.remainingQuantity})`)
    })

    // 6. テストデータサマリー
    console.log('\n=== 📊 テストデータサマリー ===')
    const finalPurchases = await prisma.purchase.count()
    const finalCustomers = await prisma.customer.count()

    console.log(`総仕入れ件数: ${finalPurchases}件`)
    console.log(`総顧客数: ${finalCustomers}件`)
    console.log('✅ 仕入れ→在庫→納品の流れをテストする準備が完了しました')

    // 7. 推奨テスト手順
    console.log('\n=== 🎯 推奨テスト手順 ===')
    console.log('1. シナリオ1の納品データ作成（正常パターン）')
    console.log('2. 作成した納品でGoogle Sheets納品書生成テスト')
    console.log('3. シナリオ2の納品データ作成（在庫ぎりぎりパターン）')
    console.log('4. 在庫を超える数量での納品作成テスト（エラー期待）')
    console.log('5. 本番環境での同様のテスト実行')

    return {
      createdPurchases,
      createdCustomers: createdCustomers.length > 0 ? createdCustomers : allCustomers.slice(0, 2),
      scenario1: { customer: scenario1Customer, items: scenario1Items },
      scenario2: { customer: scenario2Customer, items: scenario2Items },
      availableStock: allPurchases
    }

  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createComprehensiveTestData()