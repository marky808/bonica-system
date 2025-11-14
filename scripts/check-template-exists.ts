import { google } from 'googleapis';

const TEMPLATE_FILE_ID = '1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY';

async function checkTemplateExists() {
  console.log('🔍 テンプレートファイルの存在確認...\n');

  // OAuth 2.0認証
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    console.log(`📋 Template ID: ${TEMPLATE_FILE_ID}\n`);

    // ファイル情報を取得
    const response = await drive.files.get({
      fileId: TEMPLATE_FILE_ID,
      fields: 'id, name, mimeType, owners, permissions, createdTime, modifiedTime, webViewLink',
    });

    console.log('✅ テンプレートファイルが見つかりました！\n');
    console.log('📄 ファイル情報:');
    console.log(`  ID: ${response.data.id}`);
    console.log(`  名前: ${response.data.name}`);
    console.log(`  タイプ: ${response.data.mimeType}`);
    console.log(`  作成日時: ${response.data.createdTime}`);
    console.log(`  更新日時: ${response.data.modifiedTime}`);
    console.log(`  URL: ${response.data.webViewLink}`);

    if (response.data.owners) {
      console.log(`\n👤 所有者:`);
      response.data.owners.forEach((owner: any) => {
        console.log(`  - ${owner.displayName} (${owner.emailAddress})`);
      });
    }

    // 権限を確認
    try {
      const permissionsResponse = await drive.permissions.list({
        fileId: TEMPLATE_FILE_ID,
        fields: 'permissions(id, type, role, emailAddress)',
      });

      console.log(`\n🔒 アクセス権限:`);
      permissionsResponse.data.permissions?.forEach((perm: any) => {
        console.log(`  - タイプ: ${perm.type}, 役割: ${perm.role}, Email: ${perm.emailAddress || 'N/A'}`);
      });
    } catch (permError) {
      console.log('\n⚠️  権限情報の取得に失敗（アクセス権限が不足している可能性があります）');
    }

    // コピーテスト
    console.log('\n🧪 テンプレートのコピーテスト...');
    const testCopy = await drive.files.copy({
      fileId: TEMPLATE_FILE_ID,
      requestBody: {
        name: `[TEST] 納品書テンプレートコピーテスト_${new Date().toISOString()}`,
      },
    });

    console.log(`✅ コピー成功！ 新しいファイルID: ${testCopy.data.id}`);
    console.log(`   URL: https://docs.google.com/spreadsheets/d/${testCopy.data.id}`);

    // テストファイルを削除
    console.log('\n🗑️  テストファイルを削除中...');
    await drive.files.delete({ fileId: testCopy.data.id! });
    console.log('✅ テストファイルを削除しました');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(`  ステータスコード: ${error.code}`);
    console.error(`  メッセージ: ${error.message}`);

    if (error.code === 404) {
      console.error('\n💡 原因: テンプレートファイルが存在しないか、アクセス権限がありません');
      console.error('   - ファイルIDが正しいか確認してください');
      console.error('   - OAuthアカウントに共有されているか確認してください');
    } else if (error.code === 403) {
      console.error('\n💡 原因: アクセス権限が不足しています');
      console.error('   - テンプレートファイルがOAuthアカウントに共有されているか確認してください');
    }

    console.error('\n📧 OAuth認証に使用しているアカウント:', process.env.GOOGLE_OAUTH_CLIENT_ID);
  }
}

checkTemplateExists().catch(console.error);
