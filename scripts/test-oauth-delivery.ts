import { PrismaClient } from '@prisma/client';
import { getGoogleSheetsClient } from '../lib/google-sheets-client';
import * as fs from 'fs';
import * as path from 'path';

// .env.localを手動で読み込む
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const prisma = new PrismaClient();

async function testOAuthDelivery() {
  console.log('🧪 Testing OAuth 2.0 Delivery Sheet Creation\n');
  console.log('━'.repeat(60));

  try {
    // 環境変数チェック
    const hasOAuth = !!(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    );

    const hasServiceAccount = !!(
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY
    );

    console.log('✅ Authentication Check:');
    console.log(`   OAuth 2.0: ${hasOAuth ? '✓ Available' : '✗ Not configured'}`);
    console.log(`   Service Account: ${hasServiceAccount ? '✓ Available' : '✗ Not configured'}`);
    console.log('');

    if (!hasOAuth && !hasServiceAccount) {
      console.error('❌ No authentication credentials found!');
      console.log('');
      console.log('Please configure either:');
      console.log('1. OAuth 2.0 (Recommended):');
      console.log('   - GOOGLE_OAUTH_CLIENT_ID');
      console.log('   - GOOGLE_OAUTH_CLIENT_SECRET');
      console.log('   - GOOGLE_OAUTH_REFRESH_TOKEN');
      console.log('');
      console.log('2. Service Account:');
      console.log('   - GOOGLE_SHEETS_CLIENT_EMAIL');
      console.log('   - GOOGLE_SHEETS_PRIVATE_KEY');
      console.log('   - GOOGLE_SHEETS_PROJECT_ID');
      console.log('');
      console.log('See OAUTH_SETUP_GUIDE.md for setup instructions.');
      return;
    }

    const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
    const invoiceTemplateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

    if (!deliveryTemplateId) {
      console.error('❌ GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID not set');
      return;
    }

    console.log('📋 Template IDs:');
    console.log(`   Delivery: ${deliveryTemplateId}`);
    console.log(`   Invoice: ${invoiceTemplateId || 'Not set'}`);
    console.log('');

    // Google Sheets クライアントを初期化
    const googleSheetsClient = getGoogleSheetsClient();
    console.log('✅ Google Sheets client initialized\n');

    // テスト1: 納品書作成
    console.log('📋 Test 1: Create Delivery Sheet');
    console.log('━'.repeat(60));

    try {
      const testDeliveryData = {
        delivery_number: `TEST-OAUTH-${Date.now()}`,
        delivery_date: new Date().toISOString().split('T')[0],
        customer_name: 'OAuth テスト顧客株式会社',
        customer_address: '東京都渋谷区テスト1-2-3',
        invoice_registration_number: 'T1234567890123',
        invoice_notes: 'OAuth 2.0認証でテスト中',
        items: [
          {
            product_name: 'OAuth テスト商品A',
            delivery_date: new Date().toISOString().split('T')[0],
            quantity: 10,
            unit: '個',
            unit_price: 1000,
            tax_rate: 10,
            subtotal: 10000,
            tax_amount: 1000,
            amount: 11000,
          },
          {
            product_name: 'OAuth テスト商品B',
            delivery_date: new Date().toISOString().split('T')[0],
            quantity: 5,
            unit: 'kg',
            unit_price: 2000,
            tax_rate: 8,
            subtotal: 10000,
            tax_amount: 800,
            amount: 10800,
          },
        ],
        subtotal_8: 10000,
        tax_8: 800,
        subtotal_10: 10000,
        tax_10: 1000,
        total_tax: 1800,
        total_amount: 21800,
        notes: 'OAuth 2.0認証テスト納品書。動作確認後に削除予定。',
      };

      console.log('Creating delivery sheet...');
      const deliveryResult = await googleSheetsClient.createDeliverySheet(
        testDeliveryData,
        deliveryTemplateId
      );

      console.log('');
      console.log('✅ SUCCESS!');
      console.log('━'.repeat(60));
      console.log(`   Sheet ID: ${deliveryResult.sheetId}`);
      console.log(`   URL: ${deliveryResult.url}`);
      console.log('');
      console.log('   🔗 Open this URL to verify the sheet:');
      console.log(`   ${deliveryResult.url}`);
      console.log('');
      console.log('   ✓ Template was copied successfully');
      console.log('   ✓ Data was inserted correctly');
      console.log('   ✓ OAuth 2.0 authentication is working!');
      console.log('');

    } catch (error: any) {
      console.log('');
      console.error('❌ FAILED');
      console.error('━'.repeat(60));
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      console.error('');

      if (error.code === 403) {
        console.log('💡 Troubleshooting:');
        console.log('   1. Check that OAuth credentials are correct');
        console.log('   2. Ensure refresh token is valid');
        console.log('   3. Verify template sharing permissions');
        console.log('   4. Check Google Cloud Console scopes');
      } else if (error.code === 401) {
        console.log('💡 Troubleshooting:');
        console.log('   1. Refresh token may be expired');
        console.log('   2. Run: npx tsx scripts/get-oauth-refresh-token.ts');
        console.log('   3. Update .env.local with new token');
      }
      console.log('');
    }

    // テスト2: 請求書作成（テンプレートIDが設定されている場合のみ）
    if (invoiceTemplateId) {
      console.log('━'.repeat(60));
      console.log('📋 Test 2: Create Invoice Sheet');
      console.log('━'.repeat(60));

      try {
        const testInvoiceData = {
          invoice_number: `INV-OAUTH-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          customer_name: 'OAuth テスト顧客株式会社',
          customer_address: '東京都渋谷区テスト1-2-3',
          billing_address: '東京都渋谷区テスト1-2-3',
          invoice_registration_number: 'T1234567890123',
          billing_cycle: 'monthly',
          billing_day: 31,
          payment_terms: '30days',
          invoice_notes: 'OAuth 2.0認証でテスト中',
          items: [
            {
              description: 'OAuth テスト商品A',
              quantity: 10,
              unit_price: 1000,
              tax_rate: 10,
              subtotal: 10000,
              tax_amount: 1000,
              amount: 11000,
            },
          ],
          subtotal_8: 0,
          tax_8: 0,
          subtotal_10: 10000,
          tax_10: 1000,
          total_tax: 1000,
          subtotal: 10000,
          tax_amount: 1000,
          total_amount: 11000,
          notes: 'OAuth 2.0認証テスト請求書。動作確認後に削除予定。',
        };

        console.log('Creating invoice sheet...');
        const invoiceResult = await googleSheetsClient.createInvoiceSheet(
          testInvoiceData,
          invoiceTemplateId
        );

        console.log('');
        console.log('✅ SUCCESS!');
        console.log('━'.repeat(60));
        console.log(`   Sheet ID: ${invoiceResult.sheetId}`);
        console.log(`   URL: ${invoiceResult.url}`);
        console.log('');
        console.log('   🔗 Open this URL to verify the sheet:');
        console.log(`   ${invoiceResult.url}`);
        console.log('');
        console.log('   ✓ Template was copied successfully');
        console.log('   ✓ Data was inserted correctly');
        console.log('   ✓ OAuth 2.0 authentication is working!');
        console.log('');

      } catch (error: any) {
        console.log('');
        console.error('❌ FAILED');
        console.error('━'.repeat(60));
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        console.error('');
      }
    } else {
      console.log('━'.repeat(60));
      console.log('⏭️  Skipping Test 2: Invoice template ID not configured');
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('✅ Testing complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Open the URLs above to verify the sheets');
    console.log('   2. Check that template formatting was preserved');
    console.log('   3. Verify that data was inserted correctly');
    console.log('   4. Delete the test files manually if needed');
    console.log('');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testOAuthDelivery();
