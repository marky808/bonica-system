import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Google Sheets認証設定
const GOOGLE_SHEETS_CREDENTIALS = {
  client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '',
  private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  project_id: process.env.GOOGLE_SHEETS_PROJECT_ID || ''
}

const MAIN_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Google Sheetsテンプレート作成開始')

    if (!MAIN_SPREADSHEET_ID) {
      return NextResponse.json({
        error: 'GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません',
        status: 'error'
      }, { status: 400 })
    }

    if (!GOOGLE_SHEETS_CREDENTIALS.client_email || !GOOGLE_SHEETS_CREDENTIALS.private_key) {
      return NextResponse.json({
        error: 'Google Sheets認証情報が設定されていません',
        status: 'error'
      }, { status: 400 })
    }

    // Google Sheets API認証
    const auth = new google.auth.JWT(
      GOOGLE_SHEETS_CREDENTIALS.client_email,
      undefined,
      GOOGLE_SHEETS_CREDENTIALS.private_key,
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    )

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    // 納品書テンプレート作成
    console.log('📋 納品書テンプレート作成中...')

    const addDeliverySheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
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

    const deliverySheetId = addDeliverySheetResponse.data.replies![0].addSheet!.properties!.sheetId!

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
      // 明細行（10行分）
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
      [''],
      [''],
      ['備考:', '']
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `納品書テンプレート!A1:D26`,
      valueInputOption: 'RAW',
      requestBody: {
        values: deliveryTemplateData
      }
    })

    // 請求書テンプレート作成
    console.log('💰 請求書テンプレート作成中...')

    const addInvoiceSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MAIN_SPREADSHEET_ID,
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

    const invoiceSheetId = addInvoiceSheetResponse.data.replies![0].addSheet!.properties!.sheetId!

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
      // 明細行（10行分）
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
      [''],
      ['備考:', '']
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `請求書テンプレート!A1:D29`,
      valueInputOption: 'RAW',
      requestBody: {
        values: invoiceTemplateData
      }
    })

    // 別のスプレッドシートとしてテンプレートをコピー
    const deliveryTemplateFile = await drive.files.copy({
      fileId: MAIN_SPREADSHEET_ID,
      requestBody: {
        name: 'BONICA納品書テンプレート'
      }
    })

    const invoiceTemplateFile = await drive.files.copy({
      fileId: MAIN_SPREADSHEET_ID,
      requestBody: {
        name: 'BONICA請求書テンプレート'
      }
    })

    const deliveryTemplateId = deliveryTemplateFile.data.id!
    const invoiceTemplateId = invoiceTemplateFile.data.id!

    console.log('✅ Google Sheetsテンプレート作成完了')

    return NextResponse.json({
      status: 'success',
      message: 'Google Sheetsテンプレートが正常に作成されました',
      templates: {
        delivery: {
          name: '納品書テンプレート',
          templateId: deliveryTemplateId,
          url: `https://docs.google.com/spreadsheets/d/${deliveryTemplateId}`,
          sheetId: deliverySheetId
        },
        invoice: {
          name: '請求書テンプレート',
          templateId: invoiceTemplateId,
          url: `https://docs.google.com/spreadsheets/d/${invoiceTemplateId}`,
          sheetId: invoiceSheetId
        }
      },
      envConfig: {
        GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID: deliveryTemplateId,
        GOOGLE_SHEETS_INVOICE_TEMPLATE_ID: invoiceTemplateId
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