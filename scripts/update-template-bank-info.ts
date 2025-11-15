/**
 * テンプレートの振込先情報を実際の値に更新するスクリプト
 */

import { google } from 'googleapis';

// OAuth2クライアントの作成
async function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'http://localhost:3000/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * 振込先情報を更新
 */
async function updateBankInfo(spreadsheetId: string, sheetName: string, documentType: '請求書' | '納品書') {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`\n${documentType}テンプレートの振込先情報を更新中...`);
  console.log(`スプレッドシートID: ${spreadsheetId}`);

  // 実際の振込先情報
  const bankInfo = {
    bankName: '朝日信用金庫',
    branchName: '三郷支店',
    accountType: '普通',
    accountNumber: '0430910',
    accountHolder: 'カ)ボニカ・アグリジェント',
  };

  // 振込先情報は62行目から（Phase 1で作成した位置）
  const updates = [
    {
      range: `${sheetName}!A62`,
      values: [['【お振込先】']],
    },
    {
      range: `${sheetName}!A63`,
      values: [[`銀行名: ${bankInfo.bankName}`]],
    },
    {
      range: `${sheetName}!A64`,
      values: [[`支店名: ${bankInfo.branchName}`]],
    },
    {
      range: `${sheetName}!A65`,
      values: [[`口座種別: ${bankInfo.accountType}`]],
    },
    {
      range: `${sheetName}!A66`,
      values: [[`口座番号: ${bankInfo.accountNumber}`]],
    },
    {
      range: `${sheetName}!A67`,
      values: [[`口座名義: ${bankInfo.accountHolder}`]],
    },
  ];

  // 一括更新
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });

  console.log('✅ 振込先情報の更新完了');
  console.log('  - 銀行名:', bankInfo.bankName);
  console.log('  - 支店名:', bankInfo.branchName);
  console.log('  - 口座種別:', bankInfo.accountType);
  console.log('  - 口座番号:', bankInfo.accountNumber);
  console.log('  - 口座名義:', bankInfo.accountHolder);
}

/**
 * メイン処理
 */
async function main() {
  // 請求書テンプレート
  const invoiceTemplateId = '1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E';
  await updateBankInfo(invoiceTemplateId, '請求書テンプレート', '請求書');

  // 納品書テンプレート
  const deliveryTemplateId = '19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4';
  await updateBankInfo(deliveryTemplateId, '納品書テンプレート', '納品書');

  console.log('\n✅ すべてのテンプレートの更新が完了しました');
  console.log('\n確認URL:');
  console.log(`  - 請求書: https://docs.google.com/spreadsheets/d/${invoiceTemplateId}`);
  console.log(`  - 納品書: https://docs.google.com/spreadsheets/d/${deliveryTemplateId}`);
}

// スクリプト実行
main()
  .then(() => {
    console.log('\n✅ 処理が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  });
