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

    // 3. 既存の /api/google-sheets/templates エンドポイントでシート作成を試行
    console.log('🔧 /api/google-sheets/templates を使用してテンプレート作成中...')

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

    console.log(`📡 テンプレート作成API レスポンス: ${createResponse.status}`)

    if (createResponse.ok) {
      const result = await createResponse.json()
      console.log('✅ テンプレート作成成功!')
      console.log('📊 作成結果:', JSON.stringify(result, null, 2))

      if (result.templates) {
        console.log('')
        console.log('🔗 テンプレートURL:')
        console.log(`納品書: ${result.templates.delivery?.url}`)
        console.log(`請求書: ${result.templates.invoice?.url}`)
      }

      return result
    } else {
      const errorText = await createResponse.text()
      console.log(`❌ テンプレート作成エラー: ${createResponse.status}`)
      console.log(`エラー詳細: ${errorText}`)
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