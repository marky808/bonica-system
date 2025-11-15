/**
 * テンプレートの会社情報を実際の値に更新するスクリプト
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
 * 会社情報を更新
 */
async function updateCompanyInfo(spreadsheetId: string, sheetName: string, documentType: '請求書' | '納品書') {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`\n${documentType}テンプレートの会社情報を更新中...`);
  console.log(`スプレッドシートID: ${spreadsheetId}`);

  // 実際の会社情報
  const companyInfo = {
    taxNumber: 'T9030001039654',
    companyName: '株式会社　ボニカ・アグリジェント',
    postalCode: '〒341-0035',
    address: '埼玉県三郷市鷹野4-441',
    tel: '048-954-6891',
    fax: '048-954-6892',
  };

  // 更新するデータ
  const updates = [
    {
      range: `${sheetName}!A2`,
      values: [[companyInfo.companyName]],
    },
    {
      range: `${sheetName}!A3`,
      values: [[`法人番号: ${companyInfo.taxNumber}`]],
    },
    {
      range: `${sheetName}!A4`,
      values: [[`${companyInfo.postalCode} ${companyInfo.address}`]],
    },
    {
      range: `${sheetName}!A5`,
      values: [[`TEL: ${companyInfo.tel}  FAX: ${companyInfo.fax}`]],
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

  console.log('✅ 会社情報の更新完了');
  console.log('  - 会社名:', companyInfo.companyName);
  console.log('  - 法人番号:', companyInfo.taxNumber);
  console.log('  - 住所:', `${companyInfo.postalCode} ${companyInfo.address}`);
  console.log('  - TEL:', companyInfo.tel);
  console.log('  - FAX:', companyInfo.fax);
}

/**
 * メイン処理
 */
async function main() {
  // 請求書テンプレート
  const invoiceTemplateId = '1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E';
  await updateCompanyInfo(invoiceTemplateId, '請求書テンプレート', '請求書');

  // 納品書テンプレート
  const deliveryTemplateId = '19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4';
  await updateCompanyInfo(deliveryTemplateId, '納品書テンプレート', '納品書');

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
