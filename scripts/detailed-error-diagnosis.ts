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

async function detailedErrorDiagnosis() {
  console.log('🔬 Detailed error diagnosis for delivery template copy...\n');

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

    console.log('✅ Authentication successful');
    console.log(`📋 Service Account: ${clientEmail}`);
    console.log(`📄 Template ID: ${deliveryTemplateId}\n`);

    // テンプレートファイルの詳細情報を取得
    console.log('📊 Fetching template file details...');
    const fileInfo = await drive.files.get({
      fileId: deliveryTemplateId,
      fields: 'id, name, mimeType, owners, permissions, size, capabilities',
    });

    console.log('File Info:');
    console.log(`  Name: ${fileInfo.data.name}`);
    console.log(`  Owner: ${fileInfo.data.owners?.[0]?.emailAddress}`);
    console.log(`  Size: ${fileInfo.data.size} bytes`);
    console.log(`  Can Copy: ${fileInfo.data.capabilities?.canCopy}`);
    console.log('');

    // 権限の詳細を確認
    console.log('📋 Permissions:');
    if (fileInfo.data.permissions) {
      fileInfo.data.permissions.forEach((perm, index) => {
        console.log(`  ${index + 1}. ${perm.role} - ${perm.emailAddress || perm.type}`);
      });
    }
    console.log('');

    // ストレージ情報の詳細取得
    console.log('💾 Storage quota details:');
    const aboutResponse = await drive.about.get({
      fields: '*',
    });

    console.log('Full storage info:');
    console.log(JSON.stringify(aboutResponse.data.storageQuota, null, 2));
    console.log('');

    // 実際にコピーを試みて、詳細なエラーを取得
    console.log('🧪 Attempting to copy the template...');
    try {
      const copyResult = await drive.files.copy({
        fileId: deliveryTemplateId,
        requestBody: {
          name: `TEST_診断_${new Date().toISOString()}`,
        },
      });

      console.log('✅ Copy SUCCESSFUL!');
      console.log(`  New file ID: ${copyResult.data.id}`);
      console.log('');

      // 成功したので削除
      console.log('🗑️  Cleaning up test file...');
      await drive.files.delete({ fileId: copyResult.data.id! });
      console.log('✅ Test file deleted\n');

    } catch (copyError: any) {
      console.error('❌ Copy FAILED');
      console.error('');
      console.error('Error details:');
      console.error(`  Message: ${copyError.message}`);
      console.error(`  Code: ${copyError.code}`);
      console.error(`  Status: ${copyError.status}`);
      console.error('');

      if (copyError.errors) {
        console.error('API Errors:');
        copyError.errors.forEach((err: any, index: number) => {
          console.error(`  ${index + 1}. Domain: ${err.domain}`);
          console.error(`     Reason: ${err.reason}`);
          console.error(`     Message: ${err.message}`);
          console.error(`     Location: ${err.location || 'N/A'}`);
        });
        console.error('');
      }

      console.error('Full error object:');
      console.error(JSON.stringify(copyError, null, 2));
      console.error('');

      // エラーの詳細分析
      console.log('🔍 Error Analysis:');

      if (copyError.message.includes('quota')) {
        console.log('  ⚠️  This is a QUOTA error');
        console.log('  Possible causes:');
        console.log('    1. The OWNER of the template file has exceeded their quota');
        console.log(`       (Owner: ${fileInfo.data.owners?.[0]?.emailAddress})`);
        console.log('    2. The service account quota is exceeded (unlikely if storage shows 0%)');
        console.log('    3. API quota limits have been reached');
      }

      if (copyError.code === 403) {
        console.log('  ⚠️  This is a PERMISSION error (403 Forbidden)');
        console.log('  Possible causes:');
        console.log('    1. Insufficient permissions on the template file');
        console.log('    2. The owner\'s Drive is full (not the service account)');
        console.log('    3. Organizational policies preventing file copies');
      }
    }

    // 所有者のアカウント情報を確認
    const ownerEmail = fileInfo.data.owners?.[0]?.emailAddress;
    console.log('📧 Analysis Result:');
    console.log(`  Template Owner: ${ownerEmail}`);
    console.log(`  Service Account: ${clientEmail}`);
    console.log('');
    console.log('💡 Key Insight:');
    console.log('  When copying a file, the NEW copy is created in the SERVICE ACCOUNT\'s Drive.');
    console.log('  However, the error "quota exceeded" might refer to:');
    console.log(`    - The OWNER's (${ownerEmail}) quota`);
    console.log(`    - Or the SERVICE ACCOUNT's (${clientEmail}) quota`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  }
}

detailedErrorDiagnosis();
