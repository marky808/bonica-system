import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    console.log('🔍 テンプレート取得開始 - タイプ:', type);

    // データベースからテンプレートを取得
    const dbTemplates = await prisma.googleSheetTemplate.findMany({
      ...(type && { where: { type } })
    });

    console.log('📋 データベースから取得したテンプレート:', dbTemplates);

    if (dbTemplates.length > 0) {
      // データベースにテンプレートがある場合はそれを使用
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const templates = dbTemplates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        templateSheetId: template.templateSheetId,
        spreadsheetId: spreadsheetId,
        url: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${template.templateSheetId}` : undefined,
        source: 'database',
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));

      console.log('✅ データベーステンプレートを返します:', templates);

      return NextResponse.json({
        templates: templates,
        totalFound: templates.length,
        message: 'テンプレートが正常に取得されました',
        source: 'database'
      });
    }

    // データベースにテンプレートがない場合
    console.log('📋 データベースにテンプレートがありません');

    return NextResponse.json({
      templates: [],
      totalFound: 0,
      message: 'テンプレートが見つかりません。テンプレートを作成してください。',
      source: 'database',
      suggestion: 'POST /api/google-sheets/templates with {"createSheets": true} to create templates'
    });

  } catch (error) {
    console.error('❌ Error fetching Google Sheet templates:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, templateSheetId, createSheets } = body;

    console.log('🔧 DEBUG: API request body:', JSON.stringify(body));
    console.log('🔧 DEBUG: createSheets value:', createSheets);
    console.log('🔧 DEBUG: createSheets === true:', createSheets === true);

    // 新機能: 実際のGoogle Sheetsテンプレート作成（優先処理）
    if (createSheets === true) {
      const { google } = require('googleapis');

      // 環境変数確認
      const requiredEnvVars = {
        GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID,
        GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY,
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

      // 既存シートを確認
      const sheetsList = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      const existingSheets = sheetsList.data.sheets?.map(s => s.properties?.title) || [];
      console.log('📋 既存シート:', existingSheets);

      let deliverySheetId: number;

      // 納品書テンプレート作成
      if (existingSheets.includes('納品書テンプレート')) {
        console.log('📋 納品書テンプレートは既に存在します');
        const deliverySheet = sheetsList.data.sheets?.find(s => s.properties?.title === '納品書テンプレート');
        deliverySheetId = deliverySheet?.properties?.sheetId || 0;
      } else {
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

        deliverySheetId = deliverySheetResponse.data.replies![0].addSheet!.properties!.sheetId!;
        console.log(`✅ 納品書テンプレート作成完了 (ID: ${deliverySheetId})`);
      }

      // 納品書テンプレートデータ設定（新規作成時のみ）
      if (!existingSheets.includes('納品書テンプレート')) {
        const deliveryTemplateData = [
          ['', 'BONICA農産物管理システム'],
          ['', '納品書'],
          ['納品書番号:', ''],
          ['納品日:', ''],
          ['お客様:', ''],
          ['住所:', ''],
          [''],
          ['', '', '', '', ''],
          ['', '商品明細', '', '', ''],
          ['商品名', '数量', '単価', '税率', '金額'],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          [''],
          ['', '', '合計', '', ''],
          [''],
          ['備考:', '']
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `納品書テンプレート!A1:E24`,
          valueInputOption: 'RAW',
          requestBody: {
            values: deliveryTemplateData
          }
        });
        console.log('✅ 納品書テンプレートデータ設定完了');
      }

      let invoiceSheetId: number;

      // 請求書テンプレート作成
      if (existingSheets.includes('請求書テンプレート')) {
        console.log('💰 請求書テンプレートは既に存在します');
        const invoiceSheet = sheetsList.data.sheets?.find(s => s.properties?.title === '請求書テンプレート');
        invoiceSheetId = invoiceSheet?.properties?.sheetId || 0;
      } else {
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

        invoiceSheetId = invoiceSheetResponse.data.replies![0].addSheet!.properties!.sheetId!;
        console.log(`✅ 請求書テンプレート作成完了 (ID: ${invoiceSheetId})`);
      }

      // 請求書テンプレートデータ設定（新規作成時のみ）
      if (!existingSheets.includes('請求書テンプレート')) {
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
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `請求書テンプレート!A1:D28`,
          valueInputOption: 'RAW',
          requestBody: {
            values: invoiceTemplateData
          }
        });
        console.log('✅ 請求書テンプレートデータ設定完了');
      }

      console.log('✅ Google Sheetsテンプレート作成完了');

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
      });
    }

    // 既存のテンプレート登録機能
    if (name && type && templateSheetId) {
      if (!['delivery', 'invoice'].includes(type)) {
        return NextResponse.json(
          { error: 'Type must be either "delivery" or "invoice"' },
          { status: 400 }
        );
      }

      // TODO: Re-implement database integration
      const template = { id: 'temp', name, type, templateSheetId };

      return NextResponse.json(template, { status: 201 });
    }


    console.log('🔧 DEBUG: No matching condition found');
    console.log('🔧 DEBUG: name:', name, 'type:', type, 'templateSheetId:', templateSheetId, 'createSheets:', createSheets);

    return NextResponse.json(
      { error: 'Name, type, and templateSheetId are required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in Google Sheet templates API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}