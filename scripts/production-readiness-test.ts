#!/usr/bin/env tsx

/**
 * 本番運用準備テスト
 * 実務フロー全体を検証する包括的テスト
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://bonica-system.vercel.app'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  try {
    await testFn()
    results.push({
      name,
      status: 'pass',
      message: '成功',
      duration: Date.now() - start
    })
    console.log(`✅ ${name}`)
  } catch (error: any) {
    results.push({
      name,
      status: 'fail',
      message: error.message || String(error),
      duration: Date.now() - start
    })
    console.log(`❌ ${name}: ${error.message}`)
  }
}

async function login(): Promise<string> {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error('TEST_EMAIL と TEST_PASSWORD 環境変数を設定してください')
  }

  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const result = await response.json()
  if (!result.token) {
    throw new Error('ログイン失敗: ' + JSON.stringify(result))
  }
  return result.token
}

async function main() {
  console.log('🚀 本番運用準備テスト開始')
  console.log('📍 テスト対象:', BASE_URL)
  console.log('━'.repeat(60))

  let token: string = ''
  let testCustomerId: string = ''
  let testPurchaseId: string = ''
  let testDeliveryId: string = ''

  // 1. 認証テスト
  await runTest('1. ログイン認証', async () => {
    token = await login()
    if (!token) throw new Error('トークンが取得できません')
  })

  if (!token) {
    console.log('\n❌ ログインに失敗したため、テストを中止します')
    console.log('💡 環境変数 TEST_EMAIL と TEST_PASSWORD を設定してください')
    return
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  // 2. マスタデータ取得テスト
  await runTest('2. 納品先一覧取得', async () => {
    const response = await fetch(`${BASE_URL}/api/customers`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const customers = await response.json()
    if (!Array.isArray(customers)) throw new Error('配列ではありません')
    if (customers.length > 0) testCustomerId = customers[0].id
    console.log(`   → ${customers.length}件の納品先`)
  })

  await runTest('3. 仕入れ先一覧取得', async () => {
    const response = await fetch(`${BASE_URL}/api/suppliers`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const suppliers = await response.json()
    if (!Array.isArray(suppliers)) throw new Error('配列ではありません')
    console.log(`   → ${suppliers.length}件の仕入れ先`)
  })

  // 3. 仕入れフローテスト
  await runTest('5. 仕入れ一覧取得', async () => {
    const response = await fetch(`${BASE_URL}/api/purchases`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    console.log(`   → ${result.purchases?.length || 0}件の仕入れ`)
  })

  await runTest('6. 利用可能な仕入れ取得', async () => {
    const response = await fetch(`${BASE_URL}/api/purchases/available`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const purchases = await response.json()
    if (!Array.isArray(purchases)) throw new Error('配列ではありません')
    if (purchases.length > 0) testPurchaseId = purchases[0].id
    console.log(`   → ${purchases.length}件の利用可能な仕入れ`)
  })

  // 4. 納品フローテスト
  await runTest('7. 納品一覧取得', async () => {
    const response = await fetch(`${BASE_URL}/api/deliveries`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    console.log(`   → ${result.deliveries?.length || 0}件の納品`)
  })

  if (testCustomerId && testPurchaseId) {
    await runTest('8. 納品作成', async () => {
      const response = await fetch(`${BASE_URL}/api/deliveries`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: testCustomerId,
          deliveryDate: new Date().toISOString().split('T')[0],
          items: [{
            purchaseId: testPurchaseId,
            quantity: 1,
            unitPrice: 100,
            unit: 'kg',
            taxRate: 8
          }]
        })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      const delivery = await response.json()
      testDeliveryId = delivery.id
      console.log(`   → 納品ID: ${delivery.id}`)
    })

    if (testDeliveryId) {
      await runTest('9. 納品書作成（Google Sheets）', async () => {
        const response = await fetch(`${BASE_URL}/api/google-sheets/create-delivery-v2`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ deliveryId: testDeliveryId })
        })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || '納品書作成失敗')
        console.log(`   → Sheet URL: ${result.url}`)
      })

      await runTest('10. 請求書作成（Google Sheets）', async () => {
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

        const response = await fetch(`${BASE_URL}/api/google-sheets/create-invoice-v2`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customerId: testCustomerId,
            startDate,
            endDate
          })
        })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || '請求書作成失敗')
        console.log(`   → Sheet URL: ${result.url}`)
      })
    }
  } else {
    results.push({
      name: '8-10. 納品・請求書フロー',
      status: 'skip',
      message: '納品先または仕入れデータがないためスキップ',
      duration: 0
    })
    console.log('⏭️ 8-10. 納品・請求書フロー: スキップ（テストデータなし）')
  }

  // 5. ダッシュボードテスト
  await runTest('11. ダッシュボード統計取得', async () => {
    const response = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const stats = await response.json()
    console.log(`   → 月間売上: ¥${stats.monthlyRevenue?.toLocaleString() || 0}`)
  })

  await runTest('12. 最近のアクティビティ取得', async () => {
    const response = await fetch(`${BASE_URL}/api/dashboard/activities`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const activities = await response.json()
    console.log(`   → ${activities.length}件のアクティビティ`)
  })

  // 6. レポートテスト
  await runTest('13. レポートデータ取得', async () => {
    const now = new Date()
    const response = await fetch(
      `${BASE_URL}/api/reports?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      { headers }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const report = await response.json()
    console.log(`   → 月間レポート取得成功`)
  })

  // 結果サマリー
  console.log('\n' + '━'.repeat(60))
  console.log('📊 テスト結果サマリー')
  console.log('━'.repeat(60))

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  console.log(`✅ 成功: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`⏭️ スキップ: ${skipped}`)
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`)
    })
  }

  console.log('\n' + '━'.repeat(60))
  if (failed === 0) {
    console.log('🎉 全テスト成功！本番運用の準備が整っています。')
  } else {
    console.log('⚠️ 一部のテストが失敗しました。修正が必要です。')
  }
}

main().catch(console.error)
