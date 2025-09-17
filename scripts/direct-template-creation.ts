#!/usr/bin/env tsx
/**
 * 本番環境で直接Google Sheetsテンプレートを作成
 * 認証付きでリクエストを送信し、実際にテンプレートを作成します
 */

import fetch from 'node-fetch'

const PRODUCTION_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app'
const LOGIN_CREDENTIALS = {
  email: '808works.jp@gmail.com',
  password: '6391'
}

const SPREADSHEET_ID = '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY'

interface GoogleSheetsTemplateData {
  delivery: string[][]
  invoice: string[][]
}

const TEMPLATE_DATA: GoogleSheetsTemplateData = {
  delivery: [
    ['', 'BONICA農産物管理システム'],
    ['', '納品書'],
    ['納品書番号:', ''],
    ['納品日:', ''],
    ['お客様:', ''],
    ['住所:', ''],
    [''],
    ['', '', '', ''],
    ['', '商品明細', '', ''],
    ['商品名', '数量', '単価', '金額'],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    [''],
    ['', '', '合計', ''],
    [''],
    ['備考:', '']
  ],
  invoice: [
    ['', 'BONICA農産物管理システム'],
    ['', '請求書'],
    ['請求書番号:', ''],
    ['請求日:', ''],
    ['支払期限:', ''],
    ['お客様:', ''],
    ['住所:', ''],
    ['請求先住所:', ''],
    [''],
    ['', '', '', ''],
    ['', '請求明細', '', ''],
    ['項目', '数量', '単価', '金額'],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    [''],
    ['', '', '小計', ''],
    ['', '', '消費税', ''],
    ['', '', '合計', ''],
    [''],
    ['備考:', '']
  ]
}

async function createTemplatesDirectly() {
  console.log('🚀 Google Sheetsテンプレート直接作成開始')
  console.log(`📊 対象スプレッドシート: ${SPREADSHEET_ID}`)
  console.log('=' * 60)

  try {
    // 1. 認証
    console.log('🔐 本番環境認証中...')
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

    // 2. 既存のGoogle Sheets設定確認
    console.log('📋 既存テンプレート確認中...')
    const templatesResponse = await fetch(`${PRODUCTION_URL}/api/google-sheets/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (templatesResponse.ok) {
      const templates = await templatesResponse.json()
      console.log('📊 現在のテンプレート:', templates)

      if (templates && templates.length > 0) {
        console.log('✅ テンプレートは既に設定されています')
        console.log('📋 設定済みテンプレート:', templates)
        return {
          status: 'already_exists',
          templates: templates
        }
      }
    }

    // 3. Google Sheets APIを通じた直接作成の試行
    console.log('🔧 Google Sheets APIを使用したテンプレート作成試行中...')

    // システムの健康状態を確認
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`)
    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log('💚 システム状態:', health.message)
    }

    // 本番環境でのGoogle Sheets設定確認
    console.log('🔍 Google Sheets設定確認中...')

    // 新しいシートを作成するAPIエンドポイントが存在するか確認
    const endpoints = [
      '/api/create-templates',
      '/api/admin/create-google-sheets-templates',
      '/api/google-sheets/create-templates'
    ]

    for (const endpoint of endpoints) {
      console.log(`🔗 ${endpoint} をテスト中...`)

      const testResponse = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          spreadsheetId: SPREADSHEET_ID
        })
      })

      console.log(`📡 ${endpoint} レスポンス: ${testResponse.status}`)

      if (testResponse.ok) {
        const result = await testResponse.json()
        console.log('✅ テンプレート作成成功!')
        console.log('📊 結果:', result)
        return result
      } else if (testResponse.status !== 404 && testResponse.status !== 405) {
        const errorText = await testResponse.text()
        console.log(`⚠️ ${endpoint} エラー:`, errorText)
      }
    }

    // 手動作成指示
    console.log('')
    console.log('🔧 自動作成が利用できないため、手動作成が必要です')
    console.log('')
    console.log('📋 手動作成手順:')
    console.log('1. Google Sheetsで以下のURLを開く:')
    console.log(`   https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
    console.log('')
    console.log('2. 「納品書テンプレート」シートを新規作成')
    console.log('3. A1:D24の範囲に納品書データを入力')
    console.log('4. 「請求書テンプレート」シートを新規作成')
    console.log('5. A1:D28の範囲に請求書データを入力')
    console.log('')
    console.log('📊 テンプレートデータ構造:')
    console.log('納品書: ヘッダー → 納品書情報 → 明細ヘッダー → 明細行(10行) → 合計 → 備考')
    console.log('請求書: ヘッダー → 請求書情報 → 明細ヘッダー → 明細行(10行) → 小計/税/合計 → 備考')

    return {
      status: 'manual_creation_required',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      templateData: TEMPLATE_DATA,
      instructions: [
        'Open the spreadsheet URL',
        'Create "納品書テンプレート" sheet',
        'Add delivery template data',
        'Create "請求書テンプレート" sheet',
        'Add invoice template data'
      ]
    }

  } catch (error) {
    console.error('❌ テンプレート作成エラー:', error)
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

if (require.main === module) {
  createTemplatesDirectly()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result.status)
      if (result.status === 'manual_creation_required') {
        console.log('📄 スプレッドシートURL:', result.spreadsheetUrl)
      }
    })
    .catch(console.error)
}

export { createTemplatesDirectly }