import fetch from 'node-fetch';

const BASE_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app';

async function getDetailedErrorLog() {
  console.log('🔍 詳細エラーログ取得開始');

  try {
    // 1. ログイン
    console.log('🔐 ログイン中...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '808works.jp@gmail.com',
        password: '6391'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json() as any;
    const token = loginData.token;
    console.log('✅ ログイン成功');

    // 2. Google Sheets環境変数チェック
    console.log('\n📋 Google Sheets設定確認...');
    const envCheckResponse = await fetch(`${BASE_URL}/api/debug/env`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (envCheckResponse.ok) {
      const envData = await envCheckResponse.json();
      console.log('📋 環境変数設定:', JSON.stringify(envData, null, 2));
    } else {
      console.log('⚠️ 環境変数チェックエンドポイントなし');
    }

    // 3. 納品書作成で詳細ログ付き
    console.log('\n📊 納品書作成（詳細ログ付き）...');
    const createResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Debug-Mode': 'true',  // デバッグモードヘッダー
      },
      body: JSON.stringify({
        deliveryId: 'cmfr18ph6000219fjzrfsy9r7',
        templateId: '1125769553'
      })
    });

    console.log('📋 Response Status:', createResponse.status);
    console.log('📋 Response Headers:', Object.fromEntries(createResponse.headers.entries()));

    const responseText = await createResponse.text();
    console.log('📋 Raw Response:', responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log('📋 Parsed Response:', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('⚠️ レスポンスがJSONではありません');
    }

    // 4. Google Sheets APIの直接テスト
    console.log('\n🔧 Google Sheets API直接テスト...');
    const sheetsTestResponse = await fetch(`${BASE_URL}/api/google-sheets/test`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (sheetsTestResponse.ok) {
      const sheetsTestData = await sheetsTestResponse.json();
      console.log('📋 Google Sheets API テスト結果:', JSON.stringify(sheetsTestData, null, 2));
    } else {
      console.log('⚠️ Google Sheets APIテストエンドポイントなし:', sheetsTestResponse.status);
    }

    // 5. Vercelのログ確認
    console.log('\n📊 Vercelログ情報取得試行...');
    const logResponse = await fetch(`${BASE_URL}/api/debug/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (logResponse.ok) {
      const logData = await logResponse.json();
      console.log('📋 Vercelログ:', JSON.stringify(logData, null, 2));
    } else {
      console.log('⚠️ ログエンドポイントなし:', logResponse.status);
    }

  } catch (error) {
    console.error('❌ エラー詳細:', error);
    if (error instanceof Error) {
      console.error('📋 Error Message:', error.message);
      console.error('📋 Error Stack:', error.stack);
    }
  }
}

getDetailedErrorLog();