#!/usr/bin/env tsx
/**
 * バジル（江川GF, 1/19仕入）調査スクリプト（読み取り専用・書き込み一切なし）
 *
 * 目的:
 * - 商品名に「バジル」を含むPurchaseレコードを全件抽出
 * - 各Purchaseに紐づくDeliveryItemを全件、顧客/納品日/type/数量/単価/statusで抽出
 * - 赤伝(RETURN)がどのPurchaseに紐づいているか
 * - quantity - remainingQuantity と 納品明細実合計の照合
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('█'.repeat(70));
  console.log('█ バジル Purchase調査（読み取り専用）');
  console.log('█'.repeat(70));

  const purchases = await prisma.purchase.findMany({
    where: {
      productName: { contains: 'バジル' },
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
              originalDeliveryId: true,
              returnReason: true,
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

  // ---- 1. Purchase一覧 ----
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
    console.log(`createdAt        : ${p.createdAt.toISOString()}`);
  }

  // ---- 2. DeliveryItem内訳 ----
  console.log('\n' + '='.repeat(70));
  console.log('【2】DeliveryItem内訳（Purchaseごと）');
  console.log('='.repeat(70));

  for (const p of purchases) {
    console.log('-'.repeat(70));
    console.log(`Purchase id: ${p.id} (${p.productName} / ${p.quantity}${p.unit} / 仕入日=${p.purchaseDate.toISOString().split('T')[0]})`);
    console.log(`  紐づくDeliveryItem件数: ${p.deliveryItems.length}`);

    if (p.deliveryItems.length === 0) {
      console.log('  (納品明細なし)');
      continue;
    }

    for (const di of p.deliveryItems) {
      console.log(
        `  - 顧客=${di.delivery.customer?.companyName ?? '(不明)'} | 納品日=${di.delivery.deliveryDate.toISOString().split('T')[0]} | ` +
        `type=${di.delivery.type} | 数量=${di.quantity} | 単価=${di.unitPrice} | 金額=${di.amount} | ` +
        `deliveryStatus=${di.delivery.status} | deliveryId=${di.delivery.id} | deliveryNumber=${di.delivery.deliveryNumber ?? '(なし)'} | ` +
        `originalDeliveryId=${di.delivery.originalDeliveryId ?? '(なし)'} | returnReason=${di.delivery.returnReason ?? '(なし)'} | ` +
        `deliveryItemId=${di.id} | purchaseId(FK)=${di.purchaseId ?? '(NULL)'}`
      );
    }
  }

  // ---- 3. 赤伝(RETURN)の紐づき ----
  console.log('\n' + '='.repeat(70));
  console.log('【3】赤伝(RETURN) DeliveryItem 一覧とpurchaseId紐づき状況');
  console.log('='.repeat(70));

  const allReturnItems = purchases.flatMap((p) =>
    p.deliveryItems
      .filter((di) => di.delivery.type === 'RETURN')
      .map((di) => ({ purchase: p, di }))
  );

  if (allReturnItems.length === 0) {
    console.log('（上記Purchaseに紐づく赤伝は見つかりませんでした）');
  } else {
    for (const { purchase, di } of allReturnItems) {
      console.log('-'.repeat(70));
      console.log(`  紐づくPurchase.id: ${purchase.id} (仕入日=${purchase.purchaseDate.toISOString().split('T')[0]}, quantity=${purchase.quantity})`);
      console.log(`  DeliveryItem.purchaseId (FK): ${di.purchaseId ?? '(NULL = 未紐付け)'}`);
      console.log(`  顧客=${di.delivery.customer?.companyName} | 納品日=${di.delivery.deliveryDate.toISOString().split('T')[0]} | 数量=${di.quantity} | 単価=${di.unitPrice} | 金額=${di.amount}`);
      console.log(`  deliveryId=${di.delivery.id} | deliveryNumber=${di.delivery.deliveryNumber ?? '(なし)'} | status=${di.delivery.status}`);
    }
  }

  // 念のため、DB全体（このPurchase群に紐づかない）でバジル関連の赤伝がないかも確認
  const allBasilReturnsAnyPurchase = await prisma.deliveryItem.findMany({
    where: {
      delivery: { type: 'RETURN' },
      OR: [
        { productName: { contains: 'バジル' } },
        { purchase: { productName: { contains: 'バジル' } } },
      ],
    },
    include: {
      delivery: { select: { id: true, deliveryNumber: true, deliveryDate: true, status: true, customer: { select: { companyName: true } } } },
      purchase: { select: { id: true, productName: true, purchaseDate: true } },
    },
  });

  console.log('\n--- DB全体を対象にした赤伝バジル検索（productName一致 or purchase.productName一致）---');
  console.log(`件数: ${allBasilReturnsAnyPurchase.length}`);
  for (const di of allBasilReturnsAnyPurchase) {
    console.log(
      `  deliveryItemId=${di.id} | productName(明細)=${di.productName ?? '(NULL)'} | purchaseId=${di.purchaseId ?? '(NULL)'} | ` +
      `紐づくPurchase=${di.purchase ? `${di.purchase.productName}(${di.purchase.purchaseDate.toISOString().split('T')[0]})` : '(なし)'} | ` +
      `顧客=${di.delivery.customer?.companyName} | 納品日=${di.delivery.deliveryDate.toISOString().split('T')[0]} | 数量=${di.quantity} | status=${di.delivery.status}`
    );
  }

  // ---- 4. 照合 ----
  console.log('\n' + '='.repeat(70));
  console.log('【4】quantity - remainingQuantity と 納品明細実合計の照合');
  console.log('='.repeat(70));

  let anyMismatch = false;

  for (const p of purchases) {
    const calcUsed = p.quantity - p.remainingQuantity;
    const actualDeliveredSum = p.deliveryItems.reduce((sum, di) => sum + di.quantity, 0);
    const normalOnlySum = p.deliveryItems
      .filter((di) => di.delivery.type === 'NORMAL')
      .reduce((sum, di) => sum + di.quantity, 0);
    const returnOnlySum = p.deliveryItems
      .filter((di) => di.delivery.type === 'RETURN')
      .reduce((sum, di) => sum + di.quantity, 0);

    console.log('-'.repeat(70));
    console.log(`Purchase id: ${p.id} (仕入日=${p.purchaseDate.toISOString().split('T')[0]}, quantity=${p.quantity})`);
    console.log(`  quantity - remainingQuantity (=DB上の使用済み) : ${calcUsed}`);
    console.log(`  DeliveryItem数量合計（NORMALのみ）               : ${normalOnlySum}`);
    console.log(`  DeliveryItem数量合計（RETURNのみ）               : ${returnOnlySum}`);
    console.log(`  DeliveryItem数量合計（全type込み）              : ${actualDeliveredSum}`);

    const diffVsNormalOnly = Math.abs(calcUsed - normalOnlySum);
    if (diffVsNormalOnly > 0.001) {
      anyMismatch = true;
      console.log(`  ⚠️ ズレあり（NORMAL基準との差分）: ${(calcUsed - normalOnlySum).toFixed(2)}`);
    } else {
      console.log('  ✅ NORMAL納品合計と一致');
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
