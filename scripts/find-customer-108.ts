#!/usr/bin/env tsx
/**
 * 「108」社の検索（全顧客一覧表示）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 全顧客一覧:');
  console.log('='.repeat(60));
  const all = await prisma.customer.findMany({
    select: { id: true, companyName: true, billingDay: true },
    orderBy: { companyName: 'asc' },
  });
  all.forEach((c) => console.log(`  - ${c.companyName} (id: ${c.id}, 締め: ${c.billingDay})`));
  console.log(`\n合計: ${all.length}件`);
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
