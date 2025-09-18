#!/usr/bin/env tsx

/**
 * 本番環境での納品書作成エラーをデバッグするスクリプト
 * 実際のAPIコールを模擬して問題を特定します
 */

const BASE_URL = 'https://bonica-system2025.vercel.app'

async function debugProductionError() {
  console.log('🔍 本番環境エラーデバッグ開始')
  console.log(`🌐 対象URL: ${BASE_URL}`)
  console.log('')

  try {
    // 1. Google Sheetsテンプレート確認
    console.log('📊 Google Sheetsテンプレート状況確認...')
    const templatesResponse = await fetch(`${BASE_URL}/api/google-sheets/templates`)
    const templates = await templatesResponse.json()

    console.log('テンプレート取得結果:', JSON.stringify(templates, null, 2))

    if (!Array.isArray(templates) || templates.length === 0) {
      console.error('❌ テンプレートが見つかりません')
      return
    }

    const deliveryTemplate = templates.find(t => t.type === 'delivery')
    if (!deliveryTemplate) {
      console.error('❌ 納品書テンプレートが見つかりません')
      return
    }

    console.log(`✅ 納品書テンプレート確認: ID=${deliveryTemplate.templateSheetId}`)
    console.log('')

    // 2. 存在しないdeliveryIDでテスト（エラーハンドリング確認）
    console.log('🧪 エラーハンドリングテスト（存在しないdeliveryID）...')
    const errorTestResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryId: 'test-nonexistent-id',
        templateId: deliveryTemplate.templateSheetId
      })
    })

    const errorResult = await errorTestResponse.json()
    console.log('ステータス:', errorTestResponse.status)
    console.log('レスポンス:', JSON.stringify(errorResult, null, 2))
    console.log('')

    // 3. テンプレートIDの妥当性チェック
    console.log('🔍 テンプレートID妥当性チェック...')
    console.log(`テンプレートID: "${deliveryTemplate.templateSheetId}"`)
    console.log(`型: ${typeof deliveryTemplate.templateSheetId}`)
    console.log(`数値変換: ${parseInt(deliveryTemplate.templateSheetId)}`)
    console.log(`正規表現チェック: ${/^\d+$/.test(deliveryTemplate.templateSheetId)}`)
    console.log('')

    // 4. 無効なテンプレートIDでテスト
    console.log('🧪 無効テンプレートIDテスト...')
    const invalidTemplateResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryId: 'test-id',
        templateId: 'invalid-template-id'
      })
    })

    const invalidResult = await invalidTemplateResponse.json()
    console.log('無効テンプレートID - ステータス:', invalidTemplateResponse.status)
    console.log('無効テンプレートID - レスポンス:', JSON.stringify(invalidResult, null, 2))
    console.log('')

    // 5. Google Sheetsへの直接アクセステスト
    console.log('🔗 Google Sheetsへの直接アクセステスト...')
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${deliveryTemplate.spreadsheetId}/edit#gid=${deliveryTemplate.templateSheetId}`
    console.log(`Sheet URL: ${sheetUrl}`)

    try {
      const sheetResponse = await fetch(sheetUrl, { method: 'HEAD' })
      console.log(`Google Sheets アクセス結果: ${sheetResponse.status}`)
    } catch (sheetError) {
      console.log('Google Sheets アクセス エラー:', sheetError instanceof Error ? sheetError.message : String(sheetError))
    }
    console.log('')

    // 6. 推奨されるテスト手順
    console.log('📋 次のステップ:')
    console.log('1. 実際の納品データのIDを取得してください')
    console.log('2. そのIDでAPIを呼び出してください:')
    console.log(`   curl -X POST "${BASE_URL}/api/google-sheets/create-delivery" \\`)
    console.log('     -H "Content-Type: application/json" \\')
    console.log(`     -d '{"deliveryId":"[実際のID]","templateId":"${deliveryTemplate.templateSheetId}"}'`)
    console.log('3. レスポンスの詳細を確認してください')
    console.log('')

    console.log('🔍 デバッグ情報収集完了')

  } catch (error) {
    console.error('❌ デバッグ中にエラー:', error)
    console.error('エラー詳細:', error instanceof Error ? error.message : String(error))
  }
}

debugProductionError()