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

async function checkAPIPermissions() {
  console.log('🔐 Checking Google API permissions and configuration...\n');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_SHEETS_PROJECT_ID;

  console.log('📋 Service Account Configuration:');
  console.log(`   Email: ${clientEmail}`);
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Private Key: ${privateKey ? 'Present ✓' : 'Missing ✗'}`);
  console.log('');

  if (!clientEmail || !privateKey) {
    console.error('❌ Missing credentials');
    return;
  }

  // 異なるスコープでテスト
  const scopesToTest = [
    {
      name: 'Read-only Drive',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    },
    {
      name: 'Full Drive',
      scopes: ['https://www.googleapis.com/auth/drive'],
    },
    {
      name: 'Sheets + Drive.file',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    },
    {
      name: 'Sheets + Full Drive',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    },
  ];

  for (const scopeTest of scopesToTest) {
    console.log(`🧪 Testing: ${scopeTest.name}`);
    console.log(`   Scopes: ${scopeTest.scopes.join(', ')}`);

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: scopeTest.scopes,
      });

      const authClient = await auth.getClient();
      console.log('   ✓ Authentication successful');

      // Try to list files
      const drive = google.drive({ version: 'v3', auth: authClient });
      const filesList = await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
      });

      console.log('   ✓ Can list files');

      // Try to get about info
      try {
        const about = await drive.about.get({ fields: 'user' });
        console.log(`   ✓ User: ${about.data.user?.emailAddress || 'N/A'}`);
      } catch (e) {
        console.log('   ✗ Cannot get user info');
      }

      console.log('   Status: ✅ WORKS');
    } catch (error: any) {
      console.log(`   ✗ Error: ${error.message}`);
      console.log('   Status: ❌ FAILED');
    }
    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('🔍 ROOT CAUSE ANALYSIS');
  console.log('━'.repeat(60));
  console.log('');
  console.log('The "storage quota exceeded" error when storage is empty suggests:');
  console.log('');
  console.log('1️⃣  SERVICE ACCOUNT DOMAIN-WIDE DELEGATION');
  console.log('   The service account might need domain-wide delegation enabled');
  console.log('   in Google Workspace Admin Console.');
  console.log('');
  console.log('2️⃣  API NOT ENABLED IN GOOGLE CLOUD PROJECT');
  console.log('   Check if these APIs are enabled:');
  console.log('   - Google Drive API');
  console.log('   - Google Sheets API');
  console.log('');
  console.log('   Check at:');
  console.log(`   https://console.cloud.google.com/apis/dashboard?project=${projectId}`);
  console.log('');
  console.log('3️⃣  SERVICE ACCOUNT QUOTA SETTINGS');
  console.log('   Google may have special quota rules for service accounts');
  console.log('   that are different from user accounts.');
  console.log('');
  console.log('4️⃣  GOOGLE WORKSPACE VS FREE GMAIL');
  console.log(`   Is ${clientEmail.split('@')[1]} a Google Workspace domain?`);
  console.log('   Service accounts may have limitations on free Gmail accounts.');
  console.log('');
  console.log('💡 IMMEDIATE ACTIONS:');
  console.log('');
  console.log('Action 1: Check enabled APIs');
  console.log(`  https://console.cloud.google.com/apis/dashboard?project=${projectId}`);
  console.log('  Make sure both Drive API and Sheets API are enabled.');
  console.log('');
  console.log('Action 2: Check service account key');
  console.log(`  https://console.cloud.google.com/iam-admin/serviceaccounts?project=${projectId}`);
  console.log('  Verify the service account exists and has the correct permissions.');
  console.log('');
  console.log('Action 3: Try with OAuth 2.0 user credentials instead');
  console.log('  Service accounts have limitations. User OAuth might work better.');
  console.log('');
}

checkAPIPermissions();
