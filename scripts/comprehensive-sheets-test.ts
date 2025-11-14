import { google } from 'googleapis';
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

async function comprehensiveSheetsTest() {
  console.log('🧪 Starting comprehensive Google Sheets integration test...\n');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
  const invoiceTemplateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

  console.log('✅ Step 1: Verify environment variables');
  console.log(`  Client Email: ${clientEmail ? '✅' : '❌'}`);
  console.log(`  Private Key: ${privateKey ? '✅' : '❌'}`);
  console.log(`  Delivery Template: ${deliveryTemplateId || '❌'}`);
  console.log(`  Invoice Template: ${invoiceTemplateId || '❌'}`);
  console.log('');

  if (!clientEmail || !privateKey || !deliveryTemplateId || !invoiceTemplateId) {
    console.error('❌ Missing required environment variables');
    return;
  }

  try {
    // Google認証を設定
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    console.log('✅ Step 2: Authentication successful\n');

    // ステップ3: 納品書テンプレートのテスト
    console.log('✅ Step 3: Test delivery template');
    try {
      const deliveryFile = await drive.files.get({
        fileId: deliveryTemplateId,
        fields: 'id, name, mimeType, owners',
      });

      console.log(`  ✅ Template found: ${deliveryFile.data.name}`);
      console.log(`  Owner: ${deliveryFile.data.owners?.[0]?.emailAddress}`);

      // コピーのテスト
      console.log('  Testing file copy...');
      const testCopy = await drive.files.copy({
        fileId: deliveryTemplateId,
        requestBody: {
          name: `TEST_納品書_${new Date().toISOString()}`,
        },
      });

      console.log(`  ✅ Copy successful! ID: ${testCopy.data.id}`);

      // コピーを削除
      await drive.files.delete({ fileId: testCopy.data.id! });
      console.log(`  ✅ Test copy cleaned up`);

    } catch (error: any) {
      console.error(`  ❌ Delivery template test failed:`, error.message);
      if (error.message.includes('storage quota')) {
        console.error(`  → STORAGE QUOTA EXCEEDED: Service account Drive is full`);
        console.error(`  → Solution: Follow GOOGLE_SHEETS_SETUP_GUIDE.md`);
      }
    }
    console.log('');

    // ステップ4: 請求書テンプレートのテスト
    console.log('✅ Step 4: Test invoice template');
    try {
      const invoiceFile = await drive.files.get({
        fileId: invoiceTemplateId,
        fields: 'id, name, mimeType, owners',
      });

      console.log(`  ✅ Template found: ${invoiceFile.data.name}`);
      console.log(`  Owner: ${invoiceFile.data.owners?.[0]?.emailAddress}`);

      // コピーのテスト
      console.log('  Testing file copy...');
      const testCopy = await drive.files.copy({
        fileId: invoiceTemplateId,
        requestBody: {
          name: `TEST_請求書_${new Date().toISOString()}`,
        },
      });

      console.log(`  ✅ Copy successful! ID: ${testCopy.data.id}`);

      // コピーを削除
      await drive.files.delete({ fileId: testCopy.data.id! });
      console.log(`  ✅ Test copy cleaned up`);

    } catch (error: any) {
      console.error(`  ❌ Invoice template test failed:`, error.message);
      if (error.code === 404) {
        console.error(`  → FILE NOT FOUND: Template not shared with service account`);
        console.error(`  → Solution: Share with ${clientEmail}`);
      } else if (error.message.includes('storage quota')) {
        console.error(`  → STORAGE QUOTA EXCEEDED: Service account Drive is full`);
        console.error(`  → Solution: Follow GOOGLE_SHEETS_SETUP_GUIDE.md`);
      }
    }
    console.log('');

    // ステップ5: ストレージ使用状況の確認
    console.log('✅ Step 5: Check storage usage');
    try {
      const aboutResponse = await drive.about.get({
        fields: 'storageQuota',
      });

      if (aboutResponse.data.storageQuota) {
        const quota = aboutResponse.data.storageQuota;
        const used = parseInt(quota.usage || '0');
        const limit = parseInt(quota.limit || '0');
        const usedGB = (used / 1024 / 1024 / 1024).toFixed(2);
        const limitGB = (limit / 1024 / 1024 / 1024).toFixed(2);
        const percentage = limit > 0 ? ((used / limit) * 100).toFixed(1) : 'N/A';

        console.log(`  Used: ${usedGB} GB / ${limitGB} GB (${percentage}%)`);

        if (parseFloat(percentage) > 90) {
          console.log(`  ⚠️  WARNING: Storage is almost full!`);
        } else if (parseFloat(percentage) > 70) {
          console.log(`  ⚠️  WARNING: Storage usage is high`);
        } else {
          console.log(`  ✅ Storage usage is healthy`);
        }
      }
    } catch (error: any) {
      console.error(`  ❌ Could not check storage:`, error.message);
    }
    console.log('');

    // ステップ6: サービスアカウントが所有するファイル数
    console.log('✅ Step 6: Count files owned by service account');
    try {
      const filesResponse = await drive.files.list({
        q: "'me' in owners",
        fields: 'files(id, name, createdTime)',
        pageSize: 10,
      });

      const files = filesResponse.data.files || [];
      console.log(`  Files owned by service account: ${files.length}`);

      if (files.length > 0) {
        console.log(`  Recent files:`);
        files.slice(0, 5).forEach((file, index) => {
          console.log(`    ${index + 1}. ${file.name} (${file.createdTime})`);
        });
      }
    } catch (error: any) {
      console.error(`  ❌ Could not list files:`, error.message);
    }
    console.log('');

    // 最終結果
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('If all tests passed:');
    console.log('  ✅ Your Google Sheets integration is properly configured');
    console.log('  ✅ You can create delivery and invoice sheets');
    console.log('');
    console.log('If any tests failed:');
    console.log('  📖 Check GOOGLE_SHEETS_SETUP_GUIDE.md for solutions');
    console.log('  🔧 Follow the step-by-step instructions');
    console.log('');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error('Full error:', error);
  }
}

comprehensiveSheetsTest();
