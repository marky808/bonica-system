/**
 * 納品日付の不整合を調査するスクリプト
 *
 * 調査項目:
 * 1. Delivery.deliveryDate と DeliveryItem.deliveryDate が異なるケース
 * 2. 1つの納品に異なる日付の明細が混在しているケース
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DateInconsistency {
  deliveryId: string;
  deliveryNumber: string | null;
  customerName: string;
  deliveryDeliveryDate: Date;
  itemDates: { itemId: string; itemDeliveryDate: Date | null; productName: string }[];
  problemTypes: string[];
}

async function checkDeliveryDateInconsistency() {
  console.log('='.repeat(80));
  console.log('納品日付の不整合調査');
  console.log('='.repeat(80));
  console.log();

  // 全ての納品とその明細を取得
  const deliveries = await prisma.delivery.findMany({
    include: {
      customer: true,
      items: {
        include: {
          purchase: true,
        },
      },
    },
    orderBy: {
      deliveryDate: 'desc',
    },
  });

  const inconsistencies: DateInconsistency[] = [];

  for (const delivery of deliveries) {
    const problemTypes: string[] = [];
    const deliveryDateStr = delivery.deliveryDate.toISOString().split('T')[0];

    // 問題1: Delivery.deliveryDate と Item.deliveryDate が異なるケース
    const itemsWithDifferentDate = delivery.items.filter((item) => {
      if (!item.deliveryDate) return false;
      const itemDateStr = item.deliveryDate.toISOString().split('T')[0];
      return itemDateStr !== deliveryDateStr;
    });

    if (itemsWithDifferentDate.length > 0) {
      problemTypes.push('1: Delivery.deliveryDateとItem.deliveryDateが異なる');
    }

    // 問題2: 1つの納品に異なる日付の明細が混在しているケース
    const itemDatesWithValues = delivery.items
      .filter((item) => item.deliveryDate !== null)
      .map((item) => item.deliveryDate!.toISOString().split('T')[0]);

    const uniqueItemDates = [...new Set(itemDatesWithValues)];

    if (uniqueItemDates.length > 1) {
      problemTypes.push('2: 1つの納品に異なる日付の明細が混在');
    }

    // 問題がある場合は記録
    if (problemTypes.length > 0) {
      inconsistencies.push({
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        customerName: delivery.customer.companyName,
        deliveryDeliveryDate: delivery.deliveryDate,
        itemDates: delivery.items.map((item) => ({
          itemId: item.id,
          itemDeliveryDate: item.deliveryDate,
          productName: item.purchase?.productName || item.productName || '(不明)',
        })),
        problemTypes,
      });
    }
  }

  // 結果の出力
  console.log(`総納品数: ${deliveries.length}`);
  console.log(`問題のある納品数: ${inconsistencies.length}`);
  console.log();

  if (inconsistencies.length === 0) {
    console.log('問題のあるデータは見つかりませんでした。');
    return;
  }

  console.log('-'.repeat(80));
  console.log('問題のある納品一覧');
  console.log('-'.repeat(80));
  console.log();

  for (const inc of inconsistencies) {
    console.log(`【納品ID】: ${inc.deliveryId}`);
    console.log(`【納品番号】: ${inc.deliveryNumber || '(未設定)'}`);
    console.log(`【顧客名】: ${inc.customerName}`);
    console.log(`【Delivery.deliveryDate】: ${inc.deliveryDeliveryDate.toISOString().split('T')[0]}`);
    console.log(`【問題の種類】: ${inc.problemTypes.join(', ')}`);
    console.log(`【明細一覧】:`);

    for (const item of inc.itemDates) {
      const itemDateStr = item.itemDeliveryDate
        ? item.itemDeliveryDate.toISOString().split('T')[0]
        : '(null)';
      const mismatch = item.itemDeliveryDate
        && item.itemDeliveryDate.toISOString().split('T')[0] !== inc.deliveryDeliveryDate.toISOString().split('T')[0]
        ? ' ← 不一致'
        : '';
      console.log(`  - ${item.productName}: ${itemDateStr}${mismatch}`);
    }
    console.log();
    console.log('-'.repeat(80));
    console.log();
  }

  // サマリー
  console.log('='.repeat(80));
  console.log('サマリー');
  console.log('='.repeat(80));

  const problem1Count = inconsistencies.filter(i =>
    i.problemTypes.some(p => p.startsWith('1:'))
  ).length;

  const problem2Count = inconsistencies.filter(i =>
    i.problemTypes.some(p => p.startsWith('2:'))
  ).length;

  const bothCount = inconsistencies.filter(i =>
    i.problemTypes.length === 2
  ).length;

  console.log(`問題1（Delivery.deliveryDateとItem.deliveryDateが異なる）: ${problem1Count}件`);
  console.log(`問題2（1つの納品に異なる日付の明細が混在）: ${problem2Count}件`);
  console.log(`両方の問題がある納品: ${bothCount}件`);
}

async function main() {
  try {
    await checkDeliveryDateInconsistency();
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
