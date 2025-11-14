/**
 * 納品書・請求書テンプレートを作成するスクリプト
 *
 * 使い方:
 * npx tsx scripts/create-delivery-templates.ts
 */

async function createTemplates() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  console.log('🚀 テンプレート作成を開始します...');
  console.log(`📍 API URL: ${baseUrl}`);

  try {
    const response = await fetch(`${baseUrl}/api/google-sheets/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        createSheets: true
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ テンプレート作成成功！');
      console.log('\n📋 作成されたテンプレート情報:');
      console.log(JSON.stringify(data, null, 2));

      if (data.envConfig) {
        console.log('\n⚙️  以下の環境変数を .env.local に追加してください:');
        console.log(`GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=${data.envConfig.GOOGLE_SHEETS_DELIVERY_SHEET_ID}`);
        console.log(`GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID=${data.envConfig.GOOGLE_SHEETS_INVOICE_SHEET_ID}`);
      }

      if (data.spreadsheetUrl) {
        console.log(`\n🔗 スプレッドシートURL: ${data.spreadsheetUrl}`);
      }
    } else {
      console.error('❌ テンプレート作成失敗:', data);
      console.error('\n💡 以下を確認してください:');
      console.error('  1. 開発サーバーが起動しているか (npm run dev)');
      console.error('  2. 環境変数が正しく設定されているか (.env.local):');
      console.error('     - GOOGLE_SHEETS_SPREADSHEET_ID または GOOGLE_SHEET_ID');
      console.error('     - GOOGLE_SHEETS_CLIENT_EMAIL または GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.error('     - GOOGLE_SHEETS_PRIVATE_KEY または GOOGLE_PRIVATE_KEY');
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    console.error('\n💡 開発サーバーが起動していることを確認してください');
    console.error('   npm run dev');
  }
}

createTemplates();
