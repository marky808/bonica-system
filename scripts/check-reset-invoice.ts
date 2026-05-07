import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.vercel.production' });

const prisma = new PrismaClient();

async function main() {
  const customerId = 'cmiy2omxc0001oxw81ttt7xui';
  const lemonPurchaseId = 'cmjm7pr6x0001uw7zif2euhc2'; // 12月25日のレモン

  // 1. レモンの仕入れ情報を取得
  const lemonPurchase = await prisma.purchase.findUnique({
    where: { id: lemonPurchaseId }
  });

  if (!lemonPurchase) {
    console.log('レモンの仕入れが見つかりません');
    return;
  }

  console.log('レモン仕入れ:', lemonPurchase.productName, lemonPurchase.quantity, lemonPurchase.unit);
  console.log('残数:', lemonPurchase.remainingQuantity);

  // 2. 納品番号を生成
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const deliveryNumber = `DEL-${timestamp}`;

  // 3. 納品を作成（12月26日付け）
  const quantity = 3;
  const unitPrice = 150; // 販売単価（仮）
  const taxRate = 8;
  const subtotal = quantity * unitPrice;
  const taxAmount = Math.floor(subtotal * taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const delivery = await prisma.delivery.create({
    data: {
      deliveryNumber: deliveryNumber,
      customerId: customerId,
      deliveryDate: new Date('2025-12-26T00:00:00.000Z'),
      status: 'DELIVERED',
      totalAmount: totalAmount,
      inputMode: 'NORMAL',
      purchaseLinkStatus: 'LINKED',
      items: {
        create: [{
          purchase: { connect: { id: lemonPurchaseId } },
          productName: lemonPurchase.productName,
          quantity: quantity,
          unit: lemonPurchase.unit,
          unitPrice: unitPrice,
          taxRate: taxRate,
          amount: totalAmount
        }]
      }
    }
  });

  console.log('\n納品登録完了:', delivery.id);
  console.log('納品番号:', deliveryNumber);
  console.log('合計金額:', totalAmount);

  // 4. 仕入れの残数を更新
  await prisma.purchase.update({
    where: { id: lemonPurchaseId },
    data: {
      remainingQuantity: lemonPurchase.remainingQuantity - quantity
    }
  });

  console.log('仕入れ残数更新: ', lemonPurchase.remainingQuantity, '->', lemonPurchase.remainingQuantity - quantity);

  // 5. 既存の請求書を削除
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      customerId: customerId,
      year: 2026,
      month: 1
    }
  });

  if (existingInvoice) {
    await prisma.invoice.delete({ where: { id: existingInvoice.id } });
    console.log('\n既存請求書を削除:', existingInvoice.invoice_number);
  }

  // 6. INVOICEDをDELIVEREDにリセット
  const resetResult = await prisma.delivery.updateMany({
    where: {
      customerId: customerId,
      status: 'INVOICED'
    },
    data: {
      status: 'DELIVERED'
    }
  });

  console.log('納品ステータスをリセット:', resetResult.count, '件');

  // 確認
  const deliveredCount = await prisma.delivery.count({
    where: { customerId: customerId, status: 'DELIVERED' }
  });
  console.log('\nDELIVERED状態の納品:', deliveredCount, '件');
}

main().finally(() => prisma.$disconnect());
