#!/usr/bin/env tsx
import { google } from 'googleapis'
import fs from 'fs'

// 認証設定
const GOOGLE_SHEETS_CREDENTIALS = {
  client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '',
  private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  project_id: process.env.GOOGLE_SHEETS_PROJECT_ID || ''
}

// 既存のスプレッドシートID（BONICA農産物管理データ）
const MAIN_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''

interface TemplateResult {
  name: string
  sheetId: number
  url: string
  templateId: string
}

class GoogleSheetsTemplateCreator {
  private auth: any
  private sheets: any
  private drive: any

  constructor() {
    if (!GOOGLE_SHEETS_CREDENTIALS.client_email || !GOOGLE_SHEETS_CREDENTIALS.private_key) {
      throw new Error('Google Sheets認証情報が設定されていません')
    }

    this.auth = new google.auth.JWT(
      GOOGLE_SHEETS_CREDENTIALS.client_email,
      undefined,
      GOOGLE_SHEETS_CREDENTIALS.private_key,
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    )

    this.sheets = google.sheets({ version: 'v4', auth: this.auth })
    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  async createDeliveryTemplate(): Promise<TemplateResult> {
    console.log('📋 納品書テンプレート作成中...')

    // 新しいシートを追加
    const addSheetResponse = await this.sheets.spreadsheets.batchUpdate({
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

    const sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId

    // テンプレート内容を設定
    const deliveryTemplateData = [
      // ヘッダー部分
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

    // データを挿入
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `納品書テンプレート!A1:D26`,
      valueInputOption: 'RAW',
      requestBody: {
        values: deliveryTemplateData
      }
    })

    // スタイル設定
    await this.formatDeliveryTemplate(MAIN_SPREADSHEET_ID, sheetId)

    // このシートを別のスプレッドシートとしてコピー（テンプレート用）
    const templateFile = await this.drive.files.copy({
      fileId: MAIN_SPREADSHEET_ID,
      requestBody: {
        name: 'BONICA納品書テンプレート'
      }
    })

    const templateId = templateFile.data.id!
    const url = `https://docs.google.com/spreadsheets/d/${templateId}`

    // 不要なシートを削除（納品書テンプレートのみ残す）
    await this.cleanupTemplateSheets(templateId, '納品書テンプレート')

    console.log('✅ 納品書テンプレート作成完了')
    return {
      name: '納品書テンプレート',
      sheetId,
      url,
      templateId
    }
  }

  async createInvoiceTemplate(): Promise<TemplateResult> {
    console.log('💰 請求書テンプレート作成中...')

    // 新しいシートを追加
    const addSheetResponse = await this.sheets.spreadsheets.batchUpdate({
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

    const sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId

    // テンプレート内容を設定
    const invoiceTemplateData = [
      // ヘッダー部分
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

    // データを挿入
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: MAIN_SPREADSHEET_ID,
      range: `請求書テンプレート!A1:D29`,
      valueInputOption: 'RAW',
      requestBody: {
        values: invoiceTemplateData
      }
    })

    // スタイル設定
    await this.formatInvoiceTemplate(MAIN_SPREADSHEET_ID, sheetId)

    // このシートを別のスプレッドシートとしてコピー（テンプレート用）
    const templateFile = await this.drive.files.copy({
      fileId: MAIN_SPREADSHEET_ID,
      requestBody: {
        name: 'BONICA請求書テンプレート'
      }
    })

    const templateId = templateFile.data.id!
    const url = `https://docs.google.com/spreadsheets/d/${templateId}`

    // 不要なシートを削除（請求書テンプレートのみ残す）
    await this.cleanupTemplateSheets(templateId, '請求書テンプレート')

    console.log('✅ 請求書テンプレート作成完了')
    return {
      name: '請求書テンプレート',
      sheetId,
      url,
      templateId
    }
  }

  private async formatDeliveryTemplate(spreadsheetId: string, sheetId: number) {
    const requests = [
      // ヘッダー行のスタイル
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 1,
            endColumnIndex: 2
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 14 },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat'
        }
      },
      // 明細ヘッダーのスタイル
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 9,
            endRowIndex: 10,
            startColumnIndex: 0,
            endColumnIndex: 4
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat'
        }
      },
      // 罫線
      {
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: 9,
            endRowIndex: 22,
            startColumnIndex: 0,
            endColumnIndex: 4
          },
          top: { style: 'SOLID', width: 1 },
          bottom: { style: 'SOLID', width: 1 },
          left: { style: 'SOLID', width: 1 },
          right: { style: 'SOLID', width: 1 },
          innerHorizontal: { style: 'SOLID', width: 1 },
          innerVertical: { style: 'SOLID', width: 1 }
        }
      }
    ]

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    })
  }

  private async formatInvoiceTemplate(spreadsheetId: string, sheetId: number) {
    const requests = [
      // ヘッダー行のスタイル
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 1,
            endColumnIndex: 2
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 14 },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat'
        }
      },
      // 明細ヘッダーのスタイル
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 11,
            endRowIndex: 12,
            startColumnIndex: 0,
            endColumnIndex: 4
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat'
        }
      },
      // 罫線
      {
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: 11,
            endRowIndex: 26,
            startColumnIndex: 0,
            endColumnIndex: 4
          },
          top: { style: 'SOLID', width: 1 },
          bottom: { style: 'SOLID', width: 1 },
          left: { style: 'SOLID', width: 1 },
          right: { style: 'SOLID', width: 1 },
          innerHorizontal: { style: 'SOLID', width: 1 },
          innerVertical: { style: 'SOLID', width: 1 }
        }
      }
    ]

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    })
  }

  private async cleanupTemplateSheets(templateId: string, keepSheetName: string) {
    // スプレッドシートの情報を取得
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: templateId
    })

    const sheets = spreadsheet.data.sheets
    const requests = []

    for (const sheet of sheets) {
      if (sheet.properties.title !== keepSheetName) {
        requests.push({
          deleteSheet: {
            sheetId: sheet.properties.sheetId
          }
        })
      }
    }

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: templateId,
        requestBody: { requests }
      })
    }
  }

  async setPermissions(fileId: string) {
    // サービスアカウントに編集権限を付与
    await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: GOOGLE_SHEETS_CREDENTIALS.client_email
      }
    })

    // 一般アクセス（閲覧のみ）
    await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })
  }
}

