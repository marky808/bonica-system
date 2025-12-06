/**
 * 納品書テンプレートを複製して請求書テンプレートを作成するスクリプト
 *
 * 実行方法:
 * source .env.vercel.production && npx tsx scripts/create-invoice-template.ts
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const DELIVERY_TEMPLATE_ID = '1qb8lAtZB0i_UjT3UaXi4d8AQliU2ZXO-hmiWASMRmOY';

async function createInvoiceTemplate() {
  // OAuth2クライアントの設定
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  console.log('納品書テンプレートを複製しています...');

  // Step 1: 納品書テンプレートを複製
  const copyResponse = await drive.files.copy({
    fileId: DELIVERY_TEMPLATE_ID,
    requestBody: {
      name: '請求書テンプレート（新）',
    },
  });

  const newTemplateId = copyResponse.data.id!;
  console.log(`新しいテンプレートを作成しました: ${newTemplateId}`);

  // Step 2: シート名を変更（納品書テンプレート → 請求書テンプレート）
  // まずシート情報を取得
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: newTemplateId,
  });

  const templateSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === '納品書テンプレート'
  );

  if (templateSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: newTemplateId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: templateSheet.properties?.sheetId,
                title: '請求書テンプレート',
              },
              fields: 'title',
            },
          },
        ],
      },
    });
    console.log('シート名を「請求書テンプレート」に変更しました');
  }

  // Step 3: 「納品書」という文字を「請求書」に置換
  // セルを読み取って置換
  const range = '請求書テンプレート!A1:K60';
  const values = await sheets.spreadsheets.values.get({
    spreadsheetId: newTemplateId,
    range,
  });

  if (values.data.values) {
    const updatedValues = values.data.values.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string') {
          return cell
            .replace(/納品書/g, '請求書')
            .replace(/納品日/g, '請求日')
            .replace(/DEL-/g, 'INV-');
        }
        return cell;
      })
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId: newTemplateId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: updatedValues,
      },
    });
    console.log('「納品書」→「請求書」の文字置換を完了しました');
  }

  console.log('\n=== 完了 ===');
  console.log(`新しい請求書テンプレートID: ${newTemplateId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${newTemplateId}/edit`);
  console.log('\n次のステップ:');
  console.log('1. 上記URLでテンプレートを確認してください');
  console.log('2. 問題なければ、以下のコマンドで環境変数を更新:');
  console.log(`   vercel env rm GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID production -y`);
  console.log(`   printf "${newTemplateId}" | vercel env add GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID production`);
}

createInvoiceTemplate().catch(console.error);
