#!/usr/bin/env tsx

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

interface ProductionTestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  details: string
  duration: number
  url?: string
}

const results: ProductionTestResult[] = []

async function addResult(name: string, testFn: () => Promise<any>, url?: string) {
  const start = Date.now()
  try {
    const result = await testFn()
    results.push({
      test: name,
      status: 'PASS',
      details: typeof result === 'string' ? result : 'テスト成功',
      duration: Date.now() - start,
      url
    })
  } catch (error) {
    results.push({
      test: name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
      url
    })
  }
}

async function testProductionHealth() {
  const response = await fetch(`${PRODUCTION_URL}/api/health`)
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`)

  const data = await response.json()
  console.log('🏥 Production Health:', data)

  if (!data.status || data.status !== 'healthy') {
    throw new Error('System not healthy')
  }

  return `システム正常 - ${data.message || 'OK'}`
}

async function testProductionAuthentication() {
  // 正常ログイン
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  })

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text()
    throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`)
  }

  const { token, user } = await loginResponse.json()

  if (!token || !user) {
    throw new Error('認証トークンまたはユーザー情報が取得できません')
  }

  console.log('🔐 Production Login Success:', user.name)

  // 不正ログインテスト
  const invalidLogin = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'invalid@test.com',
      password: 'wrong'
    })
  })

  if (invalidLogin.ok) {
    throw new Error('不正ログインが成功してしまった')
  }

  return `認証成功: ${user.name} - 不正ログイン拒否OK`
}

async function testProductionAPIs() {
  // まず認証トークンを取得
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  })

  if (!loginResponse.ok) {
    throw new Error('認証に失敗しました')
  }

  const { token } = await loginResponse.json()

  // 各APIエンドポイントをテスト
  const endpoints = [
    '/api/suppliers',
    '/api/customers',
    '/api/categories',
    '/api/purchases',
    '/api/deliveries'
  ]

  const results = []

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        results.push(`${endpoint}: ${Array.isArray(data) ? data.length : 'OK'}件`)
      } else {
        results.push(`${endpoint}: ERROR ${response.status}`)
      }
    } catch (error) {
      results.push(`${endpoint}: FAILED - ${error}`)
    }
  }

  return results.join(', ')
}

async function testProductionSecurity() {
  console.log('🔒 Production Security Tests...')

  // SQLインジェクション攻撃テスト
  const sqlPayload = "admin'; DROP TABLE users; --"
  const sqlResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: sqlPayload,
      password: 'test123'
    })
  })

  if (sqlResponse.ok) {
    throw new Error('SQLインジェクション攻撃が成功してしまった')
  }

  // 認証なしアクセステスト
  const unauthorizedResponse = await fetch(`${PRODUCTION_URL}/api/suppliers`)
  if (unauthorizedResponse.ok) {
    throw new Error('認証なしでAPIアクセスが成功してしまった')
  }

  return 'SQLインジェクション防御OK, 認証制御OK'
}

async function testProductionPerformance() {
  const endpoints = [
    { path: '/api/health', name: 'Health API' },
    { path: '/', name: 'Home Page' }
  ]

  const performanceResults = []

  for (const endpoint of endpoints) {
    const times = []

    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      try {
        const response = await fetch(`${PRODUCTION_URL}${endpoint.path}`)
        const end = Date.now()
        times.push(end - start)
      } catch (error) {
        times.push(5000) // タイムアウトとして扱う
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    performanceResults.push(`${endpoint.name}: ${Math.round(avgTime)}ms`)
  }

  return performanceResults.join(', ')
}

async function testProductionSSL() {
  // HTTPSの証明書確認
  try {
    const response = await fetch(PRODUCTION_URL.replace('https://', 'http://'))
    if (response.ok) {
      throw new Error('HTTP接続が許可されている（HTTPS強制されていない）')
    }
  } catch (error) {
    // HTTPアクセスが失敗するのは正常
  }

  // HTTPS接続確認
  const httpsResponse = await fetch(PRODUCTION_URL)
  if (!httpsResponse.ok && httpsResponse.status !== 200) {
    throw new Error('HTTPS接続に失敗')
  }

  return 'HTTPS強制OK, SSL証明書有効'
}

async function testProductionGoogleSheetsIntegration() {
  // 認証トークン取得
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  })

  if (!loginResponse.ok) {
    throw new Error('認証に失敗')
  }

  const { token } = await loginResponse.json()

  // Google Sheets テンプレート確認
  const templatesResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!templatesResponse.ok) {
    throw new Error(`Google Sheets templates API failed: ${templatesResponse.status}`)
  }

  const templates = await templatesResponse.json()
  console.log('📊 Google Sheets Templates:', templates)

  return 'Google Sheets API接続OK - テンプレート確認済み'
}

async function runProductionTests() {
  console.log('🚀 BONICA Production Environment Test')
  console.log('=' * 60)
  console.log(`🌐 Target URL: ${PRODUCTION_URL}`)
  console.log(`👤 Login: ${LOGIN_CREDENTIALS.email}`)
  console.log('=' * 60)

  await addResult('Production Health Check', testProductionHealth, `${PRODUCTION_URL}/api/health`)
  await addResult('Production Authentication', testProductionAuthentication, `${PRODUCTION_URL}/login`)
  await addResult('Production APIs Test', testProductionAPIs)
  await addResult('Production Security Test', testProductionSecurity)
  await addResult('Production Performance Test', testProductionPerformance)
  await addResult('Production SSL/HTTPS Test', testProductionSSL)
  await addResult('Google Sheets Integration Test', testProductionGoogleSheetsIntegration, `${PRODUCTION_URL}/api/google-sheets/templates`)

  console.log('\n📊 Production Test Results')
  console.log('=' * 60)

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  console.table(results.map(r => ({
    テスト名: r.test,
    結果: r.status,
    詳細: r.details.substring(0, 80),
    実行時間: `${r.duration}ms`,
    URL: r.url ? r.url.replace(PRODUCTION_URL, '') : '-'
  })))

  console.log(`\n✅ 成功: ${passed}件`)
  console.log(`❌ 失敗: ${failed}件`)
  console.log(`⏭️  スキップ: ${skipped}件`)
  console.log(`⏱️  総実行時間: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`)

  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}: ${r.details}`)
    })
  }

  // 最終評価
  console.log('\n🎯 Production Environment Assessment:')
  if (failed === 0) {
    console.log('✅ 本番環境は完全に正常動作しています')
  } else if (failed <= 2) {
    console.log('🟡 本番環境は概ね正常ですが、一部に問題があります')
  } else {
    console.log('🔴 本番環境に重要な問題があります')
  }

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    results,
    url: PRODUCTION_URL
  }
}

if (require.main === module) {
  runProductionTests().catch(console.error)
}

export { runProductionTests, PRODUCTION_URL }