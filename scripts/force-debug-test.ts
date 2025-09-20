import fetch from 'node-fetch';

const BASE_URL = 'https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app';

async function forceDebugTest() {
  console.log('🔍 強制デバッグテスト開始');

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
      console.log('❌ ログイン失敗:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('📋 ログインエラー詳細:', errorText);
      return;
    }

    const loginData = await loginResponse.json() as any;
    const token = loginData.token;
    console.log('✅ ログイン成功');

    // 2. 強制デバッグモードで納品書作成
    console.log('\n📊 強制デバッグモードで納品書作成...');

    const createResponse = await fetch(`${BASE_URL}/api/google-sheets/create-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Debug-Mode': 'true',
        'X-Force-Debug': 'true',
        'X-Debug-Level': 'verbose'
      },
      body: JSON.stringify({
        deliveryId: 'cmfr18ph6000219fjzrfsy9r7',
        templateId: '1125769553'
      })
    });

    console.log('📋 Response Status:', createResponse.status);
    console.log('📋 Response Headers:', Object.fromEntries(createResponse.headers.entries()));

    const responseText = await createResponse.text();
    console.log('📋 Raw Response Length:', responseText.length);
    console.log('📋 Raw Response (first 500 chars):', responseText.substring(0, 500));

    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📋 Parsed Response:');
      console.log(JSON.stringify(responseJson, null, 2));

      // デバッグ情報があるかチェック
      if (responseJson.debugInfo) {
        console.log('\n🔧 デバッグ情報見つかりました:');
        console.log('  Error Type:', responseJson.debugInfo.errorType);
        console.log('  Error Message:', responseJson.debugInfo.errorMessage);
        console.log('  Environment Check:', responseJson.debugInfo.environmentCheck);

        if (responseJson.debugInfo.errorStack) {
          console.log('\n📋 Error Stack:');
          console.log(responseJson.debugInfo.errorStack);
        }
      } else {
        console.log('⚠️ デバッグ情報が含まれていません');
      }

    } catch (e) {
      console.log('⚠️ レスポンスがJSONではありません');
      console.log('📋 Full Response Text:', responseText);
    }

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    if (error instanceof Error) {
      console.error('📋 Error Message:', error.message);
      console.error('📋 Error Stack:', error.stack);
    }
  }
}

forceDebugTest();