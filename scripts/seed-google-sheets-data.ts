#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function seedGoogleSheetsTemplates() {
  console.log('📊 Google Sheetsテンプレートデータ生成中...')
  
  // テンプレートデータを作成
  const templates = [
    {
      name: '納品書テンプレート（標準）',
      type: 'delivery',
      templateSheetId: '1BvKJ8X7h9RzCpQmF5GqI8VpWxN2YtE6B-sample-delivery',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '納品書テンプレート（詳細版）',
      type: 'delivery', 
      templateSheetId: '1CwLK9Y8i0SaDbRnG6HrJ9WqXyO3ZuF7C-detailed-delivery',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '請求書テンプレート（月次）',
      type: 'invoice',
      templateSheetId: '1DxMN0Z9j1TbEcSoH7IsK0XrYzP4AvG8D-monthly-invoice', 
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: '請求書テンプレート（週次）',
      type: 'invoice',
      templateSheetId: '1ExNO1A0k2UcFdTpI8JtL1YsZaQ5BwH9E-weekly-invoice',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
  
  await prisma.googleSheetTemplate.createMany({ data: templates })
  console.log(`✅ ${templates.length}件のGoogle Sheetsテンプレートを作成`)
}

async function updateDeliveriesWithGoogleSheets() {
  console.log('🔗 既存納品データにGoogle Sheets情報を追加中...')
  
  // 最近の納品データの30%にGoogle Sheets情報を追加
  const recentDeliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30日以内
      },
      status: 'DELIVERED'
    },
    orderBy: {
      deliveryDate: 'desc'
    },
    take: 20
  })
  
  let updatedCount = 0
  
  for (const delivery of recentDeliveries) {
    // 30%の確率でGoogle Sheets情報を追加
    if (Math.random() < 0.3) {
      const mockSheetId = `1${faker.string.alphanumeric(32)}Google-Sheet-ID`
      const mockSheetUrl = `https://docs.google.com/spreadsheets/d/${mockSheetId}/edit#gid=0`
      
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          googleSheetId: mockSheetId,
          googleSheetUrl: mockSheetUrl
        }
      })
      
      updatedCount++
    }
  }
  
  console.log(`✅ ${updatedCount}件の納品データにGoogle Sheets情報を追加`)
}

async function createSampleInvoices() {
  console.log('📋 サンプル請求書データ生成中...')
  
  const customers = await prisma.customer.findMany({
    take: 6
  })
  
  const invoices = []
  const now = new Date()
  
  // 過去3ヶ月の請求書を作成
  for (let month = 1; month <= 3; month++) {
    const invoiceDate = new Date(now.getFullYear(), now.getMonth() - month, 25)
    
    for (let i = 0; i < Math.min(customers.length, 4); i++) {
      const customer = customers[i]
      const invoiceNumber = `INV-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${String(customer.id).padStart(4, '0')}`
      
      // 月次売上を計算（ダミー）
      const monthlyTotal = faker.number.int({ min: 50000, max: 300000 })
      const taxAmount = Math.floor(monthlyTotal * 0.1)
      
      const hasGoogleSheets = Math.random() < 0.4 // 40%の確率でGoogle Sheets作成済み
      
      invoices.push({
        invoice_number: invoiceNumber,
        customerId: customer.id,
        invoiceDate,
        month: invoiceDate.getMonth() + 1,
        year: invoiceDate.getFullYear(),
        totalAmount: monthlyTotal + taxAmount,
        status: faker.helpers.arrayElement(['DRAFT', 'SENT', 'PAID']),
        freeeInvoiceId: Math.random() > 0.6 ? faker.number.int({ min: 10000, max: 99999 }).toString() : null,
        googleSheetId: hasGoogleSheets ? `1${faker.string.alphanumeric(32)}Invoice-Sheet` : null,
        googleSheetUrl: hasGoogleSheets ? `https://docs.google.com/spreadsheets/d/1${faker.string.alphanumeric(32)}Invoice-Sheet/edit#gid=0` : null,
        deliveryIds: '[]', // 実際には関連する納品IDのJSON配列
        createdAt: invoiceDate,
        updatedAt: new Date()
      })
    }
  }
  
  await prisma.invoice.createMany({ data: invoices })
  console.log(`✅ ${invoices.length}件のサンプル請求書を作成`)
}

