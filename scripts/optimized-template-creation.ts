#!/usr/bin/env tsx
/**
 * BONICAシステム仕様に最適化されたGoogle Sheetsテンプレート作成
 *
 * 分析結果に基づいて正しい構造のテンプレートを作成します
 */

import { google } from 'googleapis'

const PRODUCTION_ENV = {
  GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY',
  GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  GOOGLE_SHEETS_PROJECT_ID: process.env.GOOGLE_SHEETS_PROJECT_ID
}

async function createOptimizedTemplates() {
  console.log('🚀 BONICAシステム仕様準拠のテンプレート作成開始')
  console.log('='.repeat(60))

  try {
    // 環境変数確認
    console.log('📋 環境変数確認中...')

    if (!PRODUCTION_ENV.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.log('⚠️ GOOGLE_SHEETS_CLIENT_EMAIL が設定されていません')
      console.log('💡 本番環境から環境変数を設定してください')
      return {
        status: 'test_mode',
        message: '本番環境の認証情報が必要です'
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

    // 既存テンプレートがあれば削除
    const sheetsToDelete = ['納品書テンプレート', '請求書テンプレート']
    for (const sheetName of sheetsToDelete) {
      if (existingSheets.includes(sheetName)) {
        const sheetToDelete = sheetsList.data.sheets?.find(s => s.properties?.title === sheetName)
        if (sheetToDelete?.properties?.sheetId) {
          console.log(`🗑️ 既存の${sheetName}を削除中...`)
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
              requests: [{
                deleteSheet: {
                  sheetId: sheetToDelete.properties.sheetId
                }
              }]
            }
          })
        }
      }
    }

    // 納品書テンプレート作成（BONICAシステム仕様準拠）
    console.log('📋 納品書テンプレート作成中（BONICA仕様準拠）...')
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

    // 納品書テンプレートデータ設定（BONICA仕様準拠）
    const deliveryTemplateData = [
      // 行1-2: ヘッダー
      ['', 'BONICA農産物管理システム', '', '', '', '', '', '', '', ''],
      ['', '納品書', '', '', '', '', '', '', '', ''],
      // 行3-6: 基本情報（B列に値が入る）
      ['納品書番号:', '', '', '', '', '', '', '', '', ''],  // B3
      ['納品日:', '', '', '', '', '', '', '', '', ''],      // B4
      ['お客様:', '', '', '', '', '', '', '', '', ''],      // B5
      ['住所:', '', '', '', '', '', '', '', '', ''],        // B6
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '商品明細', '', '', '', '', '', '', '', ''],
      // 行10: 明細ヘッダー（A10から開始）
      ['商品名', '数量', '単価', '金額', '', '', '', '', '', ''],
      // 行11-20: 明細行（空行）
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      // 行22: 合計行
      ['', '', '合計', '', '', '', '', '', '', ''],  // D22に合計金額
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      // 行25: 備考
      ['備考:', '', '', '', '', '', '', '', '', '']   // A25に備考
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `納品書テンプレート!A1:J25`,
      valueInputOption: 'RAW',
      requestBody: {
        values: deliveryTemplateData
      }
    })

    // 納品書のスタイル設定
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          // ヘッダーのフォーマット
          {
            updateCells: {
              rows: [
                {
                  values: [
                    { userEnteredValue: { stringValue: '' } },
                    {
                      userEnteredValue: { stringValue: 'BONICA農産物管理システム' },
                      userEnteredFormat: {
                        textFormat: { bold: true, fontSize: 16 },
                        horizontalAlignment: 'CENTER'
                      }
                    }
                  ]
                }
              ],
              fields: 'userEnteredValue,userEnteredFormat',
              start: { sheetId: deliverySheetId, rowIndex: 0, columnIndex: 0 }
            }
          },
          // 明細ヘッダーのフォーマット
          {
            updateCells: {
              rows: [
                {
                  values: [
                    {
                      userEnteredValue: { stringValue: '商品名' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '数量' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '単価' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '金額' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    }
                  ]
                }
              ],
              fields: 'userEnteredValue,userEnteredFormat',
              start: { sheetId: deliverySheetId, rowIndex: 9, columnIndex: 0 }
            }
          }
        ]
      }
    })

    console.log(`✅ 納品書テンプレート作成完了 (ID: ${deliverySheetId})`)

    // 請求書テンプレート作成（BONICAシステム仕様準拠）
    console.log('💰 請求書テンプレート作成中（BONICA仕様準拠）...')
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

    // 請求書テンプレートデータ設定（BONICA仕様準拠）
    const invoiceTemplateData = [
      // 行1-2: ヘッダー
      ['', 'BONICA農産物管理システム', '', '', '', '', '', '', '', ''],
      ['', '請求書', '', '', '', '', '', '', '', ''],
      // 行3-8: 基本情報（B列に値が入る）
      ['請求書番号:', '', '', '', '', '', '', '', '', ''],    // B3
      ['請求日:', '', '', '', '', '', '', '', '', ''],        // B4
      ['支払期限:', '', '', '', '', '', '', '', '', ''],      // B5
      ['お客様:', '', '', '', '', '', '', '', '', ''],        // B6
      ['住所:', '', '', '', '', '', '', '', '', ''],          // B7
      ['請求先住所:', '', '', '', '', '', '', '', '', ''],    // B8
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '請求明細', '', '', '', '', '', '', '', ''],
      // 行12: 明細ヘッダー（A12から開始）
      ['項目', '数量', '単価', '金額', '', '', '', '', '', ''],
      // 行13-22: 明細行（空行）
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      // 行25-27: 金額計算
      ['', '', '小計', '', '', '', '', '', '', ''],   // D25に小計
      ['', '', '消費税', '', '', '', '', '', '', ''], // D26に消費税
      ['', '', '合計', '', '', '', '', '', '', ''],   // D27に合計
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      // 行30: 備考
      ['備考:', '', '', '', '', '', '', '', '', '']    // A30に備考
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `請求書テンプレート!A1:J30`,
      valueInputOption: 'RAW',
      requestBody: {
        values: invoiceTemplateData
      }
    })

    // 請求書のスタイル設定
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          // ヘッダーのフォーマット
          {
            updateCells: {
              rows: [
                {
                  values: [
                    { userEnteredValue: { stringValue: '' } },
                    {
                      userEnteredValue: { stringValue: 'BONICA農産物管理システム' },
                      userEnteredFormat: {
                        textFormat: { bold: true, fontSize: 16 },
                        horizontalAlignment: 'CENTER'
                      }
                    }
                  ]
                }
              ],
              fields: 'userEnteredValue,userEnteredFormat',
              start: { sheetId: invoiceSheetId, rowIndex: 0, columnIndex: 0 }
            }
          },
          // 明細ヘッダーのフォーマット
          {
            updateCells: {
              rows: [
                {
                  values: [
                    {
                      userEnteredValue: { stringValue: '項目' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '数量' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '単価' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    },
                    {
                      userEnteredValue: { stringValue: '金額' },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    }
                  ]
                }
              ],
              fields: 'userEnteredValue,userEnteredFormat',
              start: { sheetId: invoiceSheetId, rowIndex: 11, columnIndex: 0 }
            }
          }
        ]
      }
    })

    console.log(`✅ 請求書テンプレート作成完了 (ID: ${invoiceSheetId})`)

    console.log('🎉 BONICA仕様準拠テンプレート作成完了！')

    const result = {
      status: 'success',
      message: 'BONICAシステム仕様に準拠したGoogle Sheetsテンプレートが正常に作成されました',
      specification: {
        delivery: {
          name: '納品書テンプレート',
          sheetId: deliverySheetId,
          dataMapping: {
            delivery_number: 'B3',
            delivery_date: 'B4',
            customer_name: 'B5',
            customer_address: 'B6',
            items_start: 'A11 (row 11)',
            total_amount: 'D22',
            notes: 'A25'
          }
        },
        invoice: {
          name: '請求書テンプレート',
          sheetId: invoiceSheetId,
          dataMapping: {
            invoice_number: 'B3',
            invoice_date: 'B4',
            due_date: 'B5',
            customer_name: 'B6',
            customer_address: 'B7',
            billing_address: 'B8',
            items_start: 'A13 (row 13)',
            subtotal: 'D25',
            tax_amount: 'D26',
            total_amount: 'D27',
            notes: 'A30'
          }
        }
      },
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

    console.log('')
    console.log('📋 BONICA仕様マッピング:')
    console.log('納品書:')
    console.log('  - 納品書番号: B3')
    console.log('  - 納品日: B4')
    console.log('  - 顧客名: B5')
    console.log('  - 住所: B6')
    console.log('  - 明細開始: A11（行11）')
    console.log('  - 合計金額: D22')
    console.log('  - 備考: A25')
    console.log('請求書:')
    console.log('  - 請求書番号: B3')
    console.log('  - 請求日: B4')
    console.log('  - 支払期限: B5')
    console.log('  - 顧客名: B6')
    console.log('  - 住所: B7')
    console.log('  - 請求先住所: B8')
    console.log('  - 明細開始: A13（行13）')
    console.log('  - 小計: D25')
    console.log('  - 消費税: D26')
    console.log('  - 合計: D27')
    console.log('  - 備考: A30')

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
  createOptimizedTemplates()
    .then(result => {
      console.log('')
      console.log('🎯 最終結果:', result?.status || 'unknown')
    })
    .catch(console.error)
}

export { createOptimizedTemplates }