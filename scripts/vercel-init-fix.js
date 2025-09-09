#!/usr/bin/env node

/**
 * Vercel本番環境のデータベース初期化スクリプト
 * ログイン問題を解決するための緊急対応用
 */

const https = require('https');

// VercelアプリのURLを設定してください
const VERCEL_APP_URL = process.env.VERCEL_APP_URL || 'https://your-app.vercel.app';
const INIT_SECRET_KEY = process.env.INIT_SECRET_KEY || 'your-init-secret-key';

console.log('🚀 Vercel本番データベース初期化を開始...');
console.log('🌐 Target URL:', VERCEL_APP_URL);

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function initializeDatabase() {
  try {
    console.log('🔍 Step 1: ヘルスチェック実行...');
    
    // まずヘルスチェックで自動初期化を試行
    const healthResponse = await makeRequest(`${VERCEL_APP_URL}/api/health`);
    console.log('📊 Health check result:', healthResponse);
    
    if (healthResponse.status === 200 && healthResponse.data.initialized) {
      console.log('✅ 自動初期化成功！');
      console.log('👤 Admin user:', healthResponse.data.admin);
      return;
    }
    
    console.log('🔄 Step 2: 手動初期化実行...');
    
    // ヘルスチェックが失敗した場合、手動初期化を実行
    const initResponse = await makeRequest(`${VERCEL_APP_URL}/api/admin/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INIT_SECRET_KEY}`
      }
    });
    
    console.log('📊 Manual init result:', initResponse);
    
    if (initResponse.status === 200) {
      console.log('✅ 手動初期化成功！');
      console.log('📋 結果:', initResponse.data);
    } else {
      console.log('❌ 初期化失敗:', initResponse);
    }
    
    console.log('🔍 Step 3: 最終確認...');
    
    // 最終確認
    const finalCheck = await makeRequest(`${VERCEL_APP_URL}/api/health`);
    console.log('📊 Final check:', finalCheck);
    
    if (finalCheck.status === 200 && finalCheck.data.users > 0) {
      console.log('🎉 データベース初期化完了！');
      console.log('🔑 ログイン情報:');
      console.log('  Email: 808works@gmail.com');
      console.log('  Password: 6391');
      console.log('🌐 ログインURL:', `${VERCEL_APP_URL}/login`);
    } else {
      console.log('❌ 初期化の確認に失敗しました');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    
    // デバッグ情報
    console.log('🔧 環境変数チェック:');
    console.log('  VERCEL_APP_URL:', VERCEL_APP_URL);
    console.log('  INIT_SECRET_KEY:', INIT_SECRET_KEY ? '設定済み' : '未設定');
  }
}

// スクリプト実行
initializeDatabase();