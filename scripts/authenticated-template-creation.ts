#!/usr/bin/env tsx
/**
 * 認証付きでGoogle Sheetsテンプレートを作成
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function createTemplatesWithAuth() {
  console.log('🚀 認証付きGoogle Sheetsテンプレート作成開始')
  console.log('=' * 60)

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
    console.log(`✅ 認証成功: ${user.name}`)

    // 2. 修正されたAPIエンドポイントを呼び出し
    console.log('📊 Google Sheetsテンプレート作成中...')

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
      console.log('✅ テンプレート作成成功!')
      console.log('')
      console.log('📊 作成結果:')
      console.log(JSON.stringify(result, null, 2))

      if (result.templates) {
        console.log('')
        console.log('🔗 テンプレートURL:')
        console.log(`納品書: ${result.templates.delivery?.url}`)
        console.log(`請求書: ${result.templates.invoice?.url}`)
        console.log(`スプレッドシート: ${result.spreadsheetUrl}`)
      }

      return result
    } else {
      const errorText = await createResponse.text()
      console.log('⚠️ API呼び出し失敗')
      console.log(`ステータス: ${createResponse.status}`)
      console.log(`エラー: ${errorText}`)

      // 古いバージョンが動いている場合のメッセージ
      if (errorText.includes('Name, type, and templateSheetId are required')) {
        console.log('')
        console.log('🔄 Vercelデプロイが完了していない可能性があります')
        console.log('💡 対処法:')
        console.log('1. 10-15分待ってから再実行')
        console.log('2. または手動でテンプレート作成')
        console.log(`3. スプレッドシートURL: https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY`)
      }

      return {
        status: 'failed',
        error: errorText,
        statusCode: createResponse.status,
        suggestion: 'Wait for deployment or create templates manually'
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
  createTemplatesWithAuth()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result?.status || 'unknown')

      if (result?.status === 'failed') {
        console.log('🔧 手動作成が必要です')
        console.log('📋 詳細手順: MANUAL_TEMPLATE_CREATION_GUIDE.md を参照')
      }
    })
    .catch(console.error)
}

export { createTemplatesWithAuth }