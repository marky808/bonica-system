#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 日本語ロケール設定（新しいAPI）
faker.setDefaultRefDate(new Date())

interface TestDataConfig {
  customers: number
  suppliers: number  
  categories: number
  purchasesPerMonth: number
  deliveriesPerMonth: number
  monthsOfHistory: number
}

const config: TestDataConfig = {
  customers: 12,
  suppliers: 8, 
  categories: 6,
  purchasesPerMonth: 30,
  deliveriesPerMonth: 25,
  monthsOfHistory: 3
}

// 日本語データ生成用ヘルパー
const japaneseCompanyNames = [
  '田中農園株式会社', '山田ファーム', '佐藤農業', '鈴木青果', '高橋野菜',
  '伊藤農産', '渡辺ハウス', '中村グリーン', '小林農場', 'みどり商事',
  '大地の恵み株式会社', '自然農法研究所', '有機野菜センター', '新鮮市場株式会社'
]

const japaneseProductNames = [
  'トマト', 'きゅうり', 'なす', 'ピーマン', 'オクラ', 'ズッキーニ',
  'レタス', 'キャベツ', '白菜', '小松菜', 'ほうれん草', '水菜',
  'じゃがいも', 'にんじん', '玉ねぎ', '大根', 'かぶ', 'ごぼう',
  'いちご', 'りんご', 'みかん', 'ぶどう', 'なし', 'もも'
]

const categories = [
  '葉物野菜', '果菜類', '根菜類', '果物類', '香味野菜', 'その他'
]

const units = ['kg', 'g', '個', 'パック', '箱', '袋']

const paymentTerms = ['即金', '7日後', '15日後', '30日後', '60日後', '月末締翌月末払い']
const billingCycles = ['monthly', 'weekly', 'immediate']

async function clearDatabase() {
  console.log('🧹 データベースをクリア中...')
  
  await prisma.deliveryItem.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.category.deleteMany()
  await prisma.invoice.deleteMany()
  
  console.log('✅ データベースクリア完了')
}

async function seedCategories() {
  console.log('📝 カテゴリデータ生成中...')
  
  const categoryData = categories.map(name => ({
    name,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: new Date()
  }))
  
  await prisma.category.createMany({ data: categoryData })
  console.log(`✅ ${categories.length}件のカテゴリを作成`)
}

async function seedSuppliers() {
  console.log('🏢 仕入先データ生成中...')
  
  const japaneseNames = [
    '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '伊藤健太',
    '渡辺由美', '山本智也', '中村恵子', '小林大輔', '加藤真理子'
  ]

  const japanesePrefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'
  ]

  const supplierData = Array.from({ length: config.suppliers }, (_, i) => ({
    companyName: japaneseCompanyNames[i] || `${faker.company.name()}農園`,
    contactPerson: japaneseNames[i] || faker.helpers.arrayElement(japaneseNames),
    phone: faker.phone.number('0##-####-####'),
    address: `${faker.helpers.arrayElement(japanesePrefectures)}${faker.location.city()}${faker.location.streetAddress()}`,
    paymentTerms: faker.helpers.arrayElement(paymentTerms),
    deliveryConditions: faker.helpers.arrayElement(['配送料込み', '配送料別途', '現地引取', '午前中配送', '時間指定可']),
    specialNotes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: new Date()
  }))
  
  await prisma.supplier.createMany({ data: supplierData })
  console.log(`✅ ${config.suppliers}件の仕入先を作成`)
}

async function seedCustomers() {
  console.log('👥 顧客データ生成中...')
  
  const customerData = Array.from({ length: config.customers }, (_, i) => {
    const billingCycle = faker.helpers.arrayElement(billingCycles)
    const paymentTermsVal = faker.helpers.arrayElement(paymentTerms)
    const billingDay = billingCycle === 'monthly' ? faker.number.int({ min: 1, max: 31 }) : 31
    
    return {
      companyName: japaneseCompanyNames[i + config.suppliers] || `${faker.company.name()}商事`,
      contactPerson: faker.person.fullName(),
      phone: faker.string.numeric({ length: 11, prefix: '0' }).replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3'),
      deliveryAddress: `${faker.location.state()}${faker.location.city()}${faker.location.streetAddress()}`,
      billingAddress: `${faker.location.state()}${faker.location.city()}${faker.location.streetAddress()}`,
      deliveryTimePreference: faker.helpers.arrayElement(['午前', '午後', '指定なし']),
      specialRequests: Math.random() > 0.8 ? faker.lorem.sentence() : null,
      specialNotes: Math.random() > 0.8 ? faker.lorem.sentence() : null,
      billingCycle,
      billingDay,
      paymentTerms: paymentTermsVal,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    }
  })
  
  await prisma.customer.createMany({ data: customerData })
  console.log(`✅ ${config.customers}件の顧客を作成`)
}

