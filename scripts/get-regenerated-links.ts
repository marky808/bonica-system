/**
 * 再生成した納品書・請求書のリンクを取得するスクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 分割で新しく作成された納品番号
const NEW_DELIVERY_NUMBERS = [
  'DEL-58NDO9DC', 'DEL-V1697IPP',  // ICHINA 01/15, 01/22
  'DEL-Z6WHV7TZ', 'DEL-02D2HC0P',  // ICHINA 12/16, 12/17
  'DEL-6L1CN0MD', 'DEL-EFAYTFYZ', 'DEL-0ID1D6FJ',  // 株式会社一〇八 12/09, 12/27, 12/28
  'DEL-DRJLMMJJ', 'DEL-XE7V2LZE',  // 株式会社一〇八 12/02, 12/09
  'DEL-8IPF9K5D', 'DEL-GLA1JHAF',  // 株式会社一〇八 12/02, 12/09
  'DEL-AYOQ5HBS', 'DEL-FBJ2ETE6', 'DEL-RI9R7RMN',  // ファーストプロスパー 12/01, 12/15, 12/19
];

// 日付統一された納品番号
const UNIFIED_DELIVERY_NUMBERS = [
  'DEL-CMKKJ3G4',  // 鮨割烹「粋」
  'DEL-CMKG6S9N',  // いっとく
  'DEL-CMKOSBE7',  // ICHINA
];

async function main() {
  console.log('========================================');
  console.log('再生成した納品書・請求書のリンク一覧');
  console.log('========================================\n');

  // 分割された納品書
  console.log('【分割された納品の納品書】\n');

  for (const deliveryNumber of NEW_DELIVERY_NUMBERS) {
    const delivery = await prisma.delivery.findUnique({
      where: { deliveryNumber },
      include: { customer: true },
    });

    if (delivery) {
      const date = delivery.deliveryDate.toISOString().split('T')[0];
      const url = delivery.googleSheetId
        ? `https://docs.google.com/spreadsheets/d/${delivery.googleSheetId}`
        : '未作成';
      console.log(`${deliveryNumber} | ${delivery.customer.companyName} | ${date}`);
      console.log(`  → ${url}\n`);
    }
  }

  // 日付統一された納品書
  console.log('\n【日付統一された納品の納品書】\n');

  for (const deliveryNumber of UNIFIED_DELIVERY_NUMBERS) {
    const delivery = await prisma.delivery.findUnique({
      where: { deliveryNumber },
      include: { customer: true },
    });

    if (delivery) {
      const date = delivery.deliveryDate.toISOString().split('T')[0];
      const url = delivery.googleSheetId
        ? `https://docs.google.com/spreadsheets/d/${delivery.googleSheetId}`
        : '未作成';
      console.log(`${deliveryNumber} | ${delivery.customer.companyName} | ${date}`);
      console.log(`  → ${url}\n`);
    }
  }

  // 請求書（最新のもの）
  console.log('\n【再生成された請求書】\n');

  const customerNames = [
    'ICHINA',
    '株式会社　一〇八',
    '株式会社ファーストプロスパー',
    '鮨割烹　「粋」',
    'いっとく　',
  ];

  for (const name of customerNames) {
    const customer = await prisma.customer.findFirst({
      where: { companyName: name },
    });

    if (!customer) continue;

    // 最新の請求書を取得（今日作成されたもの）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: customer.id,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (invoices.length > 0) {
      console.log(`${name}:`);
      for (const invoice of invoices) {
        const period = `${invoice.year}年${invoice.month}月`;
        const url = invoice.googleSheetUrl || '未作成';
        console.log(`  ${period} | ${invoice.invoice_number}`);
        console.log(`  → ${url}\n`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
