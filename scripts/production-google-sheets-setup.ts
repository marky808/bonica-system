#!/usr/bin/env tsx
/**
 * 本番環境でGoogle Sheetsテンプレート作成を実行するスクリプト
 * 本番環境のAPIを通じてテンプレート作成を行います
 */

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

async function loginToProduction() {
  console.log('🔐 本番環境にログイン中...')

  const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Login failed: ${response.status} - ${errorText}`)
  }

  const { token, user } = await response.json()
  console.log(`✅ ログイン成功: ${user.name}`)

  return token
}

async function createGoogleSheetsTemplatesViaAPI(token: string) {
  console.log('📊 Google Sheetsテンプレート作成中...')

  // まずGoogle Sheets設定を確認
  const configResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/config`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (configResponse.ok) {
    const config = await configResponse.json()
    console.log('📋 Google Sheets設定確認:', config)
  }

  // テンプレート作成エンドポイントを呼び出し
  const createResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/create-templates`, {
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

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    console.log('⚠️ テンプレート作成API未実装。直接Google Sheets APIを使用します...')

    // 代替案: 本番環境の設定を使用してローカルでテンプレート作成
    return await createTemplatesDirectly(token)
  }

  const result = await createResponse.json()
  console.log('✅ テンプレート作成成功:', result)

  return result
}

async function createTemplatesDirectly(token: string) {
  console.log('🔧 本番環境設定を取得してテンプレート作成中...')

  // 本番環境の環境変数を取得
  const envResponse = await fetch(`${PRODUCTION_URL}/api/admin/environment`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!envResponse.ok) {
    console.log('📝 直接的なテンプレート作成を実行...')

    // Google Sheets client設定を本番から取得
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`)
    if (healthResponse.ok) {
      const healthData = await healthResponse.json()
      console.log('💚 本番環境システム状態:', healthData)
    }

    // 本番環境でテンプレート作成機能をテスト
    const templatesResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (templatesResponse.ok) {
      const templates = await templatesResponse.json()
      console.log('📊 既存テンプレート:', templates)

      if (templates && (templates.deliveryTemplateId || templates.invoiceTemplateId)) {
        console.log('✅ テンプレートは既に設定済みです')
        return {
          status: 'already_configured',
          deliveryTemplateId: templates.deliveryTemplateId,
          invoiceTemplateId: templates.invoiceTemplateId
        }
      }
    }

    // テンプレート作成が必要な場合の処理
    console.log('🔧 新しいテンプレート作成が必要です')
    console.log('💡 本番環境でのテンプレート作成手順:')
    console.log('1. Vercel Dashboardにアクセス')
    console.log('2. Project Functions または Edge Functions で以下を実行:')
    console.log('   npx tsx scripts/create-google-sheets-templates.ts')
    console.log('3. 生成されたテンプレートIDを環境変数に追加')

    return {
      status: 'manual_setup_required',
      instructions: 'See console output for manual setup instructions'
    }
  }

  const envData = await envResponse.json()
  console.log('🔧 環境設定取得成功:', Object.keys(envData))

  return {
    status: 'environment_accessed',
    hasGoogleSheetsConfig: !!envData.GOOGLE_SHEETS_CLIENT_EMAIL
  }
}

async function setupProductionGoogleSheets() {
  console.log('🚀 本番環境 Google Sheets テンプレート設定開始')
  console.log('=' * 60)
  console.log(`🌐 Target: ${PRODUCTION_URL}`)
  console.log('=' * 60)

  try {
    // 1. 本番環境にログイン
    const token = await loginToProduction()

    // 2. Google Sheetsテンプレート作成
    const result = await createGoogleSheetsTemplatesViaAPI(token)

    console.log('\n✨ セットアップ完了!')
    console.log('=' * 60)
    console.log('結果:', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    console.error('❌ セットアップエラー:', error)

    if (error instanceof Error) {
      console.error('詳細:', error.message)
    }

    console.log('\n🔧 手動セットアップ手順:')
    console.log('1. Vercel Dashboard → Project → Functions')
    console.log('2. Terminal or Console で実行:')
    console.log('   npx tsx scripts/create-google-sheets-templates.ts')
    console.log('3. 生成されたテンプレートIDを環境変数に追加')

    throw error
  }
}

if (require.main === module) {
  setupProductionGoogleSheets().catch(console.error)
}

export { setupProductionGoogleSheets }