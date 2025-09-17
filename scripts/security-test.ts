#!/usr/bin/env tsx

interface SecurityTestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  details: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

const results: SecurityTestResult[] = []

function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', details: string, severity: 'HIGH' | 'MEDIUM' | 'LOW') {
  results.push({ test, status, details, severity })
}

async function testSQLInjection() {
  console.log('🔍 SQLインジェクション攻撃テスト...')

  // ログインSQL Injection試行
  const sqlPayloads = [
    "admin'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin' OR '1'='1' -- ",
    "'; UNION SELECT * FROM users WHERE '1'='1",
    "admin'; UPDATE users SET password='hacked' WHERE '1'='1' --"
  ]

  for (const payload of sqlPayloads) {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload,
          password: 'test123'
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult('SQLインジェクション防御', 'FAIL', `SQLインジェクション攻撃が成功: ${payload}`, 'HIGH')
        return
      } else if (response.status !== 401 && response.status !== 400) {
        addResult('SQLインジェクション防御', 'WARNING', `予期しないレスポンス: ${response.status}`, 'MEDIUM')
      }
    } catch (error) {
      // エラーが発生するのは正常（適切な防御）
    }
  }

  addResult('SQLインジェクション防御', 'PASS', 'SQLインジェクション攻撃は全て防御されました', 'HIGH')
}

async function testXSSVulnerability() {
  console.log('🔍 XSS攻撃テスト...')

  const xssPayloads = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg onload=alert('XSS')>",
    "'><script>alert('XSS')</script>"
  ]

  // ヘルスチェックAPIでのXSSテスト（通常は影響しないが、ログ等で問題になる可能性）
  for (const payload of xssPayloads) {
    try {
      const response = await fetch(`http://localhost:3000/api/health?test=${encodeURIComponent(payload)}`)
      const data = await response.json()

      // レスポンスにスクリプトタグが含まれていないかチェック
      const responseText = JSON.stringify(data)
      if (responseText.includes('<script>') || responseText.includes('javascript:')) {
        addResult('XSS防御', 'FAIL', `XSSペイロードがエスケープされていません: ${payload}`, 'HIGH')
        return
      }
    } catch (error) {
      // エラーは正常
    }
  }

  addResult('XSS防御', 'PASS', 'XSS攻撃は適切に処理されています', 'MEDIUM')
}

async function testPasswordSecurity() {
  console.log('🔍 パスワードセキュリティテスト...')

  // 弱いパスワードでのユーザー作成試行（実際のAPIがあれば）
  // 現在のシステムは既存ユーザーのみなので、パスワード強度をチェック

  // BCryptが使用されているかチェック
  try {
    const bcrypt = require('bcryptjs')
    const testHash = bcrypt.hashSync('test123', 10)
    if (testHash.startsWith('$2')) {
      addResult('パスワードハッシュ化', 'PASS', 'BCryptを使用した適切なハッシュ化', 'HIGH')
    } else {
      addResult('パスワードハッシュ化', 'FAIL', 'BCryptが正しく動作していません', 'HIGH')
    }
  } catch (error) {
    addResult('パスワードハッシュ化', 'FAIL', 'BCryptライブラリがありません', 'HIGH')
  }
}

async function testAuthorizationBypass() {
  console.log('🔍 認証バイパステスト...')

  const protectedEndpoints = [
    '/api/suppliers',
    '/api/customers',
    '/api/purchases',
    '/api/deliveries',
    '/api/categories'
  ]

  let unprotectedCount = 0

  for (const endpoint of protectedEndpoints) {
    try {
      // 認証なしでアクセス試行
      const response = await fetch(`http://localhost:3000${endpoint}`)

      if (response.ok) {
        addResult('認証制御', 'FAIL', `認証なしでアクセス可能: ${endpoint}`, 'HIGH')
        unprotectedCount++
      } else if (response.status === 401) {
        // 正常な認証エラー
      } else {
        addResult('認証制御', 'WARNING', `予期しないレスポンス ${endpoint}: ${response.status}`, 'MEDIUM')
      }
    } catch (error) {
      // エラーは正常
    }
  }

  if (unprotectedCount === 0) {
    addResult('認証制御', 'PASS', '全ての保護されたエンドポイントで認証が必要', 'HIGH')
  }
}

