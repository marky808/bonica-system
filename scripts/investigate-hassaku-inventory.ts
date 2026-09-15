#!/usr/bin/env tsx
/**
 * 八朔 在庫調査スクリプト（読み取り専用・書き込み一切なし）
 *
 * 目的:
 * - 商品名に「八朔」を含むPurchaseレコードを全件抽出
 * - 各Purchaseに紐づくDeliveryItemを集計し、実際の使用済み数量を算出
 * - quantity - remainingQuantity と 納品明細実合計の照合
 * - 赤伝(RETURN)分の計上状況を明示
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('█'.repeat(70));
  console.log('█ 八朔 Purchase調査（読み取り専用）');
  console.log('█'.repeat(70));

  // 1. 商品名に「八朔」を含むPurchaseレコードを全件抽出
  const purchases = await prisma.purchase.findMany({
    where: {
      OR: [
        { productName: { contains: '八朔' } },
        { productName: { contains: 'はっさく' } },
        { productName: { contains: 'ハッサク' } },
      ],
    },
    include: {
      supplier: { select: { companyName: true } },
      category: { select: { name: true } },
      deliveryItems: {
        include: {
          delivery: {
            select: {
              id: true,
              deliveryNumber: true,
              deliveryDate: true,
              status: true,
              type: true,
              customerId: true,
              customer: { select: { companyName: true } },
            },
          },
        },
      },
    },
    orderBy: { purchaseDate: 'asc' },
  });

  console.log(`\n対象Purchase件数: ${purchases.length}\n`);

  if (purchases.length === 0) {
    console.log('該当するPurchaseレコードが見つかりませんでした。');
    await prisma.$disconnect();
    return;
  }

  // ---- 1. 一覧出力 ----
  console.log('='.repeat(70));
  console.log('【1】Purchaseレコード一覧');
  console.log('='.repeat(70));

  for (const p of purchases) {
    console.log('-'.repeat(70));
    console.log(`id               : ${p.id}`);
    console.log(`productName      : ${p.productName}`);
    console.log(`category         : ${p.category?.name ?? '(なし)'}`);
    console.log(`仕入日           : ${p.purchaseDate.toISOString().split('T')[0]}`);
    console.log(`仕入先           : ${p.supplier?.companyName ?? '(なし)'}`);
    console.log(`unit             : ${p.unit}`);
    console.log(`quantity         : ${p.quantity}`);
    console.log(`unitPrice        : ${p.unitPrice}`);
    console.log(`price            : ${p.price}`);
    console.log(`remainingQuantity: ${p.remainingQuantity}`);
    console.log(`status           : ${p.status}`);
    console.log(`notes            : ${p.notes ?? '(なし)'}`);
  }

  // ---- 2. DeliveryItem集計 ----
  console.log('\n' + '='.repeat(70));
  console.log('【2】DeliveryItem集計（Purchaseごと）');
  console.log('='.repeat(70));

  let grandTotalByDeliveryStatus: Record<string, number> = {};
  let grandTotalByDeliveryType: Record<string, number> = {};

  for (const p of purchases) {
    console.log('-'.repeat(70));
    console.log(`Purchase id: ${p.id} (${p.productName} / ${p.quantity}${p.unit})`);
    console.log(`  紐づくDeliveryItem件数: ${p.deliveryItems.length}`);

    if (p.deliveryItems.length === 0) {
      console.log('  (納品明細なし)');
      continue;
    }

    // status別・type別に分けて集計
    const byStatus: Record<string, { qty: number; count: number }> = {};
    const byType: Record<string, { qty: number; count: number }> = {};

    for (const di of p.deliveryItems) {
      const st = di.delivery.status;
      const tp = di.delivery.type;

      if (!byStatus[st]) byStatus[st] = { qty: 0, count: 0 };
      byStatus[st].qty += di.quantity;
      byStatus[st].count += 1;

      if (!byType[tp]) byType[tp] = { qty: 0, count: 0 };
      byType[tp].qty += di.quantity;
      byType[tp].count += 1;

      grandTotalByDeliveryStatus[st] = (grandTotalByDeliveryStatus[st] ?? 0) + di.quantity;
      grandTotalByDeliveryType[tp] = (grandTotalByDeliveryType[tp] ?? 0) + di.quantity;
    }

    console.log('  --- status別内訳 ---');
    for (const [st, v] of Object.entries(byStatus)) {
      console.log(`    ${st}: 数量合計=${v.qty} (${v.count}件)`);
    }
    console.log('  --- type別内訳（NORMAL/RETURN=赤伝） ---');
    for (const [tp, v] of Object.entries(byType)) {
      console.log(`    ${tp}: 数量合計=${v.qty} (${v.count}件)`);
    }

    // 明細詳細（デバッグ用に個別表示）
    console.log('  --- 明細詳細 ---');
    for (const di of p.deliveryItems) {
      console.log(
        `    deliveryItemId=${di.id} | deliveryId=${di.delivery.id} | deliveryNumber=${di.delivery.deliveryNumber ?? '(なし)'} | ` +
        `納品日=${di.delivery.deliveryDate.toISOString().split('T')[0]} | 顧客=${di.delivery.customer?.companyName ?? '(不明)'} | ` +
        `status=${di.delivery.status} | type=${di.delivery.type} | quantity=${di.quantity} | unitPrice=${di.unitPrice} | amount=${di.amount}`
      );
    }
  }

  console.log('\n--- 全Purchase合算: status別 ---');
  for (const [st, qty] of Object.entries(grandTotalByDeliveryStatus)) {
    console.log(`  ${st}: ${qty}`);
  }
  console.log('--- 全Purchase合算: type別（赤伝の計上状況） ---');
  for (const [tp, qty] of Object.entries(grandTotalByDeliveryType)) {
    console.log(`  ${tp}: ${qty}`);
  }

  // ---- 3. 照合 ----
  console.log('\n' + '='.repeat(70));
  console.log('【3】quantity - remainingQuantity と 納品明細実合計の照合');
  console.log('='.repeat(70));

  let anyMismatch = false;

  for (const p of purchases) {
    const calcUsed = p.quantity - p.remainingQuantity;

    // 実合計（全DeliveryItemの数量合計。RETURNはマイナス数量で保存されている点に注意）
    const actualDeliveredSum = p.deliveryItems.reduce((sum, di) => sum + di.quantity, 0);

    // NORMAL納品のみ（実際に在庫を減算する対象。RETURNは在庫を変動させない設計）
    const normalOnlySum = p.deliveryItems
      .filter((di) => di.delivery.type === 'NORMAL')
      .reduce((sum, di) => sum + di.quantity, 0);

    const diffVsAll = Math.abs(calcUsed - actualDeliveredSum);
    const diffVsNormalOnly = Math.abs(calcUsed - normalOnlySum);

    console.log('-'.repeat(70));
    console.log(`Purchase id: ${p.id} (${p.productName})`);
    console.log(`  quantity - remainingQuantity (=DB上の使用済み) : ${calcUsed}`);
    console.log(`  DeliveryItem数量合計（全type込み）              : ${actualDeliveredSum}`);
    console.log(`  DeliveryItem数量合計（NORMALのみ）               : ${normalOnlySum}`);

    if (diffVsNormalOnly > 0.001) {
      anyMismatch = true;
      console.log(`  ⚠️ ズレあり（NORMAL基準との差分）: ${(calcUsed - normalOnlySum).toFixed(2)}`);
    } else {
      console.log('  ✅ NORMAL納品合計と一致');
    }

    if (diffVsAll > 0.001 && Object.keys(grandTotalByDeliveryType).length > 0) {
      console.log(`  参考: 全type込み合計との差分: ${(calcUsed - actualDeliveredSum).toFixed(2)}`);
    }
  }

  if (!anyMismatch) {
    console.log('\n✅ 全レコードで remainingQuantity は納品実績（NORMAL）と整合しています。');
  } else {
    console.log('\n⚠️ 一部レコードでズレが検出されました（上記参照）。');
  }

  console.log('\n' + '='.repeat(70));
  console.log('調査完了（書き込みは一切行っていません）');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ エラー:', e);
  await prisma.$disconnect();
  process.exit(1);
});
