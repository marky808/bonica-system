import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID ?
      `${process.env.GOOGLE_OAUTH_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?
      'SET (hidden)' : 'NOT SET',
    GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?
      `${process.env.GOOGLE_OAUTH_REFRESH_TOKEN.substring(0, 20)}...` : 'NOT SET',
    GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID: process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID || 'NOT SET',
    GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID: process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID || 'NOT SET',

    // Check for trailing newlines or special characters
    DELIVERY_TEMPLATE_LENGTH: process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID?.length || 0,
    DELIVERY_TEMPLATE_HAS_NEWLINE: process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID?.includes('\n') || false,
    DELIVERY_TEMPLATE_TRIMMED: process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID?.trim() || '',

    OAUTH_CLIENT_ID_LENGTH: process.env.GOOGLE_OAUTH_CLIENT_ID?.length || 0,
    OAUTH_CLIENT_ID_HAS_NEWLINE: process.env.GOOGLE_OAUTH_CLIENT_ID?.includes('\n') || false,

    OAUTH_REFRESH_TOKEN_LENGTH: process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.length || 0,
    OAUTH_REFRESH_TOKEN_HAS_NEWLINE: process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.includes('\n') || false,
  };

  return NextResponse.json(envVars, { status: 200 });
}
