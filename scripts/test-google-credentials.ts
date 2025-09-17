#!/usr/bin/env tsx

/**
 * Google Sheets API認証情報テストスクリプト
 * 実際の認証情報を使用してGoogle Sheetsへのアクセスをテスト
 */

import { google } from 'googleapis';

// 環境変数から認証情報を取得
const GOOGLE_SHEETS_CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
const GOOGLE_SHEETS_PROJECT_ID = process.env.GOOGLE_SHEETS_PROJECT_ID;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY';

async function testGoogleSheetsAccess() {
  console.log('🔧 Google Sheets API認証テスト開始');
  console.log('=' * 50);

  // 環境変数チェック
  console.log('📋 環境変数確認:');
  console.log(`CLIENT_EMAIL: ${GOOGLE_SHEETS_CLIENT_EMAIL ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`PRIVATE_KEY: ${GOOGLE_SHEETS_PRIVATE_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`PROJECT_ID: ${GOOGLE_SHEETS_PROJECT_ID ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`SPREADSHEET_ID: ${GOOGLE_SHEETS_SPREADSHEET_ID ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log('');

  if (!GOOGLE_SHEETS_CLIENT_EMAIL || !GOOGLE_SHEETS_PRIVATE_KEY) {
    console.log('❌ 必要な環境変数が設定されていません');
    console.log('');
    console.log('📝 設定方法:');
    console.log('1. Google Cloud Console でサービスアカウントを作成');
    console.log('2. JSONキーをダウンロード');
    console.log('3. 以下の環境変数を設定:');
    console.log('   GOOGLE_SHEETS_CLIENT_EMAIL="サービスアカウントのメール"');
    console.log('   GOOGLE_SHEETS_PRIVATE_KEY="プライベートキー"');
    console.log('   GOOGLE_SHEETS_PROJECT_ID="プロジェクトID"');
    return;
  }

  try {
    // 認証設定
    console.log('🔐 Google Sheets API認証中...');
    const auth = new google.auth.JWT(
      GOOGLE_SHEETS_CLIENT_EMAIL,
      undefined,
      GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // スプレッドシート存在確認
    console.log('📊 スプレッドシート存在確認中...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID
    });

    console.log(`✅ 成功: スプレッドシート「${spreadsheet.data.properties?.title}」にアクセス可能`);
    console.log('');

    // 既存シート一覧表示
    console.log('📋 既存シート一覧:');
    spreadsheet.data.sheets?.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
    });
    console.log('');

    // テンプレートシートの存在確認
    const deliverySheet = spreadsheet.data.sheets?.find(sheet =>
      sheet.properties?.title === '納品書テンプレート'
    );
    const invoiceSheet = spreadsheet.data.sheets?.find(sheet =>
      sheet.properties?.title === '請求書テンプレート'
    );

    console.log('🔍 テンプレートシート確認:');
    console.log(`納品書テンプレート: ${deliverySheet ? '✅ 存在' : '❌ 未作成'}`);
    console.log(`請求書テンプレート: ${invoiceSheet ? '✅ 存在' : '❌ 未作成'}`);
    console.log('');

    console.log('✅ Google Sheets API認証テスト完了');
    console.log('🚀 テンプレート自動作成の準備が整いました');

    return {
      success: true,
      spreadsheetTitle: spreadsheet.data.properties?.title,
      hasDeliveryTemplate: !!deliverySheet,
      hasInvoiceTemplate: !!invoiceSheet,
      sheetsCount: spreadsheet.data.sheets?.length || 0
    };

  } catch (error) {
    console.log('❌ エラー:', error instanceof Error ? error.message : String(error));
    console.log('');
    console.log('🔧 対処法:');
    console.log('1. サービスアカウントがスプレッドシートに共有されているか確認');
    console.log('2. 編集者権限が付与されているか確認');
    console.log('3. Google Sheets APIが有効になっているか確認');
    console.log('4. 環境変数の値が正しいか確認');

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// スクリプト実行
if (require.main === module) {
  testGoogleSheetsAccess()
    .then(result => {
      if (result.success) {
        console.log('');
        console.log('🎯 次のステップ: テンプレート自動作成実行');
        console.log('npx tsx scripts/authenticated-template-creation.ts');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('致命的エラー:', error);
      process.exit(1);
    });
}

export { testGoogleSheetsAccess };