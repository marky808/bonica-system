import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 環境変数デバッグ開始');

    // 環境変数をチェック
    const envVars = {
      GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? 'SET (length: ' + process.env.GOOGLE_SHEETS_PRIVATE_KEY.length + ')' : 'NOT_SET',
      GOOGLE_SHEETS_PROJECT_ID: process.env.GOOGLE_SHEETS_PROJECT_ID,

      // 代替名もチェック
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET (length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : 'NOT_SET',

      // その他の環境変数
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
    };

    console.log('📋 環境変数状況:', envVars);

    // Google Sheets関連の環境変数の詳細チェック
    const googleSheetsCheck = {
      hasSpreadsheetId: !!(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID),
      hasClientEmail: !!(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      hasPrivateKey: !!(process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY),
      hasProjectId: !!process.env.GOOGLE_SHEETS_PROJECT_ID,
    };

    // PRIVATE_KEYの形式チェック
    let privateKeyAnalysis = null;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
    if (privateKey) {
      privateKeyAnalysis = {
        length: privateKey.length,
        startsWithBegin: privateKey.startsWith('-----BEGIN'),
        endsWithEnd: privateKey.includes('-----END'),
        hasNewlines: privateKey.includes('\\n'),
        hasActualNewlines: privateKey.includes('\n'),
      };
    }

    // CLIENT_EMAILの形式チェック
    let emailAnalysis = null;
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    if (clientEmail) {
      emailAnalysis = {
        length: clientEmail.length,
        containsAt: clientEmail.includes('@'),
        endsWithIam: clientEmail.includes('.iam.gserviceaccount.com'),
        format: clientEmail.split('@')[1] || 'invalid',
      };
    }

    return NextResponse.json({
      status: 'debug_complete',
      environmentVariables: envVars,
      googleSheetsCheck: googleSheetsCheck,
      privateKeyAnalysis: privateKeyAnalysis,
      emailAnalysis: emailAnalysis,
      allVariablesPresent: googleSheetsCheck.hasSpreadsheetId &&
                          googleSheetsCheck.hasClientEmail &&
                          googleSheetsCheck.hasPrivateKey &&
                          googleSheetsCheck.hasProjectId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 環境変数デバッグエラー:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // POSTでも同じ情報を返す（認証付きの場合用）
  return GET(request);
}