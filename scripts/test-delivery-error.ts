#!/usr/bin/env tsx

/**
 * 詳細エラーログ取得テスト
 */

const BASE_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'

async function main() {
  console.log('🔍 詳細エラーログ取得テスト')

  // ログイン
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '808works.jp@gmail.com',
      password: '6391'
    })
  })

  const loginResult = await loginResponse.json()
  const token = loginResult.token

  if (!token) {
    console.error('❌ ログイン失敗')
    return
  }

  console.log('✅ ログイン成功')

  // 納品書生成APIを詳細ログ付きで呼び出し
  console.log('📊 納品書生成API呼び出し中...')

  const response = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth-token=${token}`
    },
    body: JSON.stringify({
      deliveryId: 'cmfr18ph6000219fjzrfsy9r7',
      templateId: '1125769553'
    })
  })

  console.log('📋 Response Status:', response.status)
  console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()))

  const result = await response.json()
  console.log('📋 Full Response Body:')
  console.log(JSON.stringify(result, null, 2))

  // debugInfo が含まれているかチェック
  if (result.debugInfo) {
    console.log('🔍 Debug Info found:')
    console.log(JSON.stringify(result.debugInfo, null, 2))
  } else {
    console.log('⚠️ No debug info in response')
  }
}

main().catch(console.error)