async function seedPurchases() {
  console.log('📦 仕入データ生成中...')
  
  const suppliers = await prisma.supplier.findMany()
  const categories = await prisma.category.findMany()
  
  const purchases = []
  const now = new Date()
  
  for (let month = 0; month < config.monthsOfHistory; month++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1)
    
    for (let i = 0; i < config.purchasesPerMonth; i++) {
      const supplier = faker.helpers.arrayElement(suppliers)
      const category = faker.helpers.arrayElement(categories)
      const productName = faker.helpers.arrayElement(japaneseProductNames)
      const unit = faker.helpers.arrayElement(units)
      const quantity = faker.number.float({ min: 1, max: 50, multipleOf: 0.1 })
      const unitPrice = faker.number.int({ min: 50, max: 2000 })
      const price = quantity * unitPrice
      
      const purchaseDate = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(), 
        faker.number.int({ min: 1, max: 28 }),
        faker.number.int({ min: 8, max: 17 })
      )
      
      purchases.push({
        productName,
        categoryId: category.id,
        quantity,
        unit,
        unitNote: Math.random() > 0.8 ? `${unit}あたり約${faker.number.int({ min: 100, max: 500 })}g` : null,
        unitPrice,
        price,
        taxType: 'TAXABLE',
        supplierId: supplier.id,
        purchaseDate,
        expiryDate: faker.date.future({ days: faker.number.int({ min: 3, max: 14 }), refDate: purchaseDate }),
        deliveryFee: Math.random() > 0.7 ? `${faker.number.int({ min: 200, max: 1000 })}円` : null,
        status: 'UNUSED',
        remainingQuantity: quantity,
        createdAt: purchaseDate,
        updatedAt: new Date()
      })
    }
  }
  
  await prisma.purchase.createMany({ data: purchases })
  console.log(`✅ ${purchases.length}件の仕入データを作成`)
}

async function seedDeliveries() {
  console.log('🚚 納品データ生成中...')
  
  const customers = await prisma.customer.findMany()
  const purchases = await prisma.purchase.findMany({
    where: { remainingQuantity: { gt: 0 } }
  })
  
  const deliveries = []
  const deliveryItems = []
  const now = new Date()
  
  for (let month = 0; month < config.monthsOfHistory; month++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1)
    const monthPurchases = purchases.filter(p => 
      p.purchaseDate.getMonth() === monthDate.getMonth() &&
      p.purchaseDate.getFullYear() === monthDate.getFullYear()
    )
    
    for (let i = 0; i < config.deliveriesPerMonth; i++) {
      const customer = faker.helpers.arrayElement(customers)
      const deliveryDate = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        faker.number.int({ min: 1, max: 28 }),
        faker.number.int({ min: 9, max: 18 })
      )
      
      const deliveryId = faker.string.uuid()
      
      // 1-4つの商品を納品
      const itemCount = faker.number.int({ min: 1, max: 4 })
      const selectedPurchases = faker.helpers.arrayElements(monthPurchases, itemCount)
      
      let totalAmount = 0
      
      for (const purchase of selectedPurchases) {
        const maxQuantity = Math.max(0.1, Math.min(purchase.remainingQuantity, purchase.quantity * 0.8))
        const deliveryQuantity = faker.number.float({ 
          min: 0.1, 
          max: maxQuantity,
          multipleOf: 0.1 
        })
        
        // 販売価格は仕入価格の1.2-2.0倍
        const markup = faker.number.float({ min: 1.2, max: 2.0, multipleOf: 0.1 })
        const unitPrice = Math.round(purchase.unitPrice * markup)
        const amount = Math.round(deliveryQuantity * unitPrice)
        
        totalAmount += amount
        
        deliveryItems.push({
          id: faker.string.uuid(),
          deliveryId,
          purchaseId: purchase.id,
          quantity: deliveryQuantity,
          unitPrice,
          amount
        })
        
        // 残り数量を更新
        purchase.remainingQuantity -= deliveryQuantity
      }
      
      deliveries.push({
        id: deliveryId,
        customerId: customer.id,
        deliveryDate,
        totalAmount,
        status: faker.helpers.arrayElement(['PENDING', 'DELIVERED', 'CANCELLED']),
        freeeDeliverySlipId: Math.random() > 0.7 ? faker.number.int({ min: 1000, max: 9999 }).toString() : null,
        freeeInvoiceId: Math.random() > 0.9 ? faker.number.int({ min: 1000, max: 9999 }).toString() : null,
        createdAt: deliveryDate,
        updatedAt: new Date()
      })
    }
  }
  
  await prisma.delivery.createMany({ data: deliveries })
  await prisma.deliveryItem.createMany({ data: deliveryItems })
  
  console.log(`✅ ${deliveries.length}件の納品データと${deliveryItems.length}件の納品明細を作成`)
}

async function generateTestData() {
  console.log('🚀 テストデータ生成開始')
  console.log('設定:', config)
  
  try {
    await clearDatabase()
    await seedCategories()
    await seedSuppliers()
    await seedCustomers()
    await seedPurchases()
    await seedDeliveries()
    
    // データ統計を表示
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
    
    console.log('\n✨ テストデータ生成完了!')
    
  } catch (error) {
    console.error('❌ テストデータ生成エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  generateTestData().catch(console.error)
}

export { generateTestData, config }