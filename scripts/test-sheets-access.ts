import { google } from 'googleapis';

async function testAccess() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;

  console.log('📋 テスト対象ID:', deliveryTemplateId);
  console.log('📧 サービスアカウント:', clientEmail);

  const auth = new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    console.log('\n🔍 スプレッドシートにアクセス中...');
    const result = await sheets.spreadsheets.get({
      spreadsheetId: deliveryTemplateId
    });
    console.log('\n✅ アクセス成功!');
    console.log('📊 スプレッドシート名:', result.data.properties?.title);
    console.log('📄 シート一覧:');
    result.data.sheets?.forEach(s => {
      console.log(`  - ${s.properties?.title} (ID: ${s.properties?.sheetId})`);
    });
  } catch (error: any) {
    console.error('\n❌ アクセスエラー');
    console.error('エラーメッセージ:', error.message);
    console.error('エラーコード:', error.code);

    if (error.code === 403) {
      console.error('\n💡 対処方法:');
      console.error(`1. Google Sheetsでファイル (${deliveryTemplateId}) を開く`);
      console.error(`2. 「共有」ボタンをクリック`);
      console.error(`3. 「${clientEmail}」を追加して「編集者」権限を付与`);
    } else if (error.code === 404) {
      console.error('\n💡 対処方法:');
      console.error('1. ファイルIDが正しいか確認');
      console.error('2. ファイルが削除されていないか確認');
      console.error('3. 新しいテンプレートを作成する必要があります');
    }
  }
}

testAccess();
