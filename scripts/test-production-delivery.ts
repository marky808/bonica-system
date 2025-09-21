#!/usr/bin/env tsx

/**
 * 本番環境納品書作成テストスクリプト
 */

const BASE_URL = 'https://bonica-system2025.vercel.app'

async function testProductionDelivery() {
  console.log('🚀 本番環境納品書作成テスト開始')

  try {
    // 1. ログイン
    console.log('🔐 本番環境にログイン中...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: '6391'
      })
    })

    const loginText = await loginResponse.text()
    console.log('📋 ログインレスポンス:', loginText)

    let loginResult
    try {
      loginResult = JSON.parse(loginText)
    } catch (parseError) {
      console.error('❌ ログインレスポンスのパース失敗:', parseError)
      console.log('📋 Raw response:', loginText)
      return
    }

    if (!loginResult.token) {
      console.error('❌ ログインに失敗しました:', loginResult)
      return
    }
    console.log('✅ ログイン成功')

    // 2. 納品データ一覧取得
    console.log('📋 納品データ一覧取得中...')
    const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, {
      headers: {
        'Authorization': `Bearer ${loginResult.token}`
      }
    })

    const deliveriesResult = await deliveriesResponse.json()
    console.log('📋 納品データ一覧:', deliveriesResult)

    if (!deliveriesResult.deliveries || deliveriesResult.deliveries.length === 0) {
      console.log('⚠️ 納品データが存在しません')
      return
    }

    // 3. 最初の納品データでGoogle Sheets納品書作成をテスト
    const testDelivery = deliveriesResult.deliveries[0]
    console.log('📊 テスト対象納品:', {
      id: testDelivery.id,
      customer: testDelivery.customer?.companyName,
      status: testDelivery.status
    })

    // 4. templateIdを指定せずに納品書作成（自動取得をテスト）
    console.log('📊 Google Sheets納品書作成中（templateId自動取得）...')
    const createDeliveryResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResult.token}`
      },
      body: JSON.stringify({
        deliveryId: testDelivery.id
        // templateIdは意図的に省略してauto-fetchをテスト
      })
    })

    const createDeliveryText = await createDeliveryResponse.text()
    console.log('📊 納品書作成レスポンス:', createDeliveryText)

    let createResult
    try {
      createResult = JSON.parse(createDeliveryText)
    } catch (parseError) {
      console.error('❌ 納品書作成レスポンスのパース失敗:', parseError)
      console.log('📋 Raw response:', createDeliveryText)
      return
    }

    if (createResult.success) {
      console.log('🎉 納品書作成成功!')
      console.log('📄 Sheet ID:', createResult.sheetId)
      console.log('🔗 URL:', createResult.url)
      console.log('📕 PDF URL:', createResult.pdfUrl)
    } else {
      console.error('❌ 納品書作成失敗:', createResult)
    }

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testProductionDelivery()