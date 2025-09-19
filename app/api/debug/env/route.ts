import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasProjectId: !!process.env.GOOGLE_SHEETS_PROJECT_ID,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      clientEmailLength: process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.length || 0,
      privateKeyLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
      privateKeyStartsWith: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.substring(0, 30) || '',
      privateKeyHasNewlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\\n') || false,
      privateKeyHasActualNewlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\n') || false,
      projectIdLength: process.env.GOOGLE_SHEETS_PROJECT_ID?.length || 0,
      spreadsheetIdLength: process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.length || 0,
    }

    return NextResponse.json({
      status: 'debug',
      envVars,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}