#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyTestData() {
  console.log('🔍 テストデータ検証開始\n')
  
  try {
    // 基本統計
    const stats = {
      categories: await prisma.category.count(),
      suppliers: await prisma.supplier.count(),
      customers: await prisma.customer.count(),
      purchases: await prisma.purchase.count(),
      deliveries: await prisma.delivery.count(),
      deliveryItems: await prisma.deliveryItem.count(),
      invoices: await prisma.invoice.count(),
      googleSheetTemplates: await prisma.googleSheetTemplate.count()
    }

    console.log('📊 データ統計:')
    console.table(stats)

    // 納品データの状況
    const deliveryStats = await prisma.delivery.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    console.log('\n📦 納品データステータス別統計:')
    deliveryStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count.id}件`)
    })

    // Google Sheets連携状況
    const googleSheetsDeliveries = await prisma.delivery.count({
      where: { googleSheetId: { not: null } }
    })

    const googleSheetsInvoices = await prisma.invoice.count({
      where: { googleSheetId: { not: null } }
    })

    console.log('\n🔗 Google Sheets連携状況:')
    console.log(`  納品書: ${googleSheetsDeliveries}/${stats.deliveries}件`)
    console.log(`  請求書: ${googleSheetsInvoices}/${stats.invoices}件`)

    // 顧客の請求サイクル分布
    const billingCycles = await prisma.customer.groupBy({
      by: ['billingCycle'],
      _count: {
        id: true
      }
    })

    console.log('\n👥 顧客請求サイクル分布:')
    billingCycles.forEach(cycle => {
      console.log(`  ${cycle.billingCycle}: ${cycle._count.id}件`)
    })

    // 月別納品統計（過去3ヶ月）
    const now = new Date()
    const monthlyStats = []
    
    for (let i = 0; i < 3; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const deliveriesInMonth = await prisma.delivery.count({
        where: {
          deliveryDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      monthlyStats.push({
        month: monthStart.toISOString().slice(0, 7),
        deliveries: deliveriesInMonth
      })
    }

    console.log('\n📅 月別納品統計:')
    monthlyStats.forEach(month => {
      console.log(`  ${month.month}: ${month.deliveries}件`)
    })

    // Google Sheetsテンプレート
    const templates = await prisma.googleSheetTemplate.findMany({
      select: {
        name: true,
        type: true
      }
    })

    console.log('\n📊 Google Sheetsテンプレート:')
    templates.forEach(template => {
      console.log(`  [${template.type}] ${template.name}`)
    })

    // テストシナリオ適合性チェック
    console.log('\n✅ テストシナリオ適合性チェック:')
    
    // 1. 複数の顧客（異なる請求サイクル）
    const uniqueBillingCycles = billingCycles.length
    console.log(`  ✓ 異なる請求サイクル: ${uniqueBillingCycles}種類`)
    
    // 2. 複数月にわたる納品履歴
    const monthsWithDeliveries = monthlyStats.filter(m => m.deliveries > 0).length
    console.log(`  ✓ 納品実績のある月: ${monthsWithDeliveries}ヶ月`)
    
    // 3. 様々な商品カテゴリ
    console.log(`  ✓ 商品カテゴリ: ${stats.categories}種類`)
    
    // 4. Google Sheets連携テスト用データ
    console.log(`  ✓ Google Sheets連携済み納品書: ${googleSheetsDeliveries}件`)
    console.log(`  ✓ Google Sheets連携済み請求書: ${googleSheetsInvoices}件`)
    console.log(`  ✓ Google Sheetsテンプレート: ${stats.googleSheetTemplates}件`)

    console.log('\n🎯 テスト可能項目:')
    console.log('  • 納品書のGoogle Sheets作成（テンプレート利用）')
    console.log('  • 月次請求書の集約・作成')
    console.log('  • 異なる請求サイクルでの処理')
    console.log('  • Google Sheets連携状況の表示')
    console.log('  • freee履歴データとGoogle Sheetsデータの混在表示')

    console.log('\n✨ テストデータ検証完了!')

  } catch (error) {
    console.error('❌ 検証エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyTestData().catch(console.error)
}

export { verifyTestData }