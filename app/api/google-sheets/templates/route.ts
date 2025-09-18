import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 環境変数からシートIDを取得
    const deliverySheetId = process.env.GOOGLE_SHEETS_DELIVERY_SHEET_ID;
    const invoiceSheetId = process.env.GOOGLE_SHEETS_INVOICE_SHEET_ID;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    console.log('🔍 Template environment variables:', {
      deliverySheetId,
      invoiceSheetId,
      spreadsheetId,
      hasSpreadsheetId: !!spreadsheetId
    });

    // テンプレート情報を構築
    const templates = [];

    // 環境変数が設定されていない場合、Google Sheetsから直接取得を試行
    if (!deliverySheetId && !invoiceSheetId && spreadsheetId) {
      console.log('🔍 Environment variables not set, attempting to fetch sheet IDs from Google Sheets');

      try {
        const { google } = require('googleapis');
        
        // 認証設定の詳細検証
        const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!clientEmail || !privateKey) {
          throw new Error('Google Sheets authentication credentials are missing');
        }

        console.log('🔧 Setting up Google Sheets authentication...');
        const auth = new google.auth.JWT(
          clientEmail,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log('📊 Fetching spreadsheet metadata...');
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: spreadsheetId
        });

        const availableSheets = spreadsheet.data.sheets?.map(sheet => ({
          id: sheet.properties?.sheetId,
          title: sheet.properties?.title,
          index: sheet.properties?.index
        })) || [];

        console.log('📋 Available sheets:', availableSheets);

        // テンプレートシートを探す（より厳密で柔軟なマッチング）
        const deliverySheet = availableSheets.find(s => {
          const title = s.title?.toLowerCase() || '';
          // 複数のパターンでマッチング
          return (
            title.includes('納品書テンプレート') ||
            title.includes('納品書_テンプレート') ||
            title.includes('納品書 テンプレート') ||
            title.includes('deliverytemplate') ||
            (title.includes('納品書') && title.includes('テンプレート')) ||
            (title.includes('納品') && title.includes('テンプレート')) ||
            title === '納品書テンプレート' ||
            title === 'template_delivery' ||
            title === 'delivery_template'
          );
        });

        const invoiceSheet = availableSheets.find(s => {
          const title = s.title?.toLowerCase() || '';
          return (
            title.includes('請求書テンプレート') ||
            title.includes('請求書_テンプレート') ||
            title.includes('請求書 テンプレート') ||
            title.includes('invoicetemplate') ||
            (title.includes('請求書') && title.includes('テンプレート')) ||
            (title.includes('請求') && title.includes('テンプレート')) ||
            title === '請求書テンプレート' ||
            title === 'template_invoice' ||
            title === 'invoice_template'
          );
        });

        console.log('🔍 Template sheet search results:', {
          deliveryFound: !!deliverySheet,
          deliveryTitle: deliverySheet?.title,
          deliveryId: deliverySheet?.id,
          invoiceFound: !!invoiceSheet,
          invoiceTitle: invoiceSheet?.title,
          invoiceId: invoiceSheet?.id
        });

        // 見つかったテンプレートの検証
        if (deliverySheet) {
          const templateId = deliverySheet.id?.toString();
          if (templateId && !isNaN(Number(templateId))) {
            templates.push({
              id: 'delivery-template',
              name: '納品書テンプレート',
              type: 'delivery',
              templateSheetId: templateId,
              spreadsheetId: spreadsheetId,
              url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${templateId}`,
              sheetTitle: deliverySheet.title
            });
            console.log('✅ Delivery template added:', templateId);
          } else {
            console.warn('⚠️ Invalid delivery template ID:', deliverySheet.id);
          }
        }

        if (invoiceSheet) {
          const templateId = invoiceSheet.id?.toString();
          if (templateId && !isNaN(Number(templateId))) {
            templates.push({
              id: 'invoice-template',
              name: '請求書テンプレート',
              type: 'invoice',
              templateSheetId: templateId,
              spreadsheetId: spreadsheetId,
              url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${templateId}`,
              sheetTitle: invoiceSheet.title
            });
            console.log('✅ Invoice template added:', templateId);
          } else {
            console.warn('⚠️ Invalid invoice template ID:', invoiceSheet.id);
          }
        }

        // テンプレートが見つからない場合の詳細情報
        if (templates.length === 0) {
          console.warn('⚠️ No templates found. Available sheet titles:', 
            availableSheets.map(s => s.title)
          );
          
          return NextResponse.json({
            templates: [],
            message: 'テンプレートシートが見つかりませんでした',
            availableSheets: availableSheets.map(s => ({ 
              title: s.title, 
              id: s.id 
            })),
            suggestions: [
              'シート名に「納品書テンプレート」または「請求書テンプレート」を含めてください',
              '環境変数 GOOGLE_SHEETS_DELIVERY_SHEET_ID, GOOGLE_SHEETS_INVOICE_SHEET_ID を設定することも可能です'
            ]
          });
        }

        console.log('✅ Templates found via auto-discovery:', templates);

      } catch (error) {
        console.error('❌ Failed to fetch sheets from Google Sheets:', error);
        
        // より詳細なエラー情報を提供
        let errorMessage = 'テンプレート取得に失敗しました';
        let suggestions = [];
        
        if (error instanceof Error) {
          if (error.message.includes('credentials') || error.message.includes('authentication')) {
            errorMessage = 'Google Sheets認証に失敗しました';
            suggestions = [
              'GOOGLE_SHEETS_CLIENT_EMAIL環境変数を確認してください',
              'GOOGLE_SHEETS_PRIVATE_KEY環境変数を確認してください',
              'サービスアカウントの設定を確認してください'
            ];
          } else if (error.message.includes('403') || error.message.includes('permission')) {
            errorMessage = 'スプレッドシートへのアクセス権限がありません';
            suggestions = [
              'スプレッドシートをサービスアカウントと共有してください',
              'スプレッドシートIDが正しいことを確認してください'
            ];
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = 'スプレッドシートが見つかりません';
            suggestions = [
              'GOOGLE_SHEETS_SPREADSHEET_ID環境変数を確認してください',
              'スプレッドシートが削除されていないか確認してください'
            ];
          }
        }

        return NextResponse.json({
          error: errorMessage,
          details: error instanceof Error ? error.message : String(error),
          suggestions: suggestions,
          fallbackMessage: '手動でテンプレートIDを環境変数に設定することをお勧めします'
        }, { status: 500 });
      }
    } else {
      // 環境変数が設定されている場合の従来の処理
      console.log('✅ Using environment variables for template configuration');
      
      if (deliverySheetId && spreadsheetId) {
        // IDの妥当性チェック
        if (!isNaN(Number(deliverySheetId))) {
          templates.push({
            id: 'delivery-template',
            name: '納品書テンプレート',
            type: 'delivery',
            templateSheetId: deliverySheetId,
            spreadsheetId: spreadsheetId,
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${deliverySheetId}`,
            source: 'environment'
          });
          console.log('✅ Delivery template from env vars:', deliverySheetId);
        } else {
          console.warn('⚠️ Invalid delivery sheet ID in env vars:', deliverySheetId);
        }
      }

      if (invoiceSheetId && spreadsheetId) {
        // IDの妥当性チェック
        if (!isNaN(Number(invoiceSheetId))) {
          templates.push({
            id: 'invoice-template',
            name: '請求書テンプレート',
            type: 'invoice',
            templateSheetId: invoiceSheetId,
            spreadsheetId: spreadsheetId,
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${invoiceSheetId}`,
            source: 'environment'
          });
          console.log('✅ Invoice template from env vars:', invoiceSheetId);
        } else {
          console.warn('⚠️ Invalid invoice sheet ID in env vars:', invoiceSheetId);
        }
      }
    }

    // タイプでフィルタリング
    const filteredTemplates = type ? templates.filter(t => t.type === type) : templates;

    console.log('📊 Final template list:', {
      total: templates.length,
      filtered: filteredTemplates.length,
      filterType: type
    });

    return NextResponse.json({
      templates: filteredTemplates,
      totalFound: templates.length,
      message: filteredTemplates.length > 0 ? 
        'テンプレートが正常に取得されました' : 
        'テンプレートが見つかりませんでした'
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
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `納品書テンプレート!A1:D24`,
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