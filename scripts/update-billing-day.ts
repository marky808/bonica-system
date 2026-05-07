/**
 * 顧客の締め日（billingDay）を更新するスクリプト
 *
 * 使用方法:
 * DATABASE_URL=... npx tsx scripts/update-billing-day.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customerId = 'cmiy2omxc0001oxw81ttt7xui';
  const newBillingDay = 20;

  console.log('=== 締め日更新スクリプト ===\n');

  // 更新前の確認
  const before = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      companyName: true,
      billingDay: true,
    },
  });

  if (!before) {
    console.error(`エラー: 顧客ID ${customerId} が見つかりません`);
    process.exit(1);
  }

  console.log('【更新前】');
  console.log(`  顧客ID: ${before.id}`);
  console.log(`  会社名: ${before.companyName}`);
  console.log(`  締め日: ${before.billingDay}日`);
  console.log('');

  // 更新実行
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { billingDay: newBillingDay },
    select: {
      id: true,
      companyName: true,
      billingDay: true,
      updatedAt: true,
    },
  });

  console.log('【更新後】');
  console.log(`  顧客ID: ${updated.id}`);
  console.log(`  会社名: ${updated.companyName}`);
  console.log(`  締め日: ${updated.billingDay}日`);
  console.log(`  更新日時: ${updated.updatedAt.toISOString()}`);
  console.log('');
  console.log('✓ 締め日の更新が完了しました');
}

main()
  .catch((e) => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
