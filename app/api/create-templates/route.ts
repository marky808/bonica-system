import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Google Sheetsテンプレート作成開始')

    // 環境変数確認
    const requiredEnvVars = {
      GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID,
      GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_SHEETS_PROJECT_ID: process.env.GOOGLE_SHEETS_PROJECT_ID
    }

    console.log('📋 環境変数確認中...')
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.log(`❌ ${key} が設定されていません`)
      } else {
        console.log(`✅ ${key} 設定済み`)
      }
    }

    if (!requiredEnvVars.GOOGLE_SHEETS_SPREADSHEET_ID) {
      return NextResponse.json({
        error: 'GOOGLE_SHEETS_SPREADSHEET_ID または GOOGLE_SHEET_ID が設定されていません',
        status: 'error'
      }, { status: 400 })
    }

    if (!requiredEnvVars.GOOGLE_SHEETS_CLIENT_EMAIL) {
      return NextResponse.json({
        error: 'GOOGLE_SHEETS_CLIENT_EMAIL または GOOGLE_SERVICE_ACCOUNT_EMAIL が設定されていません',
        status: 'error'
      }, { status: 400 })
    }

    if (!requiredEnvVars.GOOGLE_SHEETS_PRIVATE_KEY) {
      return NextResponse.json({
        error: 'GOOGLE_SHEETS_PRIVATE_KEY または GOOGLE_PRIVATE_KEY が設定されていません',
        status: 'error'
      }, { status: 400 })
    }

    // Google Sheets API認証
    console.log('🔐 Google Sheets API認証中...')
    const auth = new google.auth.JWT(
      requiredEnvVars.GOOGLE_SHEETS_CLIENT_EMAIL,
      undefined,
      requiredEnvVars.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    )

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    const spreadsheetId = requiredEnvVars.GOOGLE_SHEETS_SPREADSHEET_ID

    console.log(`📊 スプレッドシート確認中: ${spreadsheetId}`)

    // スプレッドシートの存在確認
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      })
      console.log(`✅ スプレッドシート確認: ${spreadsheet.data.properties?.title}`)
    } catch (error) {
      console.error('❌ スプレッドシートアクセスエラー:', error)
      return NextResponse.json({
        error: 'スプレッドシートにアクセスできません',
        details: error instanceof Error ? error.message : String(error),
        status: 'error'
      }, { status: 400 })
    }

    // 納品書テンプレート作成
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

    const deliverySheetId = deliverySheetResponse.data.replies![0].addSheet!.properties!.sheetId!

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

    // 請求書テンプレート作成
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

    const invoiceSheetId = invoiceSheetResponse.data.replies![0].addSheet!.properties!.sheetId!

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

    console.log('✅ Google Sheetsテンプレート作成完了')

    return NextResponse.json({
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
    })

  } catch (error) {
    console.error('❌ Google Sheetsテンプレート作成エラー:', error)

    return NextResponse.json({
      status: 'error',
      message: 'テンプレート作成に失敗しました',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}