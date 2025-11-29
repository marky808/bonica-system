#!/usr/bin/env tsx

/**
 * 完全な納品フローテスト
 * 納品作成 → Google Sheets納品書作成までの全フローをテスト
 */

const BASE_URL = 'https://bonica-system.vercel.app'

async function testFullDeliveryFlow() {
  console.log('🚀 完全納品フローテスト開始')
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

    // 3. 在庫がある仕入れを取得
    console.log('\n📦 利用可能な仕入れ取得中...')
    const purchasesResponse = await fetch(`${BASE_URL}/api/purchases/available`, { headers })
    const purchases = await purchasesResponse.json()

    if (!purchases.length) {
      console.error('❌ 利用可能な仕入れが存在しません')
      return
    }
    console.log('✅ 利用可能な仕入れ取得成功:', purchases.length, '件')

    // 4. 納品を作成
    const testCustomer = customers[0]
    const testPurchase = purchases[0]

    console.log('\n📝 納品作成中...')
    console.log('   顧客:', testCustomer.companyName)
    console.log('   商品:', testPurchase.productName)
    console.log('   在庫数量:', testPurchase.remainingQuantity)

    const deliveryData = {
      customerId: testCustomer.id,
      deliveryDate: new Date().toISOString().split('T')[0],
      items: [{
        purchaseId: testPurchase.id,
        quantity: Math.min(1, testPurchase.remainingQuantity),
        unitPrice: testPurchase.unitPrice || 1000,
        unit: testPurchase.unit || 'kg',
        taxRate: 8
      }]
    }

    const createDeliveryResponse = await fetch(`${BASE_URL}/api/deliveries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deliveryData)
    })

    if (!createDeliveryResponse.ok) {
      const errorText = await createDeliveryResponse.text()
      console.error('❌ 納品作成失敗:', createDeliveryResponse.status, errorText)
      return
    }

    const newDelivery = await createDeliveryResponse.json()
    console.log('✅ 納品作成成功:', {
      id: newDelivery.id,
      customer: newDelivery.customer?.companyName,
      status: newDelivery.status,
      totalAmount: newDelivery.totalAmount
    })

    // 5. Google Sheets納品書作成
    console.log('\n📊 Google Sheets納品書作成中...')

    const createSheetResponse = await fetch(
      `${BASE_URL}/api/google-sheets/create-delivery-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deliveryId: newDelivery.id
        })
      }
    )

    const sheetResult = await createSheetResponse.json()

    if (sheetResult.success) {
      console.log('🎉 納品書作成成功!')
      console.log('   Sheet ID:', sheetResult.sheetId)
      console.log('   URL:', sheetResult.url)
      console.log('   PDF URL:', sheetResult.pdfUrl || '(なし)')
      console.log('   Version:', sheetResult.version)
      console.log('   納品書番号:', sheetResult.deliveryNumber)
    } else {
      console.error('❌ 納品書作成失敗:', sheetResult.error)
      console.error('   詳細:', sheetResult.details)
      if (sheetResult.debugInfo) {
        console.error('   デバッグ情報:', sheetResult.debugInfo)
      }
    }

    console.log('\n🎉 完全納品フローテスト完了')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testFullDeliveryFlow()
