import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

async function getRefreshToken() {
  console.log('🔐 OAuth 2.0 Refresh Token取得ツール\n');
  console.log('━'.repeat(60));

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    console.error('❌ エラー: OAuth認証情報が設定されていません\n');
    console.log('以下の環境変数を .env.local に設定してください:');
    console.log('  - GOOGLE_OAUTH_CLIENT_ID');
    console.log('  - GOOGLE_OAUTH_CLIENT_SECRET');
    console.log('  - GOOGLE_OAUTH_REDIRECT_URI (オプション)\n');
    console.log('詳細は OAUTH_SETUP_GUIDE.md を参照してください。');
    return;
  }

  console.log('✅ OAuth認証情報を確認しました');
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`   Redirect URI: ${redirectUri}\n`);

  // OAuth2クライアントを作成
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // スコープを定義
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ];

  // 認証URLを生成
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // リフレッシュトークンを取得するために必要
    scope: scopes,
    prompt: 'consent',  // 毎回同意画面を表示してリフレッシュトークンを確実に取得
  });

  console.log('📋 ステップ1: 以下のURLをブラウザで開いてください\n');
  console.log(authUrl);
  console.log('');
  console.log('━'.repeat(60));
  console.log('📋 ステップ2: Googleアカウントでログイン');
  console.log('   - bonicasystem@gmail.com でログインしてください');
  console.log('   - アクセス許可を承認してください');
  console.log('');
  console.log('━'.repeat(60));
  console.log('📋 ステップ3: リダイレクト後のURLをコピー');
  console.log('');
  console.log('ブラウザがリダイレクトされた後、アドレスバーに表示される');
  console.log('完全なURLをコピーしてください。');
  console.log('');
  console.log('例:');
  console.log('http://localhost:3000/api/auth/google/callback?code=4/0Adeu5BW...');
  console.log('');
  console.log('━'.repeat(60));
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('リダイレクト後の完全なURLを貼り付けてください: ', async (redirectedUrl) => {
    rl.close();

    try {
      // URLからcodeパラメータを抽出
      const url = new URL(redirectedUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        console.error('\n❌ エラー: URLに認証コードが含まれていません');
        console.log('正しいリダイレクトURLを貼り付けてください。');
        return;
      }

      console.log('\n✅ 認証コードを取得しました');
      console.log('トークンを取得中...\n');

      // 認証コードをトークンに交換
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error('❌ エラー: リフレッシュトークンが取得できませんでした\n');
        console.log('💡 対処方法:');
        console.log('1. Google Cloud Consoleで、このアプリのアクセス許可を削除');
        console.log('   https://myaccount.google.com/permissions');
        console.log('2. このスクリプトを再実行');
        console.log('3. 再度承認画面で許可を与える');
        return;
      }

      console.log('━'.repeat(60));
      console.log('✅ 成功！リフレッシュトークンを取得しました\n');
      console.log('以下のトークンを .env.local に追加してください:\n');
      console.log('GOOGLE_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('');
      console.log('━'.repeat(60));
      console.log('');
      console.log('📝 .env.local ファイルに以下の行を追加:');
      console.log('');
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('');
      console.log('━'.repeat(60));
      console.log('');
      console.log('⚠️  重要: このトークンは秘密情報です！');
      console.log('   - Gitにコミットしないでください');
      console.log('   - 他の人と共有しないでください');
      console.log('   - .env.local が .gitignore に含まれていることを確認してください');
      console.log('');

      // トークンをファイルに保存するオプション
      console.log('💾 トークンを自動的に .env.local に追加しますか？ (y/N)');

      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl2.question('', (answer) => {
        rl2.close();

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf-8');
            }

            // 既存のGOOGLE_OAUTH_REFRESH_TOKENを削除
            const lines = envContent.split('\n').filter(line =>
              !line.trim().startsWith('GOOGLE_OAUTH_REFRESH_TOKEN=')
            );

            // 新しいトークンを追加
            lines.push(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);

            fs.writeFileSync(envPath, lines.join('\n'));
            console.log('\n✅ .env.local に保存しました！');
            console.log('\n次のステップ: google-sheets-client.ts を修正してOAuth認証を実装');
          } catch (error: any) {
            console.error('\n❌ ファイル保存エラー:', error.message);
            console.log('手動で .env.local に追加してください。');
          }
        } else {
          console.log('\n手動で .env.local に追加してください。');
        }
      });

    } catch (error: any) {
      console.error('\n❌ エラー:', error.message);
      console.error('詳細:', error);
    }
  });
}

getRefreshToken();