async function createTemplates() {
  console.log('🚀 BONICA Google Sheetsテンプレート作成開始')
  console.log('=' * 60)

  if (!MAIN_SPREADSHEET_ID) {
    console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません')
    console.log('📋 設定が必要な環境変数:')
    console.log('   GOOGLE_SHEETS_SPREADSHEET_ID="your-existing-spreadsheet-id"')
    console.log('   GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"')
    console.log('   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
    console.log('   GOOGLE_SHEETS_PROJECT_ID="your-project-id"')
    console.log('')
    console.log('💡 本番環境では設定済みのため、本番環境で実行してください')
    return
  }

  try {
    const creator = new GoogleSheetsTemplateCreator()

    // 納品書テンプレート作成
    const deliveryTemplate = await creator.createDeliveryTemplate()
    await creator.setPermissions(deliveryTemplate.templateId)

    // 請求書テンプレート作成
    const invoiceTemplate = await creator.createInvoiceTemplate()
    await creator.setPermissions(invoiceTemplate.templateId)

    console.log('\n✨ テンプレート作成完了!')
    console.log('=' * 60)

    console.table([
      {
        テンプレート: '納品書',
        テンプレートID: deliveryTemplate.templateId,
        URL: deliveryTemplate.url
      },
      {
        テンプレート: '請求書',
        テンプレートID: invoiceTemplate.templateId,
        URL: invoiceTemplate.url
      }
    ])

    // 環境変数用の設定をファイルに出力
    const envConfig = `
# Google Sheets Template IDs
GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID="${deliveryTemplate.templateId}"
GOOGLE_SHEETS_INVOICE_TEMPLATE_ID="${invoiceTemplate.templateId}"
`

    fs.writeFileSync('google-sheets-template-ids.env', envConfig.trim())
    console.log('\n📄 テンプレートIDを google-sheets-template-ids.env に保存しました')

    console.log('\n🔧 次のステップ:')
    console.log('1. google-sheets-template-ids.env の内容を .env.local に追加')
    console.log('2. 本番環境の環境変数に追加')
    console.log('3. システムでテンプレート機能をテスト')

  } catch (error) {
    console.error('❌ テンプレート作成エラー:', error)
    if (error instanceof Error) {
      console.error('詳細:', error.message)
    }
  }
}

if (require.main === module) {
  createTemplates().catch(console.error)
}

export { createTemplates }