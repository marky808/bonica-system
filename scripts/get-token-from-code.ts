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

async function getTokenFromCode() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = 'http://localhost:3000/api/auth/google/callback';

  // URLから認証コードを抽出
  const code = '4/0Ab32j92c0b72W6CjqxxLzcfYphoKAkNp_2Unen6vHs2Wj88dQ_qYJNNGYIwxbMFUixbpnA';

  console.log('🔐 OAuth 2.0トークン取得中...\n');
  console.log('━'.repeat(60));

  try {
    // OAuth2クライアントを作成
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log('✅ 認証コードを受信しました');
    console.log('📡 Googleからトークンを取得中...\n');

    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('❌ エラー: リフレッシュトークンが取得できませんでした\n');
      console.log('💡 対処方法:');
      console.log('1. Google Cloud Consoleで、このアプリのアクセス許可を削除');
      console.log('   https://myaccount.google.com/permissions');
      console.log('2. 再度OAuth認証を実施');
      return;
    }

    console.log('━'.repeat(60));
    console.log('✅ 成功！リフレッシュトークンを取得しました\n');
    console.log('新しいトークン:');
    console.log(tokens.refresh_token);
    console.log('');
    console.log('━'.repeat(60));
    console.log('');

    // .env.localを更新
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // 既存のGOOGLE_OAUTH_REFRESH_TOKENを削除
    const lines = envContent.split('\n').filter(line =>
      !line.trim().startsWith('GOOGLE_OAUTH_REFRESH_TOKEN=')
    );

    // 新しいトークンを追加
    lines.push(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);

    fs.writeFileSync(envPath, lines.join('\n'));
    console.log('✅ .env.local に保存しました！\n');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📝 次のステップ:');
    console.log('   1. 動作確認テストを実行');
    console.log('      npx tsx scripts/test-oauth-delivery.ts');
    console.log('');
    console.log('   2. 成功したらERROR状態の納品データを修復');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

getTokenFromCode();
