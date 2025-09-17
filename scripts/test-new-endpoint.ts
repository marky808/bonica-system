#!/usr/bin/env tsx
/**
 * 新しいAPIエンドポイント /api/sheets-create をテスト
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function testNewEndpoint() {
  console.log('🎯 新しいAPIエンドポイント /api/sheets-create テスト')
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

    // 2. 新しいエンドポイントでテンプレート作成
    console.log('📊 新しいエンドポイント /api/sheets-create でテンプレート作成中...')

    const createResponse = await fetch(`${PRODUCTION_URL}/api/sheets-create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        createTemplates: true
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

      return result
    } else {
      const errorText = await createResponse.text()
      console.log(`❌ テンプレート作成失敗: ${createResponse.status}`)
      console.log(`エラー詳細: ${errorText}`)

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
  testNewEndpoint()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result?.status || 'unknown')

      if (result?.status === 'success') {
        console.log('✅ Google Sheetsテンプレートの作成が完了しました！')
        console.log('🎊 BONICAシステム仕様に準拠したテンプレートが正常に作成されました。')
      } else if (result?.status === 'failed') {
        console.log('⚠️ テンプレート作成に失敗しました。')
      } else {
        console.log('❌ 予期しないエラーが発生しました。')
      }
    })
    .catch(console.error)
}

export { testNewEndpoint }