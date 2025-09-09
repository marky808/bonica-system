#!/usr/bin/env node

/**
 * 自動初期化スクリプト
 * Vercelデプロイ後に自動実行される
 */

const https = require('https');
const http = require('http');

const VERCEL_URL = process.env.VERCEL_URL;
const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000';

console.log('🚀 Starting auto-initialization...');
console.log('🌐 Target URL:', baseUrl);

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      timeout: 30000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function initializeDatabase() {
  try {
    console.log('🔍 Checking health status...');
    
    // ヘルスチェックAPIを呼び出し（自動初期化含む）
    const healthResult = await makeRequest(`${baseUrl}/api/health`);
    
    console.log('📊 Health check response:', JSON.stringify(healthResult, null, 2));
    
    if (healthResult.status === 200) {
      const healthData = healthResult.data;
      
      if (healthData.initialized) {
        console.log('✅ Database initialization successful!');
        console.log('👤 Admin user:', healthData.admin);
        console.log('📈 User count:', healthData.users);
        
        if (healthData.autoInit) {
          console.log('🎉 Auto-initialization completed successfully!');
        } else {
          console.log('ℹ️ Database was already initialized');
        }
        
        return true;
      } else {
        console.error('❌ Database initialization failed');
        return false;
      }
    } else {
      console.error('❌ Health check failed with status:', healthResult.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Auto-initialization error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🏁 Auto-initialization script started');
  
  // 少し待ってからデプロイが安定するまで待機
  console.log('⏳ Waiting for deployment to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const success = await initializeDatabase();
  
  if (success) {
    console.log('🎉 Auto-initialization completed successfully!');
    console.log('🔑 Login credentials:');
    console.log('   Email: 808works@gmail.com');
    console.log('   Password: 6391');
    console.log(`🌍 Login URL: ${baseUrl}/login`);
    process.exit(0);
  } else {
    console.error('💥 Auto-initialization failed!');
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}