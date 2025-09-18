#!/usr/bin/env tsx

/**
 * 本番環境での納品書生成機能テスト
 * 実際のデータを使用して納品書の生成、ステータス更新、Google Sheets出力をテストします
 */

import { PrismaClient } from '@prisma/client'

const BASE_URL = 'https://bonica-system2025.vercel.app'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  details: string
  duration: number
  error?: string
}

const results: TestResult[] = []

async function testLogin(): Promise<string | null> {
  const startTime = Date.now()
  console.log('🔐 本番環境ログインテスト...')

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: 'bonica2024!'
      })
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (result.success && result.user) {
      console.log(`✅ ログイン成功: ${result.user.name}`)
      results.push({
        name: 'Production Login',
        status: 'PASS',
        details: `認証成功: ${result.user.name}`,
        duration
      })
      return result.token || 'authenticated'
    } else {
      throw new Error(result.error || 'ログイン失敗')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ ログイン失敗:', error)
    results.push({
      name: 'Production Login',
      status: 'FAIL',
      details: 'ログイン失敗',
      duration,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

async function getDeliveries(token: string): Promise<any[]> {
  const startTime = Date.now()
  console.log('📦 納品データ取得中...')

  try {
    const response = await fetch(`${BASE_URL}/api/deliveries`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      }
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (result.deliveries && Array.isArray(result.deliveries)) {
      console.log(`✅ 納品データ取得成功: ${result.deliveries.length}件`)
      results.push({
        name: 'Get Deliveries',
        status: 'PASS',
        details: `納品データ${result.deliveries.length}件取得`,
        duration
      })
      return result.deliveries
    } else {
      throw new Error('納品データ取得失敗')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ 納品データ取得失敗:', error)
    results.push({
      name: 'Get Deliveries',
      status: 'FAIL',
      details: '納品データ取得失敗',
      duration,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

async function testCreateDeliverySheet(token: string, deliveryId: string, templateId: string): Promise<boolean> {
  const startTime = Date.now()
  console.log(`📊 納品書生成テスト (ID: ${deliveryId})...`)

  try {
    const response = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      },
      body: JSON.stringify({
        deliveryId,
        templateId
      })
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (result.success) {
      console.log('✅ 納品書生成成功!')
      console.log(`   📄 Sheet URL: ${result.url}`)
      console.log(`   📋 Sheet ID: ${result.sheetId}`)
      if (result.pdfUrl) {
        console.log(`   📕 PDF URL: ${result.pdfUrl}`)
      }

      results.push({
        name: 'Create Delivery Sheet',
        status: 'PASS',
        details: `納品書生成成功 - ${result.url}`,
        duration
      })
      return true
    } else {
      throw new Error(result.error || '納品書生成失敗')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ 納品書生成失敗:', error)
    results.push({
      name: 'Create Delivery Sheet',
      status: 'FAIL',
      details: '納品書生成失敗',
      duration,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

async function checkDeliveryStatus(token: string, deliveryId: string): Promise<boolean> {
  const startTime = Date.now()
  console.log(`🔍 納品ステータス確認 (ID: ${deliveryId})...`)

  try {
    const response = await fetch(`${BASE_URL}/api/deliveries`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      }
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (result.deliveries) {
      const delivery = result.deliveries.find((d: any) => d.id === deliveryId)
      if (delivery) {
        console.log(`✅ 納品ステータス: ${delivery.status}`)
        console.log(`   📋 納品番号: ${delivery.deliveryNumber || '未設定'}`)
        console.log(`   📊 Google Sheet ID: ${delivery.googleSheetId || '未設定'}`)
        console.log(`   🔗 Google Sheet URL: ${delivery.googleSheetUrl || '未設定'}`)

        const isCompleted = delivery.status === 'DELIVERED' &&
                          delivery.googleSheetId &&
                          delivery.googleSheetUrl

        results.push({
          name: 'Check Delivery Status',
          status: isCompleted ? 'PASS' : 'FAIL',
          details: `ステータス: ${delivery.status}, Google Sheets: ${delivery.googleSheetId ? '作成済み' : '未作成'}`,
          duration
        })
        return isCompleted
      } else {
        throw new Error('納品データが見つかりません')
      }
    } else {
      throw new Error('納品データ取得失敗')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ ステータス確認失敗:', error)
    results.push({
      name: 'Check Delivery Status',
      status: 'FAIL',
      details: 'ステータス確認失敗',
      duration,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

async function testErrorHandling(token: string): Promise<boolean> {
  const startTime = Date.now()
  console.log('🔧 エラーハンドリングテスト...')

  try {
    // 無効なdeliveryIdでテスト
    const response = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      },
      body: JSON.stringify({
        deliveryId: 'invalid-id',
        templateId: '1125769553'
      })
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (!result.success && result.error) {
      console.log('✅ エラーハンドリング正常')
      console.log(`   📋 エラーメッセージ: ${result.error}`)

      results.push({
        name: 'Error Handling Test',
        status: 'PASS',
        details: 'エラー処理正常動作',
        duration
      })
      return true
    } else {
      throw new Error('エラーハンドリングが期待通りに動作しません')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ エラーハンドリングテスト失敗:', error)
    results.push({
      name: 'Error Handling Test',
      status: 'FAIL',
      details: 'エラー処理テスト失敗',
      duration,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

async function main() {
  console.log('🚀 本番環境 納品書生成機能テスト開始')
  console.log(`🌐 対象URL: ${BASE_URL}`)
  console.log('')

  // 1. ログインテスト
  const token = await testLogin()
  if (!token) {
    console.log('❌ ログインに失敗したためテストを中止します')
    return
  }
  console.log('')

  // 2. 納品データ取得
  const deliveries = await getDeliveries(token)
  if (deliveries.length === 0) {
    console.log('❌ テスト用納品データがありません')
    return
  }
  console.log('')

  // 3. 最初の納品データでテスト
  const testDelivery = deliveries[0]
  console.log(`🎯 テスト対象納品: ${testDelivery.id}`)
  console.log(`   顧客: ${testDelivery.customer?.companyName || '不明'}`)
  console.log(`   金額: ${testDelivery.totalAmount?.toLocaleString() || 0}円`)
  console.log(`   現在ステータス: ${testDelivery.status}`)
  console.log('')

  // 4. 納品書生成テスト
  const deliverySuccess = await testCreateDeliverySheet(token, testDelivery.id, '1125769553')
  console.log('')

  // 5. ステータス確認
  if (deliverySuccess) {
    await checkDeliveryStatus(token, testDelivery.id)
    console.log('')
  }

  // 6. エラーハンドリングテスト
  await testErrorHandling(token)
  console.log('')

  // 結果表示
  console.log('📊 テスト結果サマリー')
  console.log('━'.repeat(120))
  console.table(results.map(r => ({
    テスト名: r.name,
    結果: r.status,
    詳細: r.details,
    実行時間: `${r.duration}ms`,
    エラー: r.error || '-'
  })))

  const passCount = results.filter(r => r.status === 'PASS').length
  const failCount = results.filter(r => r.status === 'FAIL').length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  console.log('')
  console.log(`✅ 成功: ${passCount}件`)
  console.log(`❌ 失敗: ${failCount}件`)
  console.log(`⏱️  総実行時間: ${totalTime}ms`)
  console.log('')

  if (failCount === 0) {
    console.log('🎉 全テスト成功！納品システムは正常に動作しています')
  } else {
    console.log('⚠️  一部テストが失敗しました。詳細を確認してください')
  }
}

main().catch(console.error)