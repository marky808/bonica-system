/**
 * Google Sheetsテンプレートの存在確認スクリプト
 */

import { google } from 'googleapis';

async function verifyTemplate() {
  console.log('🔍 テンプレートの存在確認を開始...\n');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
  const invoiceTemplateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

  console.log('📋 環境変数:');
  console.log(`  - GOOGLE_SHEETS_CLIENT_EMAIL: ${clientEmail ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  - GOOGLE_SHEETS_PRIVATE_KEY: ${privateKey ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  - GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID: ${deliveryTemplateId || '❌ 未設定'}`);
  console.log(`  - GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID: ${invoiceTemplateId || '❌ 未設定'}\n`);

  if (!clientEmail || !privateKey) {
    console.error('❌ Google Sheets認証情報が設定されていません');
    return;
  }

  try {
    // 認証
    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // 納品書テンプレート確認
    if (deliveryTemplateId) {
      console.log(`\n📋 納品書テンプレート確認 (ID: ${deliveryTemplateId})`);
      try {
        const fileInfo = await drive.files.get({
          fileId: deliveryTemplateId,
          fields: 'id, name, mimeType, createdTime, modifiedTime, owners, permissions'
        });

        console.log('✅ ファイルが見つかりました:');
        console.log(`  - 名前: ${fileInfo.data.name}`);
        console.log(`  - タイプ: ${fileInfo.data.mimeType}`);
        console.log(`  - 作成日: ${fileInfo.data.createdTime}`);
        console.log(`  - 更新日: ${fileInfo.data.modifiedTime}`);

        if (fileInfo.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
          // スプレッドシートの詳細を取得
          try {
            const spreadsheet = await sheets.spreadsheets.get({
              spreadsheetId: deliveryTemplateId
            });
            console.log(`  - シート数: ${spreadsheet.data.sheets?.length || 0}`);
            console.log('  - シート一覧:');
            spreadsheet.data.sheets?.forEach((sheet) => {
              console.log(`    • ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
            });
          } catch (sheetsError) {
            console.log('  ⚠️ シート情報の取得に失敗しました');
          }
        }

        // アクセス権限確認
        try {
          const permissions = await drive.permissions.list({
            fileId: deliveryTemplateId,
            fields: 'permissions(id, type, role, emailAddress)'
          });

          console.log('  - アクセス権限:');
          permissions.data.permissions?.forEach((perm) => {
            console.log(`    • ${perm.type}: ${perm.role} ${perm.emailAddress ? `(${perm.emailAddress})` : ''}`);
          });
        } catch (permError) {
          console.log('  ⚠️ 権限情報の取得に失敗しました（権限が不足している可能性があります）');
        }

      } catch (error: any) {
        console.error('❌ ファイルが見つかりません:');
        console.error(`  - エラーコード: ${error.code}`);
        console.error(`  - エラーメッセージ: ${error.message}`);

        if (error.code === 404) {
          console.error('\n💡 対処方法:');
          console.error('  1. テンプレートファイルが削除されていないか確認');
          console.error('  2. ファイルIDが正しいか確認');
          console.error('  3. 新しいテンプレートを作成する必要があります');
        } else if (error.code === 403) {
          console.error('\n💡 対処方法:');
          console.error('  1. サービスアカウントにファイルへのアクセス権限を付与');
          console.error(`  2. Google Sheetsでファイルを開き、「${clientEmail}」に編集権限を付与`);
        }
      }
    }

    // 請求書テンプレート確認
    if (invoiceTemplateId && invoiceTemplateId !== deliveryTemplateId) {
      console.log(`\n💰 請求書テンプレート確認 (ID: ${invoiceTemplateId})`);
      try {
        const fileInfo = await drive.files.get({
          fileId: invoiceTemplateId,
          fields: 'id, name, mimeType, createdTime, modifiedTime'
        });

        console.log('✅ ファイルが見つかりました:');
        console.log(`  - 名前: ${fileInfo.data.name}`);
        console.log(`  - タイプ: ${fileInfo.data.mimeType}`);
        console.log(`  - 作成日: ${fileInfo.data.createdTime}`);
        console.log(`  - 更新日: ${fileInfo.data.modifiedTime}`);

        if (fileInfo.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
          const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: invoiceTemplateId
          });
          console.log(`  - シート数: ${spreadsheet.data.sheets?.length || 0}`);
        }
      } catch (error: any) {
        console.error('❌ ファイルが見つかりません:');
        console.error(`  - エラーコード: ${error.code}`);
        console.error(`  - エラーメッセージ: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

verifyTemplate();
