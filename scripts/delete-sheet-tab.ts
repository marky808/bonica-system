import * as dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '.env.vercel.production' });

const SPREADSHEET_ID = '10T2DXY302syP0UuE9FfG6WcXFFmqifle60CXaAbH3h8'; // 2026年1月の月別スプレッドシート
const TAB_NAME = '1月分_ムスビガーデン都立大学店';

async function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return oauth2Client;
}

async function main() {
  const auth = await getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });

  // シート情報を取得
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s: any) => s.properties?.title === TAB_NAME
  );

  if (!sheet) {
    console.log(`Tab "${TAB_NAME}" not found`);
    return;
  }

  const sheetId = sheet.properties?.sheetId;
  console.log(`Found tab "${TAB_NAME}" with sheetId: ${sheetId}`);

  // タブを削除
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteSheet: {
            sheetId: sheetId,
          },
        },
      ],
    },
  });

  console.log(`Tab "${TAB_NAME}" deleted successfully`);
}

main().catch(console.error);
