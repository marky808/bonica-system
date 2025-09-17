#!/usr/bin/env tsx
/**
 * 最終的なGoogle Sheetsテンプレート作成スクリプト
 * 現在機能している /api/google-sheets/templates エンドポイントを使用
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function finalTemplateCreation() {
  console.log('🎯 最終Google Sheetsテンプレート作成実行')
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

    // 2. 環境変数の存在確認（ヘルスチェック経由）
    console.log('💚 システム状態確認中...')
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`)
    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log(`✅ システム状態: ${health.message}`)
      console.log(`📊 データベース: ${health.database}`)
    }

    // 3. /api/google-sheets/templates で createSheets: true を使用
    console.log('📊 Google Sheetsテンプレート作成中...')
    console.log('💡 使用エンドポイント: /api/google-sheets/templates')

    const createResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        createSheets: true
      })
    })

    console.log(`📡 API応答ステータス: ${createResponse.status}`)

    if (createResponse.ok) {
      const result = await createResponse.json()
      console.log('🎉 テンプレート作成成功!')
      console.log('')
      console.log('📊 作成結果:')
      console.log(JSON.stringify(result, null, 2))

      if (result.templates) {
        console.log('')
        console.log('🔗 テンプレートURL:')
        console.log(`📋 納品書: ${result.templates.delivery?.url}`)
        console.log(`💰 請求書: ${result.templates.invoice?.url}`)
        console.log('')
        console.log(`📄 スプレッドシート: ${result.spreadsheetUrl}`)
      }

      if (result.envConfig) {
        console.log('')
        console.log('⚙️ 環境変数設定情報:')
        console.log(`GOOGLE_SHEETS_DELIVERY_SHEET_ID: ${result.envConfig.GOOGLE_SHEETS_DELIVERY_SHEET_ID}`)
        console.log(`GOOGLE_SHEETS_INVOICE_SHEET_ID: ${result.envConfig.GOOGLE_SHEETS_INVOICE_SHEET_ID}`)
      }

      return result
    } else {
      const errorText = await createResponse.text()
      console.log(`❌ テンプレート作成失敗: ${createResponse.status}`)
      console.log(`エラー詳細: ${errorText}`)

      // 環境変数が設定されていない場合の対処
      if (errorText.includes('が設定されていません')) {
        console.log('')
        console.log('🔧 環境変数設定が必要です:')
        console.log('- GOOGLE_SHEETS_SPREADSHEET_ID')
        console.log('- GOOGLE_SHEETS_CLIENT_EMAIL')
        console.log('- GOOGLE_SHEETS_PRIVATE_KEY')
        console.log('- GOOGLE_SHEETS_PROJECT_ID')
        console.log('')
        console.log('📋 Vercel Dashboard で環境変数を設定してください')
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
  finalTemplateCreation()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result?.status || 'unknown')

      if (result?.status === 'success') {
        console.log('✅ Google Sheetsテンプレートの作成が完了しました！')
      } else if (result?.status === 'failed') {
        console.log('⚠️ テンプレート作成に失敗しました。環境変数の設定を確認してください。')
      } else {
        console.log('❌ 予期しないエラーが発生しました。')
      }
    })
    .catch(console.error)
}

export { finalTemplateCreation }