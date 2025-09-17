#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface TestData {
  purchases: Array<{
    productName: string
    quantity: number
    unitPrice: number
    unit: string
    taxType: 'TAXABLE' | 'TAX_INCLUDED'
  }>
  deliveries: Array<{
    customerName: string
    items: Array<{
      productName: string
      quantity: number
    }>
  }>
}

const testData: TestData = {
  purchases: [
    { productName: 'いちご', quantity: 5, unitPrice: 1500, unit: 'kg', taxType: 'TAXABLE' },
    { productName: 'トマト', quantity: 10, unitPrice: 800, unit: '箱', taxType: 'TAX_INCLUDED' },
    { productName: 'きゅうり', quantity: 15, unitPrice: 50, unit: '本', taxType: 'TAXABLE' }
  ],
  deliveries: [
    {
      customerName: 'A商店',
      items: [
        { productName: 'いちご', quantity: 2 },
        { productName: 'トマト', quantity: 3 }
      ]
    },
    {
      customerName: 'B八百屋',
      items: [
        { productName: 'きゅうり', quantity: 8 }
      ]
    },
    {
      customerName: 'C市場',
      items: [
        { productName: 'いちご', quantity: 3 },
        { productName: 'トマト', quantity: 7 },
        { productName: 'きゅうり', quantity: 7 }
      ]
    }
  ]
}

async function clearDatabase() {
  console.log('🧹 既存データクリア中...')

  await prisma.deliveryItem.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.category.deleteMany()
  await prisma.invoice.deleteMany()

  console.log('✅ データベースクリア完了')
}

async function createBasicData() {
  console.log('📝 基本データ作成中...')

  // 管理者ユーザー確認・作成
  const adminUser = await prisma.user.findFirst({
    where: { email: '808works.jp@gmail.com' }
  })

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('6391', 10)
    await prisma.user.create({
      data: {
        email: '808works.jp@gmail.com',
        password: hashedPassword,
        name: '小西正高',
        role: 'admin'
      }
    })
    console.log('✅ 管理者ユーザー作成完了')
  }

  // カテゴリ作成
  await prisma.category.createMany({
    data: [
      { name: '果菜類' },
      { name: '果物類' },
      { name: '葉物野菜' }
    ]
  })

  // 仕入先作成
  await prisma.supplier.create({
    data: {
      companyName: 'テスト農園株式会社',
      contactPerson: '田中太郎',
      phone: '090-1234-5678',
      address: '東京都練馬区大泉町1-1-1',
      paymentTerms: '月末締翌月末払い',
      deliveryConditions: '配送料込み'
    }
  })

  // 顧客作成
  const customers = [
    { name: 'A商店', contact: '佐藤花子', phone: '03-1234-5678' },
    { name: 'B八百屋', contact: '鈴木一郎', phone: '03-2345-6789' },
    { name: 'C市場', contact: '高橋美咲', phone: '03-3456-7890' }
  ]

  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        companyName: customer.name,
        contactPerson: customer.contact,
        phone: customer.phone,
        deliveryAddress: '東京都渋谷区1-1-1',
        billingAddress: '東京都渋谷区1-1-1',
        billingCycle: 'monthly',
        billingDay: 31,
        paymentTerms: '月末締翌月末払い'
      }
    })
  }

  console.log('✅ 基本データ作成完了')
}

async function createPurchaseData() {
  console.log('📦 仕入データ作成中...')

  const supplier = await prisma.supplier.findFirst()
  const categories = await prisma.category.findMany()

  if (!supplier) throw new Error('仕入先が見つかりません')

  const categoryMap = {
    'いちご': categories.find(c => c.name === '果物類')?.id,
    'トマト': categories.find(c => c.name === '果菜類')?.id,
    'きゅうり': categories.find(c => c.name === '果菜類')?.id
  }

  for (const purchase of testData.purchases) {
    const categoryId = categoryMap[purchase.productName as keyof typeof categoryMap]
    if (!categoryId) continue

    await prisma.purchase.create({
      data: {
        productName: purchase.productName,
        categoryId,
        quantity: purchase.quantity,
        unit: purchase.unit,
        unitPrice: purchase.unitPrice,
        price: purchase.quantity * purchase.unitPrice,
        taxType: purchase.taxType,
        supplierId: supplier.id,
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
        status: 'UNUSED',
        remainingQuantity: purchase.quantity
      }
    })
  }

  console.log('✅ 仕入データ作成完了')
}

async function createDeliveryData() {
  console.log('🚚 納品データ作成中...')

  const customers = await prisma.customer.findMany()
  const purchases = await prisma.purchase.findMany()

  for (const deliveryData of testData.deliveries) {
    const customer = customers.find(c => c.companyName === deliveryData.customerName)
    if (!customer) continue

    let totalAmount = 0
    const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 納品作成
    const delivery = await prisma.delivery.create({
      data: {
        id: deliveryId,
        customerId: customer.id,
        deliveryDate: new Date(),
        totalAmount: 0, // 後で更新
        status: 'DELIVERED'
      }
    })

    // 納品明細作成
    for (const item of deliveryData.items) {
      const purchase = purchases.find(p => p.productName === item.productName)
      if (!purchase) continue

      // 販売価格は仕入価格の1.5倍
      const unitPrice = Math.round(purchase.unitPrice * 1.5)
      const amount = item.quantity * unitPrice
      totalAmount += amount

      await prisma.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          purchaseId: purchase.id,
          quantity: item.quantity,
          unitPrice,
          amount
        }
      })

      // 在庫更新
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          remainingQuantity: purchase.remainingQuantity - item.quantity,
          status: purchase.remainingQuantity - item.quantity <= 0 ? 'USED' : 'PARTIALLY_USED'
        }
      })
    }

    // 合計金額更新
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { totalAmount }
    })
  }

  console.log('✅ 納品データ作成完了')
}

async function generateCustomTestData() {
  console.log('🚀 カスタムテストデータ生成開始')

  try {
    await clearDatabase()
    await createBasicData()
    await createPurchaseData()
    await createDeliveryData()

    // データ統計表示
    const stats = {
      categories: await prisma.category.count(),
      suppliers: await prisma.supplier.count(),
      customers: await prisma.customer.count(),
      purchases: await prisma.purchase.count(),
      deliveries: await prisma.delivery.count(),
      deliveryItems: await prisma.deliveryItem.count()
    }

    console.log('\n📊 生成されたテストデータ統計:')
    console.table(stats)

    console.log('\n✨ カスタムテストデータ生成完了!')

  } catch (error) {
    console.error('❌ テストデータ生成エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  generateCustomTestData().catch(console.error)
}

export { generateCustomTestData }