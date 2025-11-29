#!/usr/bin/env tsx

/**
 * 請求書作成テストスクリプト
 * Google Sheets請求書作成APIのテスト
 */

const BASE_URL = 'https://bonica-system.vercel.app'

async function testInvoiceCreation() {
  console.log('🚀 請求書作成テスト開始')
  console.log('📍 テスト対象:', BASE_URL)

  try {
    // 1. ログイン
    console.log('\n🔐 ログイン中...')
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
      console.error('❌ ログインに失敗しました:', loginResult)
      return
    }
    console.log('✅ ログイン成功')

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginResult.token}`
    }

    // 2. 顧客一覧取得
    console.log('\n📋 顧客一覧取得中...')
    const customersResponse = await fetch(`${BASE_URL}/api/customers`, { headers })
    const customers = await customersResponse.json()

    if (!customers.length) {
      console.error('❌ 顧客が存在しません')
      return
    }
    console.log('✅ 顧客一覧取得成功:', customers.length, '件')

    // 3. DELIVERED状態の納品を持つ顧客を探す
    console.log('\n📦 納品データ取得中...')
    const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, { headers })
    const deliveriesResult = await deliveriesResponse.json()

    if (!deliveriesResult.deliveries?.length) {
      console.error('❌ 納品データが存在しません')
      return
    }

    console.log('✅ 納品データ取得成功:', deliveriesResult.deliveries.length, '件')

    // DELIVERED状態の納品を探す
    const deliveredDeliveries = deliveriesResult.deliveries.filter(
      (d: any) => d.status === 'DELIVERED'
    )

    console.log('📊 DELIVERED状態の納品:', deliveredDeliveries.length, '件')

    if (deliveredDeliveries.length === 0) {
      console.log('⚠️ DELIVERED状態の納品がありません。請求書作成テストをスキップします。')
      console.log('\n💡 まず納品書を作成してステータスをDELIVEREDに変更してください。')

      // 代わりに基本的なAPI確認を行う
      console.log('\n📊 請求書テンプレート情報の確認...')
      try {
        const templatesResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`, { headers })
        const templates = await templatesResponse.json()
        console.log('✅ テンプレート情報:', templates)
      } catch (e) {
        console.log('⚠️ テンプレート情報取得スキップ')
      }

      return
    }

    // DELIVEREDの納品を持つ顧客を取得
    const testDelivery = deliveredDeliveries[0]
    const testCustomerId = testDelivery.customerId

    console.log('\n📝 請求書作成テスト...')
    console.log('   顧客:', testDelivery.customer?.companyName || testCustomerId)
    console.log('   対象納品ID:', testDelivery.id)

    // 今月の日付範囲を設定
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    console.log('   期間:', startDate, '〜', endDate)

    // 4. Google Sheets請求書作成
    console.log('\n📊 Google Sheets請求書作成中...')

    const createInvoiceResponse = await fetch(
      `${BASE_URL}/api/google-sheets/create-invoice-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: testCustomerId,
          startDate: startDate,
          endDate: endDate
        })
      }
    )

    const invoiceResult = await createInvoiceResponse.json()

    if (invoiceResult.success) {
      console.log('🎉 請求書作成成功!')
      console.log('   Invoice ID:', invoiceResult.invoiceId)
      console.log('   Sheet ID:', invoiceResult.sheetId)
      console.log('   URL:', invoiceResult.url)
      console.log('   PDF URL:', invoiceResult.pdfUrl || '(なし)')
      console.log('   Version:', invoiceResult.version)
      console.log('   合計金額:', invoiceResult.totalAmount?.toLocaleString(), '円')
    } else {
      console.error('❌ 請求書作成失敗:', invoiceResult.error)
      console.error('   詳細:', invoiceResult.details)
    }

    console.log('\n🎉 請求書テスト完了')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testInvoiceCreation()
