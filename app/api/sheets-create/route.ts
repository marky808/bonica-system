import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 新しいGoogle Sheetsテンプレート作成エンドポイント開始');

    const body = await request.json();
    console.log('📦 リクエストボディ:', body);

    // 環境変数確認
    const requiredEnvVars = {
      GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      GOOGLE_SHEETS_PROJECT_ID: process.env.GOOGLE_SHEETS_PROJECT_ID,
    };

    console.log('📋 環境変数確認中...');
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.log(`❌ ${key} が設定されていません`);
        return NextResponse.json({
          error: `${key} が設定されていません`,
          status: 'error'
        }, { status: 400 });
      } else {
        console.log(`✅ ${key} 設定済み`);
      }
    }

    // Google Sheets API認証
    console.log('🔐 Google Sheets API認証中...');
    const auth = new google.auth.JWT(
      requiredEnvVars.GOOGLE_SHEETS_CLIENT_EMAIL,
      undefined,
      requiredEnvVars.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = requiredEnvVars.GOOGLE_SHEETS_SPREADSHEET_ID;

    console.log(`📊 スプレッドシート確認中: ${spreadsheetId}`);

    // スプレッドシートの存在確認
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      console.log(`✅ スプレッドシート確認: ${spreadsheet.data.properties?.title}`);
    } catch (error) {
      console.error('❌ スプレッドシートアクセスエラー:', error);
      return NextResponse.json({
        error: 'スプレッドシートにアクセスできません',
        details: error instanceof Error ? error.message : String(error),
        status: 'error'
      }, { status: 400 });
    }

    // 既存のシートを確認
    const sheetsList = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const existingSheets = sheetsList.data.sheets?.map(s => s.properties?.title) || [];
    console.log('📋 既存シート:', existingSheets);

    // 既存テンプレートがあれば削除
    const sheetsToDelete = ['納品書テンプレート', '請求書テンプレート'];
    for (const sheetName of sheetsToDelete) {
      if (existingSheets.includes(sheetName)) {
        const sheetToDelete = sheetsList.data.sheets?.find(s => s.properties?.title === sheetName);
        if (sheetToDelete?.properties?.sheetId) {
          console.log(`🗑️ 既存の${sheetName}を削除中...`);
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
              requests: [{
                deleteSheet: {
                  sheetId: sheetToDelete.properties.sheetId
                }
              }]
            }
          });
        }
      }
    }

    // 納品書テンプレート作成
    console.log('📋 納品書テンプレート作成中...');
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
    });

    const deliverySheetId = deliverySheetResponse.data.replies![0].addSheet!.properties!.sheetId!;

    // 納品書テンプレートデータ設定（BONICA仕様準拠）
    const deliveryTemplateData = [
      ['', 'BONICA農産物管理システム', '', '', '', '', '', '', '', ''],
      ['', '納品書', '', '', '', '', '', '', '', ''],
      ['納品書番号:', '', '', '', '', '', '', '', '', ''],
      ['納品日:', '', '', '', '', '', '', '', '', ''],
      ['お客様:', '', '', '', '', '', '', '', '', ''],
      ['住所:', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '商品明細', '', '', '', '', '', '', '', ''],
      ['商品名', '数量', '単価', '金額', '', '', '', '', '', ''],
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
      ['', '', '合計', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['備考:', '', '', '', '', '', '', '', '', '']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `納品書テンプレート!A1:J25`,
      valueInputOption: 'RAW',
      requestBody: {
        values: deliveryTemplateData
      }
    });

    console.log(`✅ 納品書テンプレート作成完了 (ID: ${deliverySheetId})`);

    // 請求書テンプレート作成
    console.log('💰 請求書テンプレート作成中...');
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
    });

    const invoiceSheetId = invoiceSheetResponse.data.replies![0].addSheet!.properties!.sheetId!;

    // 請求書テンプレートデータ設定（BONICA仕様準拠）
    const invoiceTemplateData = [
      ['', 'BONICA農産物管理システム', '', '', '', '', '', '', '', ''],
      ['', '請求書', '', '', '', '', '', '', '', ''],
      ['請求書番号:', '', '', '', '', '', '', '', '', ''],
      ['請求日:', '', '', '', '', '', '', '', '', ''],
      ['支払期限:', '', '', '', '', '', '', '', '', ''],
      ['お客様:', '', '', '', '', '', '', '', '', ''],
      ['住所:', '', '', '', '', '', '', '', '', ''],
      ['請求先住所:', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '請求明細', '', '', '', '', '', '', '', ''],
      ['項目', '数量', '単価', '金額', '', '', '', '', '', ''],
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
      ['', '', '小計', '', '', '', '', '', '', ''],
      ['', '', '消費税', '', '', '', '', '', '', ''],
      ['', '', '合計', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['備考:', '', '', '', '', '', '', '', '', '']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `請求書テンプレート!A1:J30`,
      valueInputOption: 'RAW',
      requestBody: {
        values: invoiceTemplateData
      }
    });

    console.log(`✅ 請求書テンプレート作成完了 (ID: ${invoiceSheetId})`);
    console.log('🎉 BONICA仕様準拠テンプレート作成完了！');

    const result = {
      status: 'success',
      message: 'BONICAシステム仕様に準拠したGoogle Sheetsテンプレートが正常に作成されました',
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
      specification: {
        delivery: {
          basic_info: 'B3-B6',
          items_start: 'A11 (row 11)',
          total_amount: 'D22',
          notes: 'A25'
        },
        invoice: {
          basic_info: 'B3-B8',
          items_start: 'A13 (row 13)',
          subtotal: 'D25',
          tax_amount: 'D26',
          total_amount: 'D27',
          notes: 'A30'
        }
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ テンプレート作成エラー:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}