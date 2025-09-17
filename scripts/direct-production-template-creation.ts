#!/usr/bin/env tsx
/**
 * 本番環境の環境変数を使用して直接Google Sheetsテンプレート作成
 */

import { google } from 'googleapis'

// 本番環境の環境変数（実際の値は本番環境から取得）
const PRODUCTION_ENV = {
  GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY',
  GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  GOOGLE_SHEETS_PROJECT_ID: process.env.GOOGLE_SHEETS_PROJECT_ID
}

async function createTemplatesDirectly() {
  console.log('🚀 直接Google Sheetsテンプレート作成実行')
  console.log('='.repeat(50))

  try {
    // 環境変数確認
    console.log('📋 環境変数確認中...')

    if (!PRODUCTION_ENV.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.log('⚠️ GOOGLE_SHEETS_CLIENT_EMAIL が設定されていません')
      console.log('💡 本番環境から環境変数を設定してください')

      // テスト用のダミー実行
      console.log('🧪 テスト実行を開始します...')

      return {
        status: 'test_mode',
        message: '本番環境の認証情報が必要です',
        instruction: 'Vercel Dashboardで環境変数を確認し、このスクリプトに設定してください'
      }
    }

    console.log('✅ 認証情報確認完了')

    // Google Sheets API認証
    console.log('🔐 Google Sheets API認証中...')
    const auth = new google.auth.JWT(
      PRODUCTION_ENV.GOOGLE_SHEETS_CLIENT_EMAIL,
      undefined,
      PRODUCTION_ENV.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    )

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = PRODUCTION_ENV.GOOGLE_SHEETS_SPREADSHEET_ID

    console.log(`📊 スプレッドシート確認中: ${spreadsheetId}`)

    // スプレッドシートの存在確認
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      })
      console.log(`✅ スプレッドシート確認: ${spreadsheet.data.properties?.title}`)
    } catch (error) {
      console.error('❌ スプレッドシートアクセスエラー:', error)
      return {
        status: 'error',
        error: 'スプレッドシートにアクセスできません',
        details: error instanceof Error ? error.message : String(error)
      }
    }

    // 既存のシートを確認
    const sheetsList = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    })

    const existingSheets = sheetsList.data.sheets?.map(s => s.properties?.title) || []
    console.log('📋 既存シート:', existingSheets)

    let deliverySheetId: number
    let invoiceSheetId: number

    // 納品書テンプレート作成
    if (existingSheets.includes('納品書テンプレート')) {
      console.log('📋 納品書テンプレートは既に存在します')
      const deliverySheet = sheetsList.data.sheets?.find(s => s.properties?.title === '納品書テンプレート')
      deliverySheetId = deliverySheet?.properties?.sheetId || 0
    } else {
      console.log('📋 納品書テンプレート作成中...')
      const deliverySheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: '納品書テンプレート',
                gridProperties: {
                  rowCount: 50,
                  columnCount: 10
                }
              }
            }
          }]
        }
      })

      deliverySheetId = deliverySheetResponse.data.replies![0].addSheet!.properties!.sheetId!
      console.log(`✅ 納品書テンプレート作成完了 (ID: ${deliverySheetId})`)
    }

    // 納品書テンプレートデータ設定
    const deliveryTemplateData = [
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
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `納品書テンプレート!A1:D24`,
      valueInputOption: 'RAW',
      requestBody: {
        values: deliveryTemplateData
      }
    })
    console.log('✅ 納品書テンプレートデータ設定完了')

    // 請求書テンプレート作成
    if (existingSheets.includes('請求書テンプレート')) {
      console.log('💰 請求書テンプレートは既に存在します')
      const invoiceSheet = sheetsList.data.sheets?.find(s => s.properties?.title === '請求書テンプレート')
      invoiceSheetId = invoiceSheet?.properties?.sheetId || 0
    } else {
      console.log('💰 請求書テンプレート作成中...')
      const invoiceSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: '請求書テンプレート',
                gridProperties: {
                  rowCount: 50,
                  columnCount: 10
                }
              }
            }
          }]
        }
      })

      invoiceSheetId = invoiceSheetResponse.data.replies![0].addSheet!.properties!.sheetId!
      console.log(`✅ 請求書テンプレート作成完了 (ID: ${invoiceSheetId})`)
    }

    // 請求書テンプレートデータ設定
    const invoiceTemplateData = [
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

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `請求書テンプレート!A1:D28`,
      valueInputOption: 'RAW',
      requestBody: {
        values: invoiceTemplateData
      }
    })
    console.log('✅ 請求書テンプレートデータ設定完了')

    console.log('🎉 Google Sheetsテンプレート作成完了！')

    const result = {
      status: 'success',
      message: 'Google Sheetsテンプレートが正常に作成されました',
      templates: {
        delivery: {
          name: '納品書テンプレート',
          sheetId: deliverySheetId,
          spreadsheetId: spreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${deliverySheetId}`
        },
        invoice: {
          name: '請求書テンプレート',
          sheetId: invoiceSheetId,
          spreadsheetId: spreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${invoiceSheetId}`
        }
      },
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      envConfig: {
        GOOGLE_SHEETS_DELIVERY_SHEET_ID: deliverySheetId,
        GOOGLE_SHEETS_INVOICE_SHEET_ID: invoiceSheetId
      }
    }

    console.log('')
    console.log('📊 作成結果:')
    console.log(JSON.stringify(result, null, 2))

    console.log('')
    console.log('🔗 テンプレートURL:')
    console.log(`納品書: ${result.templates.delivery.url}`)
    console.log(`請求書: ${result.templates.invoice.url}`)
    console.log(`スプレッドシート: ${result.spreadsheetUrl}`)

    console.log('')
    console.log('🔧 環境変数設定:')
    console.log(`GOOGLE_SHEETS_DELIVERY_SHEET_ID=${deliverySheetId}`)
    console.log(`GOOGLE_SHEETS_INVOICE_SHEET_ID=${invoiceSheetId}`)

    return result

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
      console.log('🎯 最終結果:', result?.status || 'unknown')
    })
    .catch(console.error)
}

export { createTemplatesDirectly }