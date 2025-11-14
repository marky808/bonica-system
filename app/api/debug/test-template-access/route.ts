import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const templateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID not set' }, { status: 500 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({
      error: 'OAuth credentials not configured',
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken
    }, { status: 500 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3000/api/auth/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Try to get template file info
    const fileResponse = await drive.files.get({
      fileId: templateId,
      fields: 'id, name, mimeType, owners',
    });

    // Try to copy the template
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: `[TEST] 診断テスト_${new Date().toISOString()}`,
      },
    });

    const testFileId = copyResponse.data.id;

    // Delete the test file
    if (testFileId) {
      await drive.files.delete({ fileId: testFileId });
    }

    return NextResponse.json({
      success: true,
      message: 'Template access successful',
      templateInfo: {
        id: fileResponse.data.id,
        name: fileResponse.data.name,
        mimeType: fileResponse.data.mimeType,
        owner: fileResponse.data.owners?.[0]?.emailAddress,
      },
      testCopySuccess: true,
      testCopyId: testFileId,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      status: error.status,
      details: error.errors,
    }, { status: 500 });
  }
}
