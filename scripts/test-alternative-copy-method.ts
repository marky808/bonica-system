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

async function testAlternativeCopyMethods() {
  console.log('🧪 Testing alternative copy methods...\n');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;

  if (!clientEmail || !privateKey || !deliveryTemplateId) {
    console.error('❌ Missing credentials');
    return;
  }

  try {
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

    console.log('📋 Method 1: Standard copy (current implementation)');
    console.log('='.repeat(60));
    try {
      const result1 = await drive.files.copy({
        fileId: deliveryTemplateId,
        requestBody: {
          name: `TEST_Method1_${Date.now()}`,
        },
      });
      console.log('✅ SUCCESS with Method 1');
      console.log(`   File ID: ${result1.data.id}`);

      // クリーンアップ
      await drive.files.delete({ fileId: result1.data.id! });
      console.log('   (cleaned up)');
    } catch (error: any) {
      console.error('❌ FAILED with Method 1');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
    }
    console.log('');

    console.log('📋 Method 2: Copy with supportsAllDrives parameter');
    console.log('='.repeat(60));
    try {
      const result2 = await drive.files.copy({
        fileId: deliveryTemplateId,
        supportsAllDrives: true,
        requestBody: {
          name: `TEST_Method2_${Date.now()}`,
        },
      });
      console.log('✅ SUCCESS with Method 2');
      console.log(`   File ID: ${result2.data.id}`);

      // クリーンアップ
      await drive.files.delete({ fileId: result2.data.id! });
      console.log('   (cleaned up)');
    } catch (error: any) {
      console.error('❌ FAILED with Method 2');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
    }
    console.log('');

    console.log('📋 Method 3: Read template and create new spreadsheet');
    console.log('='.repeat(60));
    try {
      // テンプレートの内容を読み取る
      const templateData = await sheets.spreadsheets.get({
        spreadsheetId: deliveryTemplateId,
        includeGridData: false,
      });

      console.log('   ✓ Template read successfully');
      console.log(`   Title: ${templateData.data.properties?.title}`);
      console.log(`   Sheets: ${templateData.data.sheets?.length}`);

      // 新しいスプレッドシートを作成
      const newSpreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `TEST_Method3_${Date.now()}`,
          },
        },
      });

      console.log('✅ SUCCESS with Method 3');
      console.log(`   File ID: ${newSpreadsheet.data.spreadsheetId}`);
      console.log(`   URL: ${newSpreadsheet.data.spreadsheetUrl}`);

      // クリーンアップ
      await drive.files.delete({ fileId: newSpreadsheet.data.spreadsheetId! });
      console.log('   (cleaned up)');
    } catch (error: any) {
      console.error('❌ FAILED with Method 3');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
    }
    console.log('');

    console.log('📋 Method 4: Copy to specific folder (my Drive)');
    console.log('='.repeat(60));
    try {
      const result4 = await drive.files.copy({
        fileId: deliveryTemplateId,
        requestBody: {
          name: `TEST_Method4_${Date.now()}`,
          parents: [], // Empty means "My Drive"
        },
      });
      console.log('✅ SUCCESS with Method 4');
      console.log(`   File ID: ${result4.data.id}`);

      // クリーンアップ
      await drive.files.delete({ fileId: result4.data.id! });
      console.log('   (cleaned up)');
    } catch (error: any) {
      console.error('❌ FAILED with Method 4');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
    }
    console.log('');

    console.log('━'.repeat(60));
    console.log('📊 ANALYSIS');
    console.log('━'.repeat(60));
    console.log('');
    console.log('If ALL methods fail with the same quota error:');
    console.log('  → This is likely a Google API or account configuration issue');
    console.log('  → Not related to actual storage usage');
    console.log('');
    console.log('If Method 3 (create new) succeeds:');
    console.log('  → We can work around the issue by creating sheets from scratch');
    console.log('  → This requires code changes but avoids the copy operation');
    console.log('');
    console.log('Possible root causes:');
    console.log('  1. Google Workspace organization policy');
    console.log('  2. API quota limits (different from storage quota)');
    console.log('  3. Service account restrictions');
    console.log('  4. Template file special attributes/restrictions');
    console.log('');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  }
}

testAlternativeCopyMethods();
