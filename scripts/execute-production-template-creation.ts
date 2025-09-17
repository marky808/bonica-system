#!/usr/bin/env tsx
/**
 * 本番環境でGoogle Sheetsテンプレート作成を直接実行
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function executeTemplateCreation() {
  console.log('🚀 本番環境でGoogle Sheetsテンプレート作成実行')
  console.log('=' * 50)

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

    // 2. テンプレート作成APIを呼び出し
    console.log('📊 テンプレート作成API呼び出し中...')

    const createResponse = await fetch(`${PRODUCTION_URL}/api/admin/create-google-sheets-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        createDeliveryTemplate: true,
        createInvoiceTemplate: true
      })
    })

    console.log(`📡 API応答ステータス: ${createResponse.status}`)

    if (createResponse.ok) {
      const result = await createResponse.json()
      console.log('✅ テンプレート作成成功!')
      console.log('')
      console.log('📊 作成結果:')
      console.log(JSON.stringify(result, null, 2))

      if (result.templates) {
        console.log('')
        console.log('🔗 テンプレートURL:')
        console.log(`納品書: ${result.templates.delivery?.url}`)
        console.log(`請求書: ${result.templates.invoice?.url}`)
      }

      return result
    } else {
      const errorText = await createResponse.text()
      console.log('⚠️ API呼び出し失敗')
      console.log(`ステータス: ${createResponse.status}`)
      console.log(`エラー: ${errorText}`)

      // 代替案: 既存のGoogle Sheets設定を確認
      console.log('')
      console.log('🔧 代替手段を試行中...')

      const templatesResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (templatesResponse.ok) {
        const templates = await templatesResponse.json()
        console.log('📋 現在のテンプレート設定:', templates)

        if (templates && templates.length === 0) {
          console.log('📝 新しいテンプレート作成が必要です')

          // ヘルスチェックで環境変数の存在確認
          const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`)
          if (healthResponse.ok) {
            const health = await healthResponse.json()
            console.log('💚 システム状態:', health)
          }

          console.log('')
          console.log('🔧 本番環境でのテンプレート作成手順:')
          console.log('1. Vercel Dashboard → Functions → Terminal')
          console.log('2. 以下のコマンドを実行:')
          console.log('   npx tsx scripts/create-google-sheets-templates.ts')
          console.log('')
          console.log('または、環境変数確認:')
          console.log('- GOOGLE_SHEETS_SPREADSHEET_ID')
          console.log('- GOOGLE_SHEETS_CLIENT_EMAIL')
          console.log('- GOOGLE_SHEETS_PRIVATE_KEY')
          console.log('- GOOGLE_SHEETS_PROJECT_ID')
        }
      }

      return {
        status: 'failed',
        error: errorText,
        statusCode: createResponse.status
      }
    }

  } catch (error) {
    console.error('❌ 実行エラー:', error)
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

if (require.main === module) {
  executeTemplateCreation()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result?.status || 'unknown')
    })
    .catch(console.error)
}

export { executeTemplateCreation }