#!/usr/bin/env tsx
/**
 * 赤伝(RETURN)件数調査スクリプト（読み取り専用）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const returnDeliveryCount = await prisma.delivery.count({
    where: { type: 'RETURN' },
  });

  const returnDeliveryItemCount = await prisma.deliveryItem.count({
    where: { delivery: { type: 'RETURN' } },
  });

  const totalDeliveryCount = await prisma.delivery.count();

  console.log('=== 赤伝(RETURN) 件数調査 ===');
  console.log('全納品(Delivery)件数:', totalDeliveryCount);
  console.log('RETURN種別のDelivery件数:', returnDeliveryCount);
  console.log('RETURNに属するDeliveryItem件数:', returnDeliveryItemCount);

  if (returnDeliveryCount > 0) {
    const samples = await prisma.delivery.findMany({
      where: { type: 'RETURN' },
      take: 5,
      select: {
        id: true,
        deliveryDate: true,
        totalAmount: true,
        returnReason: true,
        originalDeliveryId: true,
        status: true,
        customer: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('サンプル(最新5件):', JSON.stringify(samples, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
