/**
 * 12社向け請求書一括発行スクリプト
 *
 * 実行: source .env.vercel.production && npx tsx scripts/create-invoices-batch.ts
 */

const API_BASE = 'https://bonica-system.vercel.app';

// 認証トークンを取得
async function getToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '808works@gmail.com',
      password: '6391'
    })
  });
  const data = await response.json();
  if (!data.token) throw new Error('Failed to get token');
  return data.token;
}

// 請求書作成API呼び出し
async function createInvoice(token: string, customerId: string, year: number, month: number): Promise<any> {
  const response = await fetch(`${API_BASE}/api/invoices/monthly`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ customerId, year, month })
  });
  return response.json();
}

// 直接API（create-invoice-v2）での請求書作成
async function createInvoiceV2(token: string, customerId: string, startDate: string, endDate: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/google-sheets/create-invoice-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ customerId, startDate, endDate })
  });
  return response.json();
}

async function main() {
  console.log('🚀 請求書一括発行を開始します...\n');

  // トークン取得
  const token = await getToken();
  console.log('✅ 認証成功\n');

  // 発行対象リスト
  const invoiceTargets = [
    // 12月分（月末締め）
    { customerId: 'cmgg2nvuq00023wtg3b13dsn4', name: 'いっとく', year: 2025, month: 12 },
    { customerId: 'cmgg2ujvp00033wtgxer5owll', name: 'ダイニングレストランQUEST', year: 2025, month: 12 },
    { customerId: 'cmgg3ahyj00043wtgyv0s15vt', name: 'ICHINA', year: 2025, month: 12 },
    { customerId: 'cmgzw0lya000083rrvcsas8lc', name: '株式会社ショクワ（コロレ）', year: 2025, month: 12 },
    { customerId: 'cmimpo3ps0001137rpnnv1rjy', name: '美加和', year: 2025, month: 12 },
    { customerId: 'cmis5muya0001ma0zl5cucp1o', name: '株式会社ミートライフ', year: 2025, month: 12 },

    // 11月分
    { customerId: 'cmisgxhyp0002ljuisjbh4246', name: '株式会社ファーストプロスパー', year: 2025, month: 11 },
    { customerId: 'cmhy7j5kf00001265w6ee5j4g', name: 'さいかつ農業協同組合（八潮直売所）', year: 2025, month: 11 },
  ];

  // ムスビガーデン都立大学店（二十日締め 11~12月分）は特別処理
  // 締め日20日: 11月21日〜12月20日の期間
  const musubiTarget = {
    customerId: 'cmiy2omxc0001oxw81ttt7xui',
    name: 'ムスビガーデン都立大学店（11~12月分）',
    startDate: '2025-11-21',
    endDate: '2025-12-20'
  };

  const results: { name: string; success: boolean; url?: string; error?: string; amount?: number }[] = [];

  // 通常の月次請求書発行
  console.log('📋 月次請求書を発行中...\n');
  for (const target of invoiceTargets) {
    console.log(`  ${target.name} (${target.year}年${target.month}月)...`);
    try {
      const result = await createInvoice(token, target.customerId, target.year, target.month);
      if (result.success) {
        console.log(`    ✅ 成功: ¥${result.totalAmount?.toLocaleString()} ${result.url}`);
        results.push({ name: target.name, success: true, url: result.url, amount: result.totalAmount });
      } else {
        console.log(`    ❌ 失敗: ${result.error}`);
        results.push({ name: target.name, success: false, error: result.error });
      }
    } catch (err: any) {
      console.log(`    ❌ エラー: ${err.message}`);
      results.push({ name: target.name, success: false, error: err.message });
    }
    // API負荷軽減のため少し待機
    await new Promise(r => setTimeout(r, 2000));
  }

  // ムスビガーデン都立大学店（特別期間）
  console.log(`\n  ${musubiTarget.name}...`);
  try {
    const result = await createInvoiceV2(token, musubiTarget.customerId, musubiTarget.startDate, musubiTarget.endDate);
    if (result.success) {
      console.log(`    ✅ 成功: ¥${result.totalAmount?.toLocaleString()} ${result.url}`);
      results.push({ name: musubiTarget.name, success: true, url: result.url, amount: result.totalAmount });
    } else {
      console.log(`    ❌ 失敗: ${result.error}`);
      results.push({ name: musubiTarget.name, success: false, error: result.error });
    }
  } catch (err: any) {
    console.log(`    ❌ エラー: ${err.message}`);
    results.push({ name: musubiTarget.name, success: false, error: err.message });
  }

  // 結果サマリー
  console.log('\n\n========================================');
  console.log('📊 請求書発行結果サマリー');
  console.log('========================================\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`成功: ${successCount}件 / 失敗: ${failCount}件\n`);

  console.log('【成功した請求書】');
  results.filter(r => r.success).forEach(r => {
    console.log(`  ✅ ${r.name}: ¥${r.amount?.toLocaleString()}`);
    console.log(`     ${r.url}`);
  });

  if (failCount > 0) {
    console.log('\n【失敗した請求書】');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
  }

  console.log('\n【納品データなしのため発行できなかった会社】');
  console.log('  - 株式会社一〇八');
  console.log('  - 鮨割烹「粋」');
  console.log('  - BAKE SHOP KONA');
}

main().catch(console.error);
