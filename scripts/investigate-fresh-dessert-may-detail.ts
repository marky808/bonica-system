#!/usr/bin/env tsx
/**
 * フレッシュデザート 5月分請求書 重複調査（詳細・読み取り専用）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customerId = 'cml9b8jth0001w2bwqs8eimpd';

  const invoices = await prisma.invoice.findMany({
    where: { customerId, year: 2026, month: 5 },
    orderBy: { invoiceDate: 'asc' },
  });

  console.log(`5月請求書: ${invoices.length}件\n`);

  for (const inv of invoices) {
    let ids: string[] = [];
    try { ids = JSON.parse(inv.deliveryIds); } catch {}

    console.log(`■ ${inv.invoice_number} (id=${inv.id})`);
    console.log(`  invoiceDate: ${inv.invoiceDate.toISOString()}`);
    console.log(`  totalAmount: ${inv.totalAmount}`);
    console.log(`  googleSheetUrl: ${inv.googleSheetUrl}`);
    console.log(`  sheetTabName: ${inv.sheetTabName}`);
    console.log(`  deliveryIds: ${JSON.stringify(ids)}`);

    if (ids.length > 0) {
      const items = await prisma.delivery.findMany({
        where: { id: { in: ids } },
        select: { id: true, deliveryNumber: true, status: true, deliveryDate: true, totalAmount: true },
      });
      console.log(`  現在のステータス:`);
      for (const item of items) {
        console.log(`    - ${item.deliveryNumber} (${item.deliveryDate.toISOString().split('T')[0]}, ¥${item.totalAmount}): ${item.status}`);
      }
    }
    console.log('');
  }

  // 5月期間内の全納品の現在のステータスと、どの請求書にも含まれていないか
  const allMayDeliveries = await prisma.delivery.findMany({
    where: {
      customerId,
      deliveryDate: { gte: new Date('2026-04-30T15:00:00.000Z'), lte: new Date('2026-05-31T14:59:59.999Z') },
    },
    orderBy: { deliveryDate: 'asc' },
    select: { id: true, deliveryNumber: true, status: true, deliveryDate: true, totalAmount: true },
  });

  const allInvoicedIds = new Set(
    invoices.flatMap(inv => { try { return JSON.parse(inv.deliveryIds) as string[] } catch { return [] } })
  );

  console.log('=== 5月期間内 全納品 vs いずれかの請求書に含まれるか ===');
  let sumAll = 0;
  for (const d of allMayDeliveries) {
    sumAll += d.totalAmount;
    const inAny = allInvoicedIds.has(d.id);
    console.log(`${d.deliveryNumber} (${d.deliveryDate.toISOString().split('T')[0]}, ¥${d.totalAmount}, status=${d.status}): いずれかの請求書に含まれる=${inAny}`);
  }
  console.log(`\n5月期間内納品の合計(税抜相当の単純合計): ¥${sumAll}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
