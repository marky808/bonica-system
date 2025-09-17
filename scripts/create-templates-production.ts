#!/usr/bin/env tsx
/**
 * 本番環境でGoogle Sheetsテンプレートを作成するスクリプト
 * 本番環境の認証情報を使用してテンプレートを作成します
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function createTemplatesInProduction() {
  console.log('🚀 本番環境でGoogle Sheetsテンプレート作成開始')
  console.log('=' * 60)

  try {
    // 1. 本番環境にログイン
    console.log('🔐 本番環境にログイン中...')
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

    // 2. 管理者APIを通じてテンプレート作成を実行
    console.log('📊 Google Sheetsテンプレート作成中...')

    const createResponse = await fetch(`${PRODUCTION_URL}/api/admin/create-google-sheets-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.log('⚠️ 管理者API経由が失敗。代替手法を試行中...')
      console.log('エラー詳細:', errorText)

      // 代替案: 本番環境の設定情報を取得してローカルで実行
      console.log('🔧 本番環境の設定を使用して直接作成...')

      // Google Sheets APIテスト
      const googleSheetsTestResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (googleSheetsTestResponse.ok) {
        const templates = await googleSheetsTestResponse.json()
        console.log('📊 現在のテンプレート状況:', templates)

        if (templates && (templates.deliveryTemplateId || templates.invoiceTemplateId)) {
          console.log('✅ テンプレートは既に設定済みです')
          return {
            status: 'already_configured',
            templates
          }
        }
      }

      // 手動作成指示
      console.log('📝 手動でのテンプレート作成が必要です')
      console.log('')
      console.log('🔧 手動実行手順:')
      console.log('1. ローカル環境で以下を実行:')
      console.log('   GOOGLE_SHEETS_SPREADSHEET_ID="your-id" npx tsx scripts/create-google-sheets-templates.ts')
      console.log('2. 本番環境変数に以下を追加:')
      console.log('   GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID')
      console.log('   GOOGLE_SHEETS_INVOICE_TEMPLATE_ID')

      return {
        status: 'manual_setup_required',
        message: 'Manual template creation required'
      }
    }

    const result = await createResponse.json()
    console.log('✅ テンプレート作成成功!')
    console.log('')
    console.log('📊 作成されたテンプレート:')
    console.table([
      {
        テンプレート: '納品書',
        ID: result.templates.delivery.templateId,
        URL: result.templates.delivery.url
      },
      {
        テンプレート: '請求書',
        ID: result.templates.invoice.templateId,
        URL: result.templates.invoice.url
      }
    ])

    console.log('')
    console.log('🔧 環境変数設定:')
    console.log(`GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID="${result.envConfig.GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID}"`)
    console.log(`GOOGLE_SHEETS_INVOICE_TEMPLATE_ID="${result.envConfig.GOOGLE_SHEETS_INVOICE_TEMPLATE_ID}"`)

    return result

  } catch (error) {
    console.error('❌ テンプレート作成エラー:', error)

    if (error instanceof Error) {
      console.error('詳細:', error.message)
    }

    console.log('')
    console.log('🔧 代替手順:')
    console.log('1. Vercel Dashboard → Environment Variables')
    console.log('2. 以下の変数が設定されているか確認:')
    console.log('   - GOOGLE_SHEETS_CLIENT_EMAIL')
    console.log('   - GOOGLE_SHEETS_PRIVATE_KEY')
    console.log('   - GOOGLE_SHEETS_PROJECT_ID')
    console.log('   - GOOGLE_SHEETS_SPREADSHEET_ID')
    console.log('3. ローカル環境で scripts/create-google-sheets-templates.ts を実行')

    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

if (require.main === module) {
  createTemplatesInProduction().catch(console.error)
}

export { createTemplatesInProduction }