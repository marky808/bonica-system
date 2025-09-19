import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Google Sheets debug endpoint called');

    // 環境変数の詳細チェック
    const envCheck = {
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasProjectId: !!process.env.GOOGLE_SHEETS_PROJECT_ID,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      clientEmailLength: process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.length || 0,
      privateKeyLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
      projectIdLength: process.env.GOOGLE_SHEETS_PROJECT_ID?.length || 0,
      spreadsheetIdLength: process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.length || 0,
      privateKeyStartsWith: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.substring(0, 30) || '',
      privateKeyHasNewlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\\n') || false,
      privateKeyHasActualNewlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\n') || false,
      clientEmailValue: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'NOT_SET',
      projectIdValue: process.env.GOOGLE_SHEETS_PROJECT_ID || 'NOT_SET',
      spreadsheetIdValue: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'NOT_SET'
    };

    console.log('🔍 Environment variables check:', envCheck);

    // Google Sheets クライアント初期化テスト
    let googleSheetsClientTest = null;
    let clientInitError = null;

    try {
      console.log('🔧 Testing Google Sheets client initialization...');
      const { getGoogleSheetsClient } = await import('@/lib/google-sheets-client');
      googleSheetsClientTest = getGoogleSheetsClient();
      console.log('✅ Google Sheets client initialized successfully');
    } catch (error) {
      console.error('❌ Google Sheets client initialization failed:', error);
      clientInitError = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      };
    }

    return NextResponse.json({
      status: 'debug',
      environment: envCheck,
      googleSheetsClient: {
        initialized: !!googleSheetsClientTest,
        error: clientInitError
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}