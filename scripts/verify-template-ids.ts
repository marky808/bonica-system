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

async function verifyTemplateIds() {
  console.log('🔍 Verifying template IDs from URLs...\n');

  const deliverySheetUrl = 'https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY/edit?gid=1125769553#gid=1125769553';
  const invoiceSheetUrl = 'https://docs.google.com/spreadsheets/d/1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ/edit?gid=0#gid=0';

  // URLからファイルIDとシートIDを抽出
  const extractIds = (url: string) => {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetIdMatch = url.match(/gid=(\d+)/);
    return {
      fileId: fileIdMatch ? fileIdMatch[1] : null,
      sheetId: sheetIdMatch ? sheetIdMatch[1] : null,
    };
  };

  const deliveryIds = extractIds(deliverySheetUrl);
  const invoiceIds = extractIds(invoiceSheetUrl);

  console.log('📄 Delivery Template:');
  console.log(`  URL: ${deliverySheetUrl}`);
  console.log(`  File ID: ${deliveryIds.fileId}`);
  console.log(`  Sheet ID (tab): ${deliveryIds.sheetId}`);
  console.log('');

  console.log('📄 Invoice Template:');
  console.log(`  URL: ${invoiceSheetUrl}`);
  console.log(`  File ID: ${invoiceIds.fileId}`);
  console.log(`  Sheet ID (tab): ${invoiceIds.sheetId}`);
  console.log('');

  // 環境変数の設定値と比較
  console.log('📋 Current .env.local settings:');
  console.log(`  GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=${process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID}`);
  console.log(`  GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID=${process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID}`);
  console.log('');

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error('❌ Missing Google Sheets credentials');
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

    // 納品書テンプレートを確認
    console.log('✅ Verifying delivery template access...');
    try {
      const deliveryFile = await drive.files.get({
        fileId: deliveryIds.fileId!,
        fields: 'id, name, owners, permissions',
      });
      console.log(`  ✅ File accessible: ${deliveryFile.data.name}`);
      console.log(`  Owners:`, deliveryFile.data.owners?.map(o => o.emailAddress).join(', '));
    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message);
    }
    console.log('');

    // 請求書テンプレートを確認
    console.log('✅ Verifying invoice template access...');
    try {
      const invoiceFile = await drive.files.get({
        fileId: invoiceIds.fileId!,
        fields: 'id, name, owners, permissions',
      });
      console.log(`  ✅ File accessible: ${invoiceFile.data.name}`);
      console.log(`  Owners:`, invoiceFile.data.owners?.map(o => o.emailAddress).join(', '));
    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message);
      if (error.code === 404) {
        console.error(`  The file does not exist or service account doesn't have access`);
      }
    }
    console.log('');

    // 推奨される設定
    console.log('📝 Recommended .env.local settings:');
    console.log(`GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID="${deliveryIds.fileId}"`);
    console.log(`GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID="${invoiceIds.fileId}"`);
    console.log('');

    console.log('⚠️  IMPORTANT:');
    console.log('1. Make sure both spreadsheets are shared with the service account:');
    console.log(`   ${clientEmail}`);
    console.log('2. Give the service account "Editor" permission');
    console.log('3. The template IDs should be FILE IDs, not sheet IDs (tab IDs)');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

verifyTemplateIds();