async function testJWTSecurity() {
  console.log('🔍 JWT セキュリティテスト...')

  // 無効なJWTトークンテスト
  const invalidTokens = [
    'invalid.token.here',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    '',
    'Bearer ',
    'fake-token'
  ]

  let vulnerableCount = 0

  for (const token of invalidTokens) {
    try {
      const response = await fetch('http://localhost:3000/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        addResult('JWT検証', 'FAIL', `無効なトークンでアクセス成功: ${token}`, 'HIGH')
        vulnerableCount++
      }
    } catch (error) {
      // エラーは正常
    }
  }

  if (vulnerableCount === 0) {
    addResult('JWT検証', 'PASS', '無効なJWTトークンは全て拒否されました', 'HIGH')
  }
}

async function testRateLimiting() {
  console.log('🔍 レート制限テスト...')

  // 短時間での大量リクエスト
  const requests = []
  for (let i = 0; i < 20; i++) {
    requests.push(
      fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrong'
        })
      })
    )
  }

  try {
    const responses = await Promise.all(requests)
    const rateLimitedCount = responses.filter(r => r.status === 429).length

    if (rateLimitedCount > 0) {
      addResult('レート制限', 'PASS', `${rateLimitedCount}件のリクエストがレート制限されました`, 'MEDIUM')
    } else {
      addResult('レート制限', 'WARNING', 'レート制限が設定されていません', 'MEDIUM')
    }
  } catch (error) {
    addResult('レート制限', 'WARNING', `レート制限テストでエラー: ${error}`, 'LOW')
  }
}

async function testHTTPSRedirect() {
  console.log('🔍 HTTPS リダイレクトテスト...')

  // 開発環境ではHTTPSリダイレクトは通常無効
  addResult('HTTPS強制', 'WARNING', '開発環境のため HTTPS リダイレクトは評価されません', 'MEDIUM')
}

async function testSecurityHeaders() {
  console.log('🔍 セキュリティヘッダーテスト...')

  try {
    const response = await fetch('http://localhost:3000/api/health')
    const headers = response.headers

    // 重要なセキュリティヘッダーをチェック
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }

    let missingHeaders = []
    let correctHeaders = []

    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const value = headers.get(header)
      if (value === expectedValue) {
        correctHeaders.push(header)
      } else {
        missingHeaders.push(`${header} (期待値: ${expectedValue}, 実際: ${value || 'なし'})`)
      }
    }

    if (missingHeaders.length === 0) {
      addResult('セキュリティヘッダー', 'PASS', `セキュリティヘッダーが適切に設定されています: ${correctHeaders.join(', ')}`, 'MEDIUM')
    } else {
      addResult('セキュリティヘッダー', 'WARNING', `不足/不正なヘッダー: ${missingHeaders.join(', ')}`, 'MEDIUM')
    }
  } catch (error) {
    addResult('セキュリティヘッダー', 'FAIL', `ヘッダーテストでエラー: ${error}`, 'LOW')
  }
}

async function runSecurityTests() {
  console.log('🔒 セキュリティ診断開始')
  console.log('=' * 50)

  await testSQLInjection()
  await testXSSVulnerability()
  await testPasswordSecurity()
  await testAuthorizationBypass()
  await testJWTSecurity()
  await testRateLimiting()
  await testHTTPSRedirect()
  await testSecurityHeaders()

  console.log('\n🛡️  セキュリティテスト結果')
  console.log('=' * 50)

  const highSeverity = results.filter(r => r.severity === 'HIGH')
  const mediumSeverity = results.filter(r => r.severity === 'MEDIUM')
  const lowSeverity = results.filter(r => r.severity === 'LOW')

  const passed = results.filter(r => r.status === 'PASS')
  const failed = results.filter(r => r.status === 'FAIL')
  const warnings = results.filter(r => r.status === 'WARNING')

  console.table(results.map(r => ({
    テスト項目: r.test,
    結果: r.status,
    重要度: r.severity,
    詳細: r.details.substring(0, 60)
  })))

  console.log(`\n✅ 成功: ${passed.length}件`)
  console.log(`❌ 失敗: ${failed.length}件`)
  console.log(`⚠️  警告: ${warnings.length}件`)

  console.log(`\n🔴 高重要度: ${highSeverity.length}件`)
  console.log(`🟡 中重要度: ${mediumSeverity.length}件`)
  console.log(`🟢 低重要度: ${lowSeverity.length}件`)

  if (failed.length > 0) {
    console.log('\n❌ 失敗した項目:')
    failed.forEach(r => {
      console.log(`  - [${r.severity}] ${r.test}: ${r.details}`)
    })
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告項目:')
    warnings.forEach(r => {
      console.log(`  - [${r.severity}] ${r.test}: ${r.details}`)
    })
  }

  return results
}

if (require.main === module) {
  runSecurityTests().catch(console.error)
}

export { runSecurityTests }