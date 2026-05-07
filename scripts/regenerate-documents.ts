/**
 * 分割された納品の納品書・請求書を再生成するスクリプト
 *
 * 実行: npx tsx scripts/regenerate-documents.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 本番環境URL
const BASE_URL = 'https://bonica-system.vercel.app';

// テスト用の認証情報
const AUTH_EMAIL = process.env.TEST_EMAIL;
const AUTH_PASSWORD = process.env.TEST_PASSWORD;

// 分割で新しく作成された納品番号
const NEW_DELIVERY_NUMBERS = [
  // ICHINA 01/15, 01/22
  'DEL-58NDO9DC',
  'DEL-V1697IPP',
  // ICHINA 12/16, 12/17
  'DEL-Z6WHV7TZ',
  'DEL-02D2HC0P',
  // 株式会社一〇八 12/09, 12/27, 12/28
  'DEL-6L1CN0MD',
  'DEL-EFAYTFYZ',
  'DEL-0ID1D6FJ',
  // 株式会社一〇八 12/02, 12/09
  'DEL-DRJLMMJJ',
  'DEL-XE7V2LZE',
  // 株式会社一〇八 12/02, 12/09 (別の元データ)
  'DEL-8IPF9K5D',
  'DEL-GLA1JHAF',
  // ファーストプロスパー 12/01, 12/15, 12/19
  'DEL-AYOQ5HBS',
  'DEL-FBJ2ETE6',
  'DEL-RI9R7RMN',
];

// 日付統一で更新された納品番号
const UNIFIED_DELIVERY_NUMBERS = [
  'DEL-CMKKJ3G4', // 鮨割烹「粋」
  'DEL-CMKG6S9N', // いっとく
  'DEL-CMKOSBE7', // ICHINA
];

// 影響を受けた顧客（請求書再生成対象）
const AFFECTED_CUSTOMERS = [
  { name: 'ICHINA', months: ['2025-12', '2026-01'] },
  { name: '株式会社　一〇八', months: ['2025-12'] },
  { name: '株式会社ファーストプロスパー', months: ['2025-12'] },
  { name: '鮨割烹　「粋」', months: ['2026-01'] },
  { name: 'いっとく　', months: ['2026-01'] }, // 末尾スペースあり
];

interface AuthToken {
  token: string;
}

/**
 * ログインしてトークンを取得
 */
async function login(): Promise<string> {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    throw new Error('TEST_EMAIL と TEST_PASSWORD 環境変数を設定してください');
  }

  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ログイン失敗: ${error}`);
  }

  const data = await response.json() as AuthToken;
  return data.token;
}

/**
 * 納品書を作成
 */
async function createDeliverySheet(deliveryId: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/google-sheets/create-delivery-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ deliveryId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  [エラー] 納品書作成失敗: ${error}`);
      return null;
    }

    const data = await response.json();
    return data.spreadsheetUrl || data.sheetUrl || 'URL不明';
  } catch (error) {
    console.error(`  [エラー] 納品書作成例外: ${error}`);
    return null;
  }
}

/**
 * 請求書を作成
 */
async function createInvoice(customerId: string, yearMonth: string, token: string): Promise<string | null> {
  try {
    // yearMonth (YYYY-MM) から startDate, endDate を計算
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = `${yearMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

    const response = await fetch(`${BASE_URL}/api/google-sheets/create-invoice-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ customerId, startDate, endDate }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  [エラー] 請求書作成失敗: ${error}`);
      return null;
    }

    const data = await response.json();
    return data.spreadsheetUrl || data.sheetUrl || 'URL不明';
  } catch (error) {
    console.error(`  [エラー] 請求書作成例外: ${error}`);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('納品書・請求書再生成スクリプト');
  console.log('========================================');
  console.log(`実行日時: ${new Date().toISOString()}`);
  console.log(`ベースURL: ${BASE_URL}`);

  // ログイン
  console.log('\n[1/4] ログイン中...');
  let token: string;
  try {
    token = await login();
    console.log('  ログイン成功');
  } catch (error) {
    console.error('  ログイン失敗:', error);
    return;
  }

  // 新規納品の納品書作成
  console.log('\n[2/4] 分割された納品の納品書を作成中...');

  for (const deliveryNumber of NEW_DELIVERY_NUMBERS) {
    const delivery = await prisma.delivery.findUnique({
      where: { deliveryNumber },
      include: { customer: true },
    });

    if (!delivery) {
      console.log(`  [警告] ${deliveryNumber}: 見つかりません`);
      continue;
    }

    console.log(`  処理中: ${deliveryNumber} (${delivery.customer.companyName}, ${delivery.deliveryDate.toISOString().split('T')[0]})`);

    const url = await createDeliverySheet(delivery.id, token);
    if (url) {
      console.log(`    → 作成完了`);
    }

    // API制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 日付統一された納品の納品書を再作成（既存のGoogle Sheetを上書き）
  console.log('\n[3/4] 日付統一された納品の納品書を再作成中...');

  for (const deliveryNumber of UNIFIED_DELIVERY_NUMBERS) {
    const delivery = await prisma.delivery.findUnique({
      where: { deliveryNumber },
      include: { customer: true },
    });

    if (!delivery) {
      console.log(`  [警告] ${deliveryNumber}: 見つかりません`);
      continue;
    }

    console.log(`  処理中: ${deliveryNumber} (${delivery.customer.companyName}, ${delivery.deliveryDate.toISOString().split('T')[0]})`);

    const url = await createDeliverySheet(delivery.id, token);
    if (url) {
      console.log(`    → 再作成完了`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 影響を受けた顧客の請求書を再生成
  console.log('\n[4/4] 影響を受けた顧客の請求書を再生成中...');

  for (const customerInfo of AFFECTED_CUSTOMERS) {
    const customer = await prisma.customer.findFirst({
      where: { companyName: customerInfo.name },
    });

    if (!customer) {
      console.log(`  [警告] ${customerInfo.name}: 顧客が見つかりません`);
      continue;
    }

    for (const month of customerInfo.months) {
      console.log(`  処理中: ${customerInfo.name} (${month})`);

      const url = await createInvoice(customer.id, month, token);
      if (url) {
        console.log(`    → 請求書再生成完了`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n========================================');
  console.log('処理完了');
  console.log('========================================');
}

main()
  .catch((error) => {
    console.error('スクリプトエラー:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
