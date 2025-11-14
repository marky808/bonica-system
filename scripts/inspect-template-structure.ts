import { google } from 'googleapis';

const TEMPLATE_FILE_ID = '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY';

async function inspectTemplate() {
  console.log('🔍 テンプレートファイルの構造を確認中...\n');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  try {
    // テンプレートの基本情報を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: TEMPLATE_FILE_ID,
    });

    console.log('📄 テンプレート情報:');
    console.log(`  タイトル: ${spreadsheet.data.properties?.title}`);
    console.log(`  シート数: ${spreadsheet.data.sheets?.length}\n`);

    // 各シートの情報
    spreadsheet.data.sheets?.forEach((sheet, index) => {
      console.log(`シート ${index + 1}:`);
      console.log(`  名前: ${sheet.properties?.title}`);
      console.log(`  行数: ${sheet.properties?.gridProperties?.rowCount}`);
      console.log(`  列数: ${sheet.properties?.gridProperties?.columnCount}\n`);
    });

    // 最初のシートの内容を取得（A1:I30くらいまで）
    const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
    const range = `${firstSheetName}!A1:I30`;

    console.log(`📊 シート「${firstSheetName}」の内容を取得中...\n`);

    const values = await sheets.spreadsheets.values.get({
      spreadsheetId: TEMPLATE_FILE_ID,
      range: range,
    });

    const rows = values.data.values;

    if (!rows || rows.length === 0) {
      console.log('⚠️  データが見つかりません');
      return;
    }

    console.log('📋 テンプレートの構造（A1:I30）:\n');
    console.log('行番号 | 内容');
    console.log('-------|---------------------------------------------------------------------');

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const rowContent = row.map((cell, colIndex) => {
        const colLetter = String.fromCharCode(65 + colIndex); // A, B, C, ...
        return cell ? `${colLetter}:${cell}` : '';
      }).filter(c => c).join(' | ');

      if (rowContent) {
        console.log(`${String(rowNum).padStart(6)} | ${rowContent}`);
      }
    });

    // 特定の重要なセルを確認
    console.log('\n\n🔍 重要なデータ入力位置の確認:\n');

    const importantCells = [
      'B3', 'B4', 'B5', 'B6', 'B7', 'B8', // ヘッダー情報
      'A11', 'B11', 'C11', 'D11', 'E11', 'F11', 'G11', 'H11', 'I11', // 明細行
      'B14', 'C14', 'B15', 'C15', 'B16', 'C16', 'B17', 'C17', 'B18', 'C18', 'B19', 'C19' // 集計情報
    ];

    for (const cell of importantCells) {
      const cellValue = await sheets.spreadsheets.values.get({
        spreadsheetId: TEMPLATE_FILE_ID,
        range: `${firstSheetName}!${cell}`,
      });

      const value = cellValue.data.values?.[0]?.[0] || '(空)';
      console.log(`  ${cell}: ${value}`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

inspectTemplate();
