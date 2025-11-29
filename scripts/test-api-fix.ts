#!/usr/bin/env tsx

/**
 * API修正確認テストスクリプト
 * Customer循環参照問題の修正を確認
 */

const BASE_URL = 'https://bonica-system.vercel.app'

async function testApiFix() {
  console.log('🚀 API修正確認テスト開始')
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

    // 2. 顧客一覧取得テスト
    console.log('\n📋 顧客一覧取得テスト...')
    const customersResponse = await fetch(`${BASE_URL}/api/customers`, { headers })

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text()
      console.error('❌ 顧客一覧取得失敗:', customersResponse.status, errorText)
      return
    }

    const customers = await customersResponse.json()
    console.log('✅ 顧客一覧取得成功:', customers.length, '件')

    if (customers.length > 0) {
      const firstCustomer = customers[0]
      console.log('   サンプル顧客:', {
        id: firstCustomer.id,
        companyName: firstCustomer.companyName,
        hasBillingCustomer: !!firstCustomer.billingCustomer,
        billingCustomerName: firstCustomer.billingCustomer?.companyName || '(自社請求)'
      })
    }

    // 3. 納品データ一覧取得テスト
    console.log('\n📦 納品データ一覧取得テスト...')
    const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, { headers })

    if (!deliveriesResponse.ok) {
      const errorText = await deliveriesResponse.text()
      console.error('❌ 納品データ一覧取得失敗:', deliveriesResponse.status, errorText)
      return
    }

    const deliveriesResult = await deliveriesResponse.json()
    console.log('✅ 納品データ一覧取得成功:', deliveriesResult.deliveries?.length || 0, '件')

    if (!deliveriesResult.deliveries || deliveriesResult.deliveries.length === 0) {
      console.log('⚠️ 納品データが存在しません。Google Sheets作成テストはスキップします。')
      console.log('\n🎉 基本APIテスト完了（循環参照問題は解消されています）')
      return
    }

    // 4. PENDING状態の納品を探す
    const pendingDeliveries = deliveriesResult.deliveries.filter(
      (d: any) => d.status === 'PENDING'
    )

    if (pendingDeliveries.length === 0) {
      console.log('⚠️ PENDING状態の納品がありません。既存の納品で詳細取得テストを行います。')

      // 納品詳細取得テスト
      const testDelivery = deliveriesResult.deliveries[0]
      console.log('\n📄 納品詳細取得テスト (ID:', testDelivery.id, ')...')

      const deliveryDetailResponse = await fetch(
        `${BASE_URL}/api/deliveries/${testDelivery.id}`,
        { headers }
      )

      if (!deliveryDetailResponse.ok) {
        const errorText = await deliveryDetailResponse.text()
        console.error('❌ 納品詳細取得失敗:', deliveryDetailResponse.status, errorText)
      } else {
        const deliveryDetail = await deliveryDetailResponse.json()
        console.log('✅ 納品詳細取得成功:', {
          id: deliveryDetail.id,
          customer: deliveryDetail.customer?.companyName,
          status: deliveryDetail.status
        })
      }

      console.log('\n🎉 APIテスト完了（循環参照問題は解消されています）')
      return
    }

    // 5. Google Sheets納品書作成テスト
    const testDelivery = pendingDeliveries[0]
    console.log('\n📊 Google Sheets納品書作成テスト...')
    console.log('   対象納品:', {
      id: testDelivery.id,
      customer: testDelivery.customer?.companyName,
      status: testDelivery.status
    })

    const createDeliveryResponse = await fetch(
      `${BASE_URL}/api/google-sheets/create-delivery-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deliveryId: testDelivery.id
        })
      }
    )

    const createResult = await createDeliveryResponse.json()

    if (createResult.success) {
      console.log('🎉 納品書作成成功!')
      console.log('   Sheet ID:', createResult.sheetId)
      console.log('   URL:', createResult.url)
      console.log('   PDF URL:', createResult.pdfUrl || '(なし)')
    } else {
      console.error('❌ 納品書作成失敗:', createResult.error)
      console.error('   詳細:', createResult.details || createResult.debugInfo)
    }

    console.log('\n🎉 全テスト完了')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testApiFix()
