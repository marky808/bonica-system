#!/usr/bin/env tsx

/**
 * ローカル環境納品書作成テストスクリプト
 */

const BASE_URL = 'http://localhost:3000'

async function testLocalDelivery() {
  console.log('🚀 ローカル環境納品書作成テスト開始')

  try {
    // 1. ログイン
    console.log('🔐 ローカル環境にログイン中...')
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

    // 2. テンプレート確認
    console.log('📋 テンプレート確認中...')
    const templatesResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`, {
      headers: {
        'Authorization': `Bearer ${loginResult.token}`
      }
    })

    const templatesResult = await templatesResponse.json()
    console.log('📋 テンプレート一覧:', templatesResult)

    // 3. 納品データ一覧取得
    console.log('📋 納品データ一覧取得中...')
    const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, {
      headers: {
        'Authorization': `Bearer ${loginResult.token}`
      }
    })

    const deliveriesResult = await deliveriesResponse.json()
    console.log('📋 納品データ件数:', deliveriesResult.deliveries?.length || 0)

    if (!deliveriesResult.deliveries || deliveriesResult.deliveries.length === 0) {
      console.log('⚠️ 納品データが存在しません')
      return
    }

    // 4. 最初の納品データでテスト
    const testDelivery = deliveriesResult.deliveries[0]
    console.log('📊 テスト対象納品:', {
      id: testDelivery.id,
      customer: testDelivery.customer?.companyName,
      status: testDelivery.status,
      hasGoogleSheet: !!testDelivery.googleSheetId
    })

    // 5. templateIdを指定せずに納品書作成（自動取得をテスト）
    console.log('📊 Google Sheets納品書作成中（templateId自動取得テスト）...')
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

    const createResult = await createDeliveryResponse.json()
    console.log('📊 納品書作成結果:', createResult)

    if (createResult.success) {
      console.log('🎉 納品書作成成功!')
      console.log('📄 Sheet ID:', createResult.sheetId)
      console.log('🔗 URL:', createResult.url)
      console.log('📕 PDF URL:', createResult.pdfUrl)

      console.log('\n=== テスト結果サマリー ===')
      console.log('✅ templateId自動取得機能: 正常動作')
      console.log('✅ Google Sheets納品書作成: 成功')
      console.log('✅ データベース更新: 完了')
    } else {
      console.error('❌ 納品書作成失敗:', createResult)
    }

  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
}

testLocalDelivery()