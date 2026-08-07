#!/usr/bin/env tsx
/**
 * 唯一の赤伝(RETURN)レコードの明細詳細調査（読み取り専用）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const delivery = await prisma.delivery.findFirst({
    where: { type: 'RETURN' },
    include: {
      items: {
        select: {
          id: true,
          purchaseId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          amount: true,
        },
      },
      originalDelivery: {
        select: { id: true, inputMode: true, status: true, deliveryDate: true },
      },
    },
  });

  console.log(JSON.stringify(delivery, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
