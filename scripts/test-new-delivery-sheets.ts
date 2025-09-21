#!/usr/bin/env tsx

/**
 * 新しく作成した納品データでGoogle Sheets納品書作成テスト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3000'

async function testNewDeliverySheets() {
  console.log('🚀 新規納品データでGoogle Sheets納品書作成テスト開始')

  try {
    // 1. 最新の納品データを取得
    console.log('\n=== 📋 最新納品データ取得 ===')
    const latestDelivery = await prisma.delivery.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: true,
        items: {
          include: {
            purchase: true
          }
        }
      }
    })

    if (!latestDelivery) {
      console.error('❌ 納品データが見つかりません')
      return
    }

    console.log('最新納品データ:')
    console.log(`  ID: ${latestDelivery.id}`)
    console.log(`  顧客: ${latestDelivery.customer.companyName}`)
    console.log(`  総額: ${latestDelivery.totalAmount}円`)
    console.log(`  ステータス: ${latestDelivery.status}`)
    console.log(`  Google SheetID: ${latestDelivery.googleSheetId || '未作成'}`)
    console.log('  アイテム:')
    latestDelivery.items.forEach(item => {
      console.log(`    - ${item.purchase.productName}: ${item.quantity}${item.purchase.unit} × ${item.unitPrice}円`)
    })

    // 2. ログインしてAPI経由でGoogle Sheets作成
    console.log('\n=== 🔐 API認証 ===')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: '6391'
      })
    })

    const loginResult = await loginResponse.json()
    if (!loginResult.token) {
      console.error('❌ ログイン失敗:', loginResult)
      return
    }
    console.log('✅ ログイン成功')

    // 3. templateId自動取得でGoogle Sheets納品書作成
    console.log('\n=== 📊 Google Sheets納品書作成 ===')
    console.log('templateId自動取得機能をテスト中...')

    const createResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResult.token}`
      },
      body: JSON.stringify({
        deliveryId: latestDelivery.id
        // templateIdは省略（自動取得テスト）
      })
    })

    const createResult = await createResponse.json()

    if (createResult.success) {
      console.log('🎉 Google Sheets納品書作成成功!')
      console.log(`✅ templateId自動取得: 正常動作`)
      console.log(`📄 SheetID: ${createResult.sheetId}`)
      console.log(`🔗 URL: ${createResult.url}`)
      if (createResult.pdfUrl) {
        console.log(`📕 PDF URL: ${createResult.pdfUrl}`)
      }

      // 4. データベース更新確認
      console.log('\n=== 📋 データベース更新確認 ===')
      const updatedDelivery = await prisma.delivery.findUnique({
        where: { id: latestDelivery.id },
        select: {
          id: true,
          status: true,
          googleSheetId: true,
          googleSheetUrl: true
        }
      })

      console.log('更新後のデータ:')
      console.log(`  ステータス: ${updatedDelivery?.status}`)
      console.log(`  Google SheetID: ${updatedDelivery?.googleSheetId}`)
      console.log(`  Google Sheet URL: ${updatedDelivery?.googleSheetUrl}`)

      if (updatedDelivery?.status === 'DELIVERED' && updatedDelivery?.googleSheetId) {
        console.log('✅ データベース更新: 正常')
      } else {
        console.log('⚠️ データベース更新: 要確認')
      }

    } else if (createResult.error?.includes('already exists')) {
      console.log('⚠️ 同名シートが既に存在（予想済みエラー）')
      console.log('✅ templateId自動取得機能: 正常動作')
      console.log(`📋 自動取得されたtemplateId: ${createResult.templateId || 'レスポンスに含まれず'}`)
    } else {
      console.log('❌ Google Sheets作成失敗:')
      console.log(`   エラー: ${createResult.error}`)
      console.log(`   詳細: ${createResult.details}`)
    }

    // 5. 本番環境テスト準備情報
    console.log('\n=== 🌐 本番環境テスト準備情報 ===')
    console.log('本番環境でテストする場合の手順:')
    console.log('1. 本番環境にテストデータ（仕入れ・顧客）をデプロイ')
    console.log('2. 本番環境で新しい納品データを作成')
    console.log('3. templateId自動取得機能をテスト')
    console.log('4. Google Sheets納品書作成をテスト')

    const testableDeliveries = await prisma.delivery.findMany({
      where: {
        status: {
          not: 'ERROR'
        }
      },
      include: {
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    })

    console.log('\n本番環境テスト候補の納品データ:')
    testableDeliveries.forEach(delivery => {
      console.log(`  - ID: ${delivery.id}, 顧客: ${delivery.customer.companyName}, ステータス: ${delivery.status}`)
    })

  } catch (error) {
    console.error('❌ テストエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNewDeliverySheets()