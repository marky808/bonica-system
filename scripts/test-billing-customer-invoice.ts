#!/usr/bin/env tsx

/**
 * 請求先が異なる顧客での請求書作成テスト
 * billingCustomerが設定されている顧客で請求書を作成し、
 * 正しく請求先の情報が使用されるかを検証
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

    // 2. 顧客一覧取得（請求先情報付き）
    console.log('\n📋 顧客一覧取得中...')
    const customersResponse = await fetch(`${BASE_URL}/api/customers`, { headers })
    const customers = await customersResponse.json()

    if (!customers.length) {
      console.error('❌ 顧客が存在しません')
      return
    }
    console.log('✅ 顧客一覧取得成功:', customers.length, '件')

    // 請求先が設定されている顧客を探す
    const customersWithBilling = customers.filter((c: any) => c.billingCustomer)
    console.log('\n📊 請求先が異なる顧客:', customersWithBilling.length, '件')

    if (customersWithBilling.length > 0) {
      console.log('   例:')
      customersWithBilling.slice(0, 3).forEach((c: any) => {
        console.log(`   - ${c.companyName} → 請求先: ${c.billingCustomer.companyName}`)
      })
    }

    // 3. 納品データを取得してDELIVERED状態の納品がある顧客を確認
    console.log('\n📦 納品データ取得中...')
    const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, { headers })
    const deliveriesResult = await deliveriesResponse.json()

    if (!deliveriesResult.deliveries?.length) {
      console.error('❌ 納品データが存在しません')
      return
    }

    // DELIVERED状態の納品を持つ顧客で、かつ請求先が異なる顧客を探す
    const deliveredDeliveries = deliveriesResult.deliveries.filter(
      (d: any) => d.status === 'DELIVERED'
    )

    console.log('✅ DELIVERED状態の納品:', deliveredDeliveries.length, '件')

    // 請求先が設定されている顧客のDELIVERED納品を探す
    const billingCustomerIds = new Set(customersWithBilling.map((c: any) => c.id))
    const deliveriesWithBillingCustomer = deliveredDeliveries.filter(
      (d: any) => billingCustomerIds.has(d.customerId)
    )

    console.log('📊 請求先が異なる顧客のDELIVERED納品:', deliveriesWithBillingCustomer.length, '件')

    if (deliveriesWithBillingCustomer.length === 0) {
      console.log('\n⚠️ 請求先が異なる顧客でDELIVERED状態の納品がありません')
      console.log('💡 テスト用に新しい納品を作成します...')

      // 請求先が設定されている顧客の最初の1件を使用
      if (customersWithBilling.length > 0) {
        const testCustomer = customersWithBilling[0]
        console.log(`   テスト顧客: ${testCustomer.companyName}`)
        console.log(`   請求先: ${testCustomer.billingCustomer.companyName}`)

        // 利用可能な仕入れを取得
        const purchasesResponse = await fetch(`${BASE_URL}/api/purchases/available`, { headers })
        const purchases = await purchasesResponse.json()

        if (purchases.length > 0) {
          // 納品を作成
          const deliveryData = {
            customerId: testCustomer.id,
            deliveryDate: new Date().toISOString().split('T')[0],
            items: [{
              purchaseId: purchases[0].id,
              quantity: 1,
              unitPrice: purchases[0].unitPrice || 1000,
              unit: purchases[0].unit || 'kg',
              taxRate: 8
            }]
          }

          console.log('\n📝 納品作成中...')
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
          console.log('✅ 納品作成成功:', newDelivery.id)

          // 納品書を作成してDELIVERED状態にする
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
          if (sheetResult.success) {
            console.log('✅ 納品書作成成功（ステータス: DELIVERED）')

            // 請求書作成テスト
            await createAndTestInvoice(testCustomer, headers)
          } else {
            console.error('❌ 納品書作成失敗:', sheetResult.error)
          }
        } else {
          console.log('⚠️ 利用可能な仕入れがありません')
        }
      } else {
        console.log('⚠️ 請求先が設定されている顧客がいません')
        console.log('💡 マスタ管理 > 納品先管理で、顧客に請求先を設定してください')
      }
    } else {
      // 既存のDELIVERED納品を持つ請求先異なる顧客でテスト
      const testDelivery = deliveriesWithBillingCustomer[0]
      const testCustomer = customersWithBilling.find((c: any) => c.id === testDelivery.customerId)

      if (testCustomer) {
        console.log('\n📋 既存データでテスト実行')
        console.log(`   納品先: ${testCustomer.companyName}`)
        console.log(`   請求先: ${testCustomer.billingCustomer.companyName}`)

        await createAndTestInvoice(testCustomer, headers)
      }
    }

    console.log('\n🎉 請求先別顧客テスト完了')

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

async function createAndTestInvoice(customer: any, headers: any) {
  console.log('\n📊 請求書作成テスト...')
  console.log('━'.repeat(50))
  console.log('【期待される結果】')
  console.log(`   請求書の宛先会社名: ${customer.billingCustomer.companyName}`)
  console.log(`   請求書の宛先住所: ${customer.billingCustomer.billingAddress}`)
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
        customerId: customer.id,
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
    console.log('\n💡 上記URLで請求書を開いて、宛先が正しいか確認してください')
    console.log(`   期待される宛先: ${customer.billingCustomer.companyName}`)
  } else {
    console.error('\n❌ 請求書作成失敗:', invoiceResult.error)
    console.error('   詳細:', invoiceResult.details)
  }
}

testBillingCustomerInvoice()
