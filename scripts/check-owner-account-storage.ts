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

async function checkOwnerAccountStorage() {
  console.log('🔍 Checking template owner account storage...\n');

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
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    // テンプレートファイルの所有者を取得
    const fileInfo = await drive.files.get({
      fileId: deliveryTemplateId,
      fields: 'owners',
    });

    const ownerEmail = fileInfo.data.owners?.[0]?.emailAddress || 'Unknown';

    console.log('📧 Template File Owner:');
    console.log(`   ${ownerEmail}`);
    console.log('');

    console.log('⚠️  IMPORTANT FINDINGS:');
    console.log('');
    console.log('The error "The user\'s Drive storage quota has been exceeded" refers to');
    console.log('the OWNER\'s account, not the service account!');
    console.log('');
    console.log('📊 To check the OWNER\'s storage:');
    console.log('');
    console.log('1. Open a browser and go to: https://drive.google.com');
    console.log(`2. Log in as: ${ownerEmail}`);
    console.log('3. Look at the bottom-left corner for storage usage');
    console.log('4. Check these locations for large files:');
    console.log('   - Google Drive (main folder)');
    console.log('   - Trash / ゴミ箱');
    console.log('   - Shared with me');
    console.log('   - Google Photos');
    console.log('   - Gmail attachments');
    console.log('');
    console.log('5. Storage breakdown:');
    console.log('   Free Gmail accounts: 15 GB total (shared across Drive, Photos, Gmail)');
    console.log('   - If Gmail has many emails with attachments → Drive space is reduced');
    console.log('   - If Google Photos has many photos → Drive space is reduced');
    console.log('   - Deleted files in Trash still count toward quota');
    console.log('');
    console.log('💡 SOLUTION OPTIONS:');
    console.log('');
    console.log('Option 1: Clean up the owner\'s account');
    console.log('  - Empty the Trash in Google Drive');
    console.log('  - Delete old emails with large attachments in Gmail');
    console.log('  - Move Google Photos to "Storage saver" quality (doesn\'t count toward quota)');
    console.log('  - Delete unnecessary Google Drive files');
    console.log('');
    console.log('Option 2: Transfer template ownership to a different account');
    console.log('  - Create a new Google account with fresh 15GB');
    console.log('  - Transfer ownership of the template files to the new account');
    console.log('  - Share the templates with the service account');
    console.log('');
    console.log('Option 3: Use a different copy strategy');
    console.log('  - Instead of copying the template file, create sheets from scratch');
    console.log('  - This would require code changes but avoids the quota issue');
    console.log('');
    console.log('Option 4: Upgrade storage');
    console.log(`  - Purchase Google One for ${ownerEmail}`);
    console.log('  - 100GB plan: ~¥250/month');
    console.log('  - 200GB plan: ~¥380/month');
    console.log('');

    // サービスアカウントで作成されたファイルを確認
    console.log('📁 Files created by service account (should NOT affect owner quota):');
    const serviceAccountFiles = await drive.files.list({
      q: "'me' in owners",
      fields: 'files(id, name, size, createdTime)',
      pageSize: 10,
    });

    const files = serviceAccountFiles.data.files || [];
    console.log(`   Found ${files.length} files owned by service account`);

    if (files.length > 0) {
      console.log('   Recent files:');
      let totalSize = 0;
      files.forEach((file, index) => {
        const sizeKB = parseInt(file.size || '0') / 1024;
        totalSize += parseInt(file.size || '0');
        console.log(`     ${index + 1}. ${file.name} - ${sizeKB.toFixed(2)} KB`);
      });
      console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('');
      console.log('   ℹ️  These files are in the SERVICE ACCOUNT\'s drive,');
      console.log(`      not in ${ownerEmail}'s drive.`);
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkOwnerAccountStorage();