async function createDiverseCustomerProfiles() {
  console.log('👥 顧客プロファイルを多様化中...')
  
  const customers = await prisma.customer.findMany()
  
  // 顧客の請求サイクルをより多様化
  const billingProfiles = [
    { billingCycle: 'monthly', billingDay: 31, paymentTerms: '月末締翌月末払い' },
    { billingCycle: 'monthly', billingDay: 15, paymentTerms: '15日締翌月15日払い' }, 
    { billingCycle: 'monthly', billingDay: 20, paymentTerms: '20日締翌月20日払い' },
    { billingCycle: 'weekly', billingDay: 31, paymentTerms: '週次請求' },
    { billingCycle: 'immediate', billingDay: 31, paymentTerms: '即時決済' },
  ]
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const profile = billingProfiles[i % billingProfiles.length]
    
    await prisma.customer.update({
      where: { id: customer.id },
      data: profile
    })
  }
  
  console.log(`✅ ${customers.length}件の顧客プロファイルを更新`)
}

async function generateMonthlyDeliveryPatterns() {
  console.log('📈 月次納品パターンを調整中...')
  
  // 特定の顧客に対して月次パターンの納品を作成
  const customers = await prisma.customer.findMany({ take: 3 })
  const purchases = await prisma.purchase.findMany({
    where: { remainingQuantity: { gt: 0 } },
    include: { supplier: true, category: true }
  })
  
  const deliveries = []
  const deliveryItems = []
  const now = new Date()
  
  // 各顧客に対して月次パターン（月に3-5回の納品）を作成
  for (const customer of customers) {
    for (let month = 0; month < 2; month++) { // 過去2ヶ月分
      const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1)
      const deliveriesInMonth = faker.number.int({ min: 3, max: 5 })
      
      for (let i = 0; i < deliveriesInMonth; i++) {
        const deliveryDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          faker.number.int({ min: 1 + (i * 7), max: 7 + (i * 7) }) // 週ごとに分散
        )
        
        const deliveryId = faker.string.uuid()
        const selectedPurchases = faker.helpers.arrayElements(purchases, faker.number.int({ min: 2, max: 4 }))
        
        let totalAmount = 0
        
        for (const purchase of selectedPurchases) {
          const deliveryQuantity = faker.number.float({
            min: 0.5,
            max: Math.min(purchase.remainingQuantity, 10),
            multipleOf: 0.1
          })
          
          const markup = faker.number.float({ min: 1.3, max: 1.8, multipleOf: 0.1 })
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
        }
        
        // Google Sheets情報を50%の確率で追加
        const hasGoogleSheets = Math.random() < 0.5
        
        deliveries.push({
          id: deliveryId,
          customerId: customer.id,
          deliveryDate,
          totalAmount,
          status: 'DELIVERED',
          freeeDeliverySlipId: Math.random() > 0.7 ? faker.number.int({ min: 1000, max: 9999 }).toString() : null,
          freeeInvoiceId: null, // 月次請求なので個別にはnull
          googleSheetId: hasGoogleSheets ? `1${faker.string.alphanumeric(32)}Monthly-Delivery` : null,
          googleSheetUrl: hasGoogleSheets ? `https://docs.google.com/spreadsheets/d/1${faker.string.alphanumeric(32)}Monthly-Delivery/edit#gid=0` : null,
          createdAt: deliveryDate,
          updatedAt: new Date()
        })
      }
    }
  }
  
  await prisma.delivery.createMany({ data: deliveries })
  await prisma.deliveryItem.createMany({ data: deliveryItems })
  
  console.log(`✅ ${deliveries.length}件の月次パターン納品データと${deliveryItems.length}件の明細を追加`)
}

async function enhanceWithGoogleSheetsData() {
  console.log('🚀 Google Sheets連携対応データ拡張開始')
  
  try {
    await seedGoogleSheetsTemplates()
    await updateDeliveriesWithGoogleSheets()
    await createSampleInvoices()
    await createDiverseCustomerProfiles()
    await generateMonthlyDeliveryPatterns()
    
    // 最終統計を表示
    const stats = {
      googleSheetTemplates: await prisma.googleSheetTemplate.count(),
      totalDeliveries: await prisma.delivery.count(),
      deliveriesWithGoogleSheets: await prisma.delivery.count({
        where: { googleSheetId: { not: null } }
      }),
      totalInvoices: await prisma.invoice.count(),
      invoicesWithGoogleSheets: await prisma.invoice.count({
        where: { googleSheetId: { not: null } }
      })
    }
    
    console.log('\n📊 Google Sheets対応データ統計:')
    console.table(stats)
    
    console.log('\n✨ Google Sheets連携対応データ拡張完了!')
    
  } catch (error) {
    console.error('❌ データ拡張エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  enhanceWithGoogleSheetsData().catch(console.error)
}

export { enhanceWithGoogleSheetsData }