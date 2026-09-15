#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmt11rfdw000465x77og9a4tg',
    'cmt13g6zr0009qie3k7zk1ox5',
    'cmt13we1z000dqie3e9e8pgzk',
  ];
  const invoices = await prisma.invoice.findMany();
  console.log('総Invoice件数:', invoices.length);
  const hits = invoices.filter((inv) => ids.some((id) => inv.deliveryIds.includes(id)));
  console.log('マッチしたInvoice件数:', hits.length);
  for (const inv of hits) {
    console.log(inv.id, inv.invoice_number, inv.status, inv.deliveryIds);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERR', e);
  await prisma.$disconnect();
  process.exit(1);
});
