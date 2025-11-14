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

async function diagnoseSheetIssue() {
  console.log('🔍 Starting Google Sheets diagnosis...\n');

  // 環境変数の確認
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
  const invoiceTemplateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

  console.log('📋 Environment Variables Check:');
  console.log(`  - Client Email: ${clientEmail ? '✅ Set' : '❌ Not set'}`);
  console.log(`  - Private Key: ${privateKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`  - Delivery Template ID: ${deliveryTemplateId || '❌ Not set'}`);
  console.log(`  - Invoice Template ID: ${invoiceTemplateId || '❌ Not set'}`);
  console.log('');

  if (!clientEmail || !privateKey) {
    console.error('❌ Missing required Google Sheets credentials');
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

    console.log('✅ Authentication successful\n');

    // 納品書テンプレートを確認
    if (deliveryTemplateId) {
      console.log('📄 Checking Delivery Template...');
      console.log(`  ID: ${deliveryTemplateId}`);

      try {
        // ファイル情報を取得
        const fileInfo = await drive.files.get({
          fileId: deliveryTemplateId,
          fields: 'id, name, mimeType, permissions',
        });

        console.log(`  ✅ File found: ${fileInfo.data.name}`);
        console.log(`  Type: ${fileInfo.data.mimeType}`);

        // スプレッドシートの場合、シート一覧を取得
        if (fileInfo.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
          const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: deliveryTemplateId,
          });

          console.log(`  Sheets in this spreadsheet:`);
          spreadsheet.data.sheets?.forEach((sheet, index) => {
            console.log(`    ${index + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
          });
        }

        // ファイルのコピーをテスト
        console.log('  Testing file copy...');
        const testCopy = await drive.files.copy({
          fileId: deliveryTemplateId,
          requestBody: {
            name: `TEST_納品書_診断_${new Date().toISOString()}`,
          },
        });

        console.log(`  ✅ Copy successful! New file ID: ${testCopy.data.id}`);

        // テストコピーを削除
        await drive.files.delete({
          fileId: testCopy.data.id!,
        });
        console.log(`  🗑️  Test copy deleted`);

      } catch (error: any) {
        console.error(`  ❌ Error accessing delivery template:`, error.message);
        if (error.code === 404) {
          console.error(`  The file with ID ${deliveryTemplateId} does not exist or is not accessible`);
        } else if (error.code === 403) {
          console.error(`  Permission denied. Make sure the service account has access to this file`);
          console.error(`  Service account email: ${clientEmail}`);
        }
      }
      console.log('');
    }

    // 請求書テンプレートを確認
    if (invoiceTemplateId) {
      console.log('📄 Checking Invoice Template...');
      console.log(`  ID: ${invoiceTemplateId}`);

      try {
        const fileInfo = await drive.files.get({
          fileId: invoiceTemplateId,
          fields: 'id, name, mimeType, permissions',
        });

        console.log(`  ✅ File found: ${fileInfo.data.name}`);
        console.log(`  Type: ${fileInfo.data.mimeType}`);

        if (fileInfo.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
          const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: invoiceTemplateId,
          });

          console.log(`  Sheets in this spreadsheet:`);
          spreadsheet.data.sheets?.forEach((sheet, index) => {
            console.log(`    ${index + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
          });
        }

        // ファイルのコピーをテスト
        console.log('  Testing file copy...');
        const testCopy = await drive.files.copy({
          fileId: invoiceTemplateId,
          requestBody: {
            name: `TEST_請求書_診断_${new Date().toISOString()}`,
          },
        });

        console.log(`  ✅ Copy successful! New file ID: ${testCopy.data.id}`);

        // テストコピーを削除
        await drive.files.delete({
          fileId: testCopy.data.id!,
        });
        console.log(`  🗑️  Test copy deleted`);

      } catch (error: any) {
        console.error(`  ❌ Error accessing invoice template:`, error.message);
        if (error.code === 404) {
          console.error(`  The file with ID ${invoiceTemplateId} does not exist or is not accessible`);
        } else if (error.code === 403) {
          console.error(`  Permission denied. Make sure the service account has access to this file`);
          console.error(`  Service account email: ${clientEmail}`);
        }
      }
      console.log('');
    }

    console.log('✅ Diagnosis complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. If you see 403 errors, share the spreadsheets with the service account');
    console.log(`     Service account: ${clientEmail}`);
    console.log('  2. Give the service account "Editor" permissions on both templates');
    console.log('  3. Make sure the template IDs in .env.local are correct FILE IDs, not sheet IDs');

  } catch (error: any) {
    console.error('❌ Fatal error during diagnosis:', error.message);
    console.error('Full error:', error);
  }
}

diagnoseSheetIssue();
