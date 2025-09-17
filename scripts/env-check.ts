#!/usr/bin/env tsx
/**
 * 本番環境の環境変数設定状況を確認
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function checkEnvironmentVariables() {
  console.log('🔍 本番環境の環境変数設定状況確認')
  console.log('='.repeat(50))

  try {
    // 1. ログイン
    console.log('🔐 認証中...')
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(LOGIN_CREDENTIALS)
    })

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }

    const { token, user } = await loginResponse.json()
    console.log(`✅ ログイン成功: ${user.name}`)

    // 2. 環境変数チェック用のAPIエンドポイントがあるか確認
    console.log('🔍 システム状態確認中...')
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`)
    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log('💚 システム状態:', health)
    }

    // 3. Google Sheets関連のAPIエンドポイントの詳細確認
    console.log('')
    console.log('🔧 Google Sheets API詳細テスト')

    // エラーレスポンスから環境変数の状況を推測
    const testResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        createSheets: true,
        debug: true
      })
    })

    console.log(`📡 テストAPI応答: ${testResponse.status}`)
    const responseText = await testResponse.text()
    console.log('📄 API応答内容:', responseText)

    // JSONとして解析を試行
    try {
      const responseJson = JSON.parse(responseText)
      console.log('📊 解析されたレスポンス:', JSON.stringify(responseJson, null, 2))

      if (responseJson.error) {
        console.log('❌ エラー詳細:', responseJson.error)

        if (responseJson.error.includes('設定されていません')) {
          console.log('')
          console.log('🔧 環境変数設定が不足しています:')
          const missingVars = responseJson.error.match(/([A-Z_]+)\s*が設定されていません/)
          if (missingVars) {
            console.log(`- ${missingVars[1]}`)
          }
        }
      }
    } catch (e) {
      console.log('⚠️ レスポンスのJSON解析に失敗:', e)
    }

    return {
      status: 'checked',
      healthCheck: health,
      apiResponse: responseText
    }

  } catch (error) {
    console.error('❌ 確認エラー:', error)
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

if (require.main === module) {
  checkEnvironmentVariables()
    .then(result => {
      console.log('')
      console.log('🎯 確認結果:', result.status)
      console.log('')
      console.log('💡 推奨アクション:')
      console.log('1. Vercel Dashboard → Settings → Environment Variables で以下を確認:')
      console.log('   - GOOGLE_SHEETS_SPREADSHEET_ID')
      console.log('   - GOOGLE_SHEETS_CLIENT_EMAIL')
      console.log('   - GOOGLE_SHEETS_PRIVATE_KEY')
      console.log('   - GOOGLE_SHEETS_PROJECT_ID')
      console.log('')
      console.log('2. 必要に応じてサービスアカウントキーを再設定')
      console.log('3. 環境変数が設定されたら、Vercelで再デプロイ')
    })
    .catch(console.error)
}

export { checkEnvironmentVariables }