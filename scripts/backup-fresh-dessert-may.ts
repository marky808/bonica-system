#!/usr/bin/env tsx
/**
 * フレッシュデザート5月分請求書修復前のバックアップ（読み取り専用、JSON出力）
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  const customerId = 'cml9b8jth0001w2bwqs8eimpd';

  const invoices = await prisma.invoice.findMany({
    where: { customerId, year: 2026, month: 5 },
  });

  const deliveries = await prisma.delivery.findMany({
    where: {
      customerId,
      deliveryDate: { gte: new Date('2026-04-30T15:00:00.000Z'), lte: new Date('2026-05-31T14:59:59.999Z') },
    },
    include: { items: true },
  });

  const backup = {
    takenAt: new Date().toISOString(),
    customerId,
    invoices,
    deliveries,
  };

  const path = `${process.env.TEMP || '.'}/fresh-dessert-may-backup-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2), 'utf-8');
  console.log('Backup written to:', path);
  console.log('Invoices backed up:', invoices.length);
  console.log('Deliveries backed up:', deliveries.length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
