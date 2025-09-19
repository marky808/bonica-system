#!/usr/bin/env tsx

/**
 * Google Sheets認証とAPIアクセスの詳細デバッグスクリプト
 */

const BASE_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'

interface DebugResult {
  step: string
  status: 'SUCCESS' | 'FAIL'
  details: any
  error?: string
}

const results: DebugResult[] = []

async function debugLogin(): Promise<string | null> {
  console.log('🔐 認証テスト...')

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: '6391'
      })
    })

    const result = await response.json()

    if (result.user && result.token) {
      results.push({
        step: 'Authentication',
        status: 'SUCCESS',
        details: { user: result.user.name, hasToken: !!result.token }
      })
      return result.token
    } else {
      results.push({
        step: 'Authentication',
        status: 'FAIL',
        details: result,
        error: 'No user or token in response'
      })
      return null
    }
  } catch (error) {
    results.push({
      step: 'Authentication',
      status: 'FAIL',
      details: {},
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

async function debugGoogleSheetsAPI(token: string): Promise<void> {
  console.log('📊 Google Sheets API アクセステスト...')

  // 1. テンプレート取得テスト
  try {
    const templateResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      }
    })

    const templateResult = await templateResponse.json()

    results.push({
      step: 'Template API Access',
      status: templateResponse.ok ? 'SUCCESS' : 'FAIL',
      details: {
        status: templateResponse.status,
        hasTemplates: templateResult.templates?.length > 0,
        templateCount: templateResult.templates?.length || 0,
        error: templateResult.error,
        message: templateResult.message
      },
      error: templateResponse.ok ? undefined : `HTTP ${templateResponse.status}`
    })
  } catch (error) {
    results.push({
      step: 'Template API Access',
      status: 'FAIL',
      details: {},
      error: error instanceof Error ? error.message : String(error)
    })
  }

  // 2. 納品データ取得テスト
  try {
    const deliveryResponse = await fetch(`${BASE_URL}/api/deliveries`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      }
    })

    const deliveryResult = await deliveryResponse.json()

    results.push({
      step: 'Delivery Data Access',
      status: deliveryResponse.ok ? 'SUCCESS' : 'FAIL',
      details: {
        status: deliveryResponse.status,
        deliveryCount: deliveryResult.deliveries?.length || 0,
        deliveries: deliveryResult.deliveries?.map((d: any) => ({
          id: d.id,
          status: d.status,
          customer: d.customer?.companyName
        })) || []
      },
      error: deliveryResponse.ok ? undefined : `HTTP ${deliveryResponse.status}`
    })

    // 3. 実際の納品書作成テスト（最初の納品データを使用）
    if (deliveryResult.deliveries && deliveryResult.deliveries.length > 0) {
      const testDelivery = deliveryResult.deliveries.find((d: any) => d.status === 'PENDING') || deliveryResult.deliveries[0]

      console.log('📋 実際の納品書作成テスト...')

      const createResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': `auth-token=${token}`
        },
        body: JSON.stringify({
          deliveryId: testDelivery.id,
          templateId: '1125769553'
        })
      })

      const createResult = await createResponse.json()

      results.push({
        step: 'Delivery Sheet Creation',
        status: createResponse.ok && createResult.success ? 'SUCCESS' : 'FAIL',
        details: {
          status: createResponse.status,
          deliveryId: testDelivery.id,
          templateId: '1125769553',
          success: createResult.success,
          url: createResult.url,
          sheetId: createResult.sheetId,
          error: createResult.error,
          details: createResult.details,
          debugInfo: createResult.debugInfo
        },
        error: createResponse.ok ? createResult.error : `HTTP ${createResponse.status}`
      })
    }

  } catch (error) {
    results.push({
      step: 'Delivery Data Access',
      status: 'FAIL',
      details: {},
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

async function main() {
  console.log('🚀 Google Sheets 詳細デバッグ開始')
  console.log(`🌐 対象URL: ${BASE_URL}`)
  console.log('')

  // 認証テスト
  const token = await debugLogin()
  if (!token) {
    console.log('❌ 認証に失敗したため中止します')
    return
  }

  // Google Sheets API テスト
  await debugGoogleSheetsAPI(token)

  // 結果表示
  console.log('')
  console.log('📊 デバッグ結果サマリー')
  console.log('━'.repeat(120))

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.step}: ${result.status}`)
    if (result.error) {
      console.log(`   ❌ エラー: ${result.error}`)
    }
    console.log(`   📋 詳細:`, JSON.stringify(result.details, null, 2))
    console.log('')
  })

  const successCount = results.filter(r => r.status === 'SUCCESS').length
  const failCount = results.filter(r => r.status === 'FAIL').length

  console.log(`✅ 成功: ${successCount}件`)
  console.log(`❌ 失敗: ${failCount}件`)

  if (failCount === 0) {
    console.log('🎉 全テスト成功！Google Sheets連携は正常です')
  } else {
    console.log('⚠️  問題が検出されました。詳細を確認してください')
  }
}

main().catch(console.error)