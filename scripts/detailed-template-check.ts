import { google } from 'googleapis';

const TEMPLATE_FILE_ID = '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY';

async function detailedCheck() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  console.log('🔍 テンプレートの全セルを詳細確認（A1:I25）\n');

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: TEMPLATE_FILE_ID,
    range: '納品書テンプレート!A1:I25',
  });

  const rows = result.data.values || [];

  // 行ごとに表示
  for (let rowIndex = 0; rowIndex < Math.max(25, rows.length); rowIndex++) {
    const rowNum = rowIndex + 1;
    const row = rows[rowIndex] || [];

    console.log(`\n--- 行 ${rowNum} ---`);

    for (let colIndex = 0; colIndex < 9; colIndex++) {
      const colLetter = String.fromCharCode(65 + colIndex);
      const cellValue = row[colIndex] || '(空)';
      console.log(`  ${colLetter}${rowNum}: ${cellValue}`);
    }
  }
}

detailedCheck();
