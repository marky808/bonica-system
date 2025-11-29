#!/usr/bin/env tsx

/**
 * 請求先が異なる顧客での請求書作成テスト（完全版）
 * 納品を作成 → DELIVERED状態に → 請求書作成の全フロー
 */

const BASE_URL = 'https://bonica-system.vercel.app'

async function testBillingCustomerInvoice() {
  console.log('🚀 請求先別顧客での請求書作成テスト開始')
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

    // 請求先が設定されている顧客を探す
    const customersWithBilling = customers.filter((c: any) => c.billingCustomer)
    console.log('📊 請求先が異なる顧客:', customersWithBilling.length, '件')

    if (customersWithBilling.length === 0) {
      console.log('⚠️ 請求先が設定されている顧客がいません')
      console.log('💡 マスタ管理 > 納品先管理で、顧客に請求先を設定してください')
      return
    }

    const testCustomer = customersWithBilling[0]
    console.log('\n📋 テスト顧客情報:')
    console.log('━'.repeat(50))
    console.log(`   納品先: ${testCustomer.companyName}`)
    console.log(`   納品先住所: ${testCustomer.deliveryAddress}`)
    console.log(`   請求先: ${testCustomer.billingCustomer.companyName}`)
    console.log(`   請求先住所: ${testCustomer.billingCustomer.billingAddress}`)
    console.log('━'.repeat(50))

    // 3. 利用可能な仕入れを取得
    console.log('\n📦 利用可能な仕入れ取得中...')
    const purchasesResponse = await fetch(`${BASE_URL}/api/purchases/available`, { headers })
    const purchases = await purchasesResponse.json()

    if (purchases.length === 0) {
      console.log('⚠️ 利用可能な仕入れがありません')
      return
    }
    console.log('✅ 利用可能な仕入れ:', purchases.length, '件')

    // 4. 納品を作成
    console.log('\n📝 納品作成中...')
    const deliveryData = {
      customerId: testCustomer.id,
      deliveryDate: new Date().toISOString().split('T')[0],
      items: [{
        purchaseId: purchases[0].id,
        quantity: 2,
        unitPrice: purchases[0].unitPrice || 500,
        unit: purchases[0].unit || 'kg',
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
      console.error('❌ 納品作成失敗:', errorText)
      return
    }

    const newDelivery = await createDeliveryResponse.json()
    console.log('✅ 納品作成成功:', {
      id: newDelivery.id,
      customer: newDelivery.customer?.companyName,
      status: newDelivery.status,
      totalAmount: newDelivery.totalAmount
    })

    // 5. 納品書を作成（DELIVERED状態に変更）
    console.log('\n📊 納品書作成中（DELIVERED状態に変更）...')
    const createSheetResponse = await fetch(
      `${BASE_URL}/api/google-sheets/create-delivery-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ deliveryId: newDelivery.id })
      }
    )

    const sheetResult = await createSheetResponse.json()
    if (!sheetResult.success) {
      console.error('❌ 納品書作成失敗:', sheetResult.error)
      return
    }
    console.log('✅ 納品書作成成功')
    console.log('   納品書URL:', sheetResult.url)

    // 6. 請求書作成
    console.log('\n📊 請求書作成中...')
    console.log('━'.repeat(50))
    console.log('【期待される結果】')
    console.log(`   請求書の宛先会社名: ${testCustomer.billingCustomer.companyName}`)
    console.log(`   請求書の宛先住所: ${testCustomer.billingCustomer.billingAddress}`)
    console.log('━'.repeat(50))

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const createInvoiceResponse = await fetch(
      `${BASE_URL}/api/google-sheets/create-invoice-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: testCustomer.id,
          startDate: startDate,
          endDate: endDate
        })
      }
    )

    const invoiceResult = await createInvoiceResponse.json()

    if (invoiceResult.success) {
      console.log('\n🎉 請求書作成成功!')
      console.log('   Invoice ID:', invoiceResult.invoiceId)
      console.log('   Sheet ID:', invoiceResult.sheetId)
      console.log('   URL:', invoiceResult.url)
      console.log('   PDF URL:', invoiceResult.pdfUrl || '(なし)')
      console.log('   合計金額:', invoiceResult.totalAmount?.toLocaleString(), '円')
      console.log('\n✅ 請求書を開いて宛先を確認してください:')
      console.log(`   期待される宛先: ${testCustomer.billingCustomer.companyName}`)
      console.log(`   期待される住所: ${testCustomer.billingCustomer.billingAddress}`)
    } else {
      console.error('\n❌ 請求書作成失敗:', invoiceResult.error)
      console.error('   詳細:', invoiceResult.details)
    }

    console.log('\n🎉 テスト完了')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testBillingCustomerInvoice()
