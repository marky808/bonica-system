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

async function cleanupServiceAccountDrive() {
  console.log('🧹 Starting service account Drive cleanup...\n');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error('❌ Missing Google Sheets credentials');
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
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    console.log('✅ Authentication successful\n');

    // サービスアカウントが所有するファイル一覧を取得
    console.log('📋 Fetching files owned by service account...');

    const response = await drive.files.list({
      q: "'me' in owners",
      fields: 'files(id, name, mimeType, createdTime, size, webViewLink)',
      pageSize: 1000,
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} files\n`);

    if (files.length === 0) {
      console.log('✅ No files to clean up');
      return;
    }

    // テストファイルと古いファイルを識別
    const testFiles = files.filter(f => f.name?.includes('TEST_') || f.name?.includes('診断'));
    const oldFiles = files.filter(f => {
      if (!f.createdTime) return false;
      const createdDate = new Date(f.createdTime);
      const daysOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysOld > 30; // 30日以上前のファイル
    });

    console.log('📊 File analysis:');
    console.log(`  - Total files: ${files.length}`);
    console.log(`  - Test files: ${testFiles.length}`);
    console.log(`  - Files older than 30 days: ${oldFiles.length}\n`);

    // テストファイルをリスト
    if (testFiles.length > 0) {
      console.log('🧪 Test files found:');
      testFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.createdTime})`);
      });
      console.log('');
    }

    // 削除確認
    const filesToDelete = [...testFiles, ...oldFiles.filter(f => !testFiles.includes(f))];

    if (filesToDelete.length === 0) {
      console.log('✅ No files to delete');
      return;
    }

    console.log(`⚠️  About to delete ${filesToDelete.length} files`);
    console.log('');

    // 実際に削除を実行（慎重に）
    let deletedCount = 0;
    for (const file of filesToDelete) {
      try {
        await drive.files.delete({
          fileId: file.id!,
        });
        console.log(`  ✅ Deleted: ${file.name}`);
        deletedCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to delete ${file.name}:`, error.message);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} files`);

    // ストレージ使用状況を確認
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

      console.log('\n📊 Storage usage:');
      console.log(`  Used: ${usedGB} GB`);
      console.log(`  Limit: ${limitGB} GB`);
      console.log(`  Percentage: ${percentage}%`);
    }

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('Full error:', error);
  }
}

cleanupServiceAccountDrive();
