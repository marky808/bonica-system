#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deliveryIds = [
    'cmt11rfdw000465x77og9a4tg', // Musubi NORMAL 9袋
    'cmt13g6zr0009qie3k7zk1ox5', // Musubi RETURN -6袋
    'cmt13we1z000dqie3e9e8pgzk', // Quest NORMAL 6袋
  ];

  for (const id of deliveryIds) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { items: true, customer: { select: { companyName: true } } },
    });
    if (!delivery) {
      console.log(`${id}: 見つかりません`);
      continue;
    }
    console.log('='.repeat(70));
    console.log(`deliveryId=${delivery.id} deliveryNumber=${delivery.deliveryNumber}`);
    console.log(`顧客=${delivery.customer.companyName} 納品日=${delivery.deliveryDate.toISOString().split('T')[0]} type=${delivery.type} status=${delivery.status}`);
    console.log(`totalAmount=${delivery.totalAmount} freeeDeliverySlipId=${delivery.freeeDeliverySlipId ?? 'なし'} freeeInvoiceId=${delivery.freeeInvoiceId ?? 'なし'}`);
    console.log(`googleSheetId=${delivery.googleSheetId ?? 'なし'}`);
    console.log(`アイテム件数: ${delivery.items.length}`);
    for (const item of delivery.items) {
      console.log(`  - id=${item.id} productName=${item.productName ?? '(purchase由来)'} purchaseId=${item.purchaseId ?? 'NULL'} quantity=${item.quantity} unitPrice=${item.unitPrice} amount=${item.amount}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ERR', e);
  await prisma.$disconnect();
  process.exit(1);
});
