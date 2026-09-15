#!/usr/bin/env tsx
/**
 * バジル仕入是正 dryrunスクリプト（読み取り専用・書き込み一切なし）
 *
 * 対象:
 *  - Purchase 9袋: cmt0uo76p0003j2dac6v634eh
 *  - Purchase 6袋: cmt13rls20001bs9yu680mqdf
 *  - Delivery(ムスビ NORMAL 9袋): cmt11rfdw000465x77og9a4tg / item cmt11rfeq000c65x7kalc6u11
 *  - Delivery(ムスビ RETURN -6袋): cmt13g6zr0009qie3k7zk1ox5 / item cmt13g6zw000aqie3bbpt6vys
 *  - Delivery(クエスト NORMAL 6袋): cmt13we1z000dqie3e9e8pgzk / item cmt13we2b000jqie303wib57t
 *
 * このスクリプトは変更を一切適用しません。現状値と、適用予定の変更後の値を
 * 突き合わせて表示するのみです。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PURCHASE_9 = 'cmt0uo76p0003j2dac6v634eh';
const PURCHASE_6 = 'cmt13rls20001bs9yu680mqdf';

const MUSUBI_NORMAL_DELIVERY = 'cmt11rfdw000465x77og9a4tg';
const MUSUBI_NORMAL_ITEM = 'cmt11rfeq000c65x7kalc6u11';

const MUSUBI_RETURN_DELIVERY = 'cmt13g6zr0009qie3k7zk1ox5';
const MUSUBI_RETURN_ITEM = 'cmt13g6zw000aqie3bbpt6vys';

const QUEST_NORMAL_DELIVERY = 'cmt13we1z000dqie3e9e8pgzk';
const QUEST_NORMAL_ITEM = 'cmt13we2b000jqie303wib57t';

function fmtP(p: { id: string; quantity: number; price: number; remainingQuantity: number; status: string } | null) {
  if (!p) return '(見つかりません)';
  return `quantity=${p.quantity} / price=${p.price} / remainingQuantity=${p.remainingQuantity} / status=${p.status}`;
}

async function main() {
  console.log('█'.repeat(78));
  console.log('█ バジル仕入是正 dryrun（書き込みなし）');
  console.log('█'.repeat(78));

  // ---------------------------------------------------------------
  // 現状取得
  // ---------------------------------------------------------------
  const purchase9Before = await prisma.purchase.findUnique({ where: { id: PURCHASE_9 } });
  const purchase6Before = await prisma.purchase.findUnique({ where: { id: PURCHASE_6 } });

  const musubiDelivery = await prisma.delivery.findUnique({
    where: { id: MUSUBI_NORMAL_DELIVERY },
    include: { items: true },
  });
  const musubiReturnDelivery = await prisma.delivery.findUnique({
    where: { id: MUSUBI_RETURN_DELIVERY },
    include: { items: true },
  });
  const questDelivery = await prisma.delivery.findUnique({
    where: { id: QUEST_NORMAL_DELIVERY },
    include: { items: true },
  });

  if (!purchase9Before || !purchase6Before || !musubiDelivery || !musubiReturnDelivery || !questDelivery) {
    console.error('❌ 対象レコードが見つかりません。IDを再確認してください。');
    console.error({
      purchase9: !!purchase9Before,
      purchase6: !!purchase6Before,
      musubiDelivery: !!musubiDelivery,
      musubiReturnDelivery: !!musubiReturnDelivery,
      questDelivery: !!questDelivery,
    });
    await prisma.$disconnect();
    process.exit(1);
  }

  const musubiItemBefore = musubiDelivery.items.find((i) => i.id === MUSUBI_NORMAL_ITEM);
  const questItemBefore = questDelivery.items.find((i) => i.id === QUEST_NORMAL_ITEM);
  const returnItemBefore = musubiReturnDelivery.items.find((i) => i.id === MUSUBI_RETURN_ITEM);

  if (!musubiItemBefore || !questItemBefore || !returnItemBefore) {
    console.error('❌ 対象DeliveryItemが見つかりません。IDを再確認してください。');
    await prisma.$disconnect();
    process.exit(1);
  }

  // ---------------------------------------------------------------
  // 【1】Purchase 変更前後
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('【1】Purchase: 変更前 → 変更後（想定）');
  console.log('='.repeat(78));

  console.log(`\n[9袋Purchase] id=${PURCHASE_9}`);
  console.log(`  変更前: ${fmtP(purchase9Before)}`);
  // 3(ムスビ修正後) + 6(クエスト付替え後) = 9 消費 → remainingQuantity=0, status=USED（現状と同値のはず）
  const purchase9ExpectedRemaining = purchase9Before.quantity - (3 + 6);
  const purchase9ExpectedStatus =
    purchase9ExpectedRemaining === 0 ? 'USED' : purchase9ExpectedRemaining < purchase9Before.quantity ? 'PARTIAL' : 'UNUSED';
  console.log(
    `  変更後(想定): quantity=${purchase9Before.quantity} / price=${purchase9Before.price} / remainingQuantity=${purchase9ExpectedRemaining} / status=${purchase9ExpectedStatus}`
  );
  if (purchase9ExpectedRemaining !== purchase9Before.remainingQuantity || purchase9ExpectedStatus !== purchase9Before.status) {
    console.log(`  ⚠️ remainingQuantity/statusの再計算値が現状と異なります。apply時に更新が必要です。`);
  } else {
    console.log(`  → remainingQuantity/statusは現状と同値のため、apply時も変更不要（念のため再設定はする）。`);
  }

  console.log(`\n[6袋Purchase] id=${PURCHASE_6}`);
  console.log(`  変更前: ${fmtP(purchase6Before)}`);
  console.log(`  変更後(想定): レコード削除`);

  // ---------------------------------------------------------------
  // 【2】対象3納品: totalAmount 変更前後
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('【2】Delivery.totalAmount: 変更前 → 変更後（想定）');
  console.log('='.repeat(78));

  const musubiOtherItemsSum = musubiDelivery.items
    .filter((i) => i.id !== MUSUBI_NORMAL_ITEM)
    .reduce((s, i) => s + i.amount, 0);
  const musubiNewItemAmount = 3 * musubiItemBefore.unitPrice; // 3袋 × 単価150
  const musubiNewTotal = musubiOtherItemsSum + musubiNewItemAmount;

  console.log(`\n[ムスビ NORMAL納品] id=${MUSUBI_NORMAL_DELIVERY} (${musubiDelivery.deliveryNumber})`);
  console.log(`  変更前 totalAmount: ${musubiDelivery.totalAmount}`);
  console.log(`  バジル明細  変更前: quantity=${musubiItemBefore.quantity} unitPrice=${musubiItemBefore.unitPrice} amount=${musubiItemBefore.amount}`);
  console.log(`  バジル明細  変更後(想定): quantity=3 unitPrice=${musubiItemBefore.unitPrice} amount=${musubiNewItemAmount}`);
  console.log(`  他14品目合計（不変のはず）: ${musubiOtherItemsSum}`);
  console.log(`  変更後 totalAmount(想定): ${musubiNewTotal}`);

  console.log(`\n[ムスビ RETURN納品] id=${MUSUBI_RETURN_DELIVERY} (${musubiReturnDelivery.deliveryNumber})`);
  console.log(`  変更前: totalAmount=${musubiReturnDelivery.totalAmount}, item件数=${musubiReturnDelivery.items.length}`);
  console.log(`  変更後(想定): Delivery/DeliveryItemとも削除`);

  console.log(`\n[クエスト NORMAL納品] id=${QUEST_NORMAL_DELIVERY} (${questDelivery.deliveryNumber})`);
  console.log(`  変更前 totalAmount: ${questDelivery.totalAmount}`);
  console.log(`  バジル明細 変更前: purchaseId=${questItemBefore.purchaseId} quantity=${questItemBefore.quantity} amount=${questItemBefore.amount}`);
  console.log(`  バジル明細 変更後(想定): purchaseId=${PURCHASE_9}（quantity/amountは不変）`);
  console.log(`  変更後 totalAmount(想定): ${questDelivery.totalAmount}（不変）`);

  // ---------------------------------------------------------------
  // 【3】混載されている他品目が一切変化しないことの確認
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('【3】混載他品目の不変確認（ムスビ14品目・クエスト7品目）');
  console.log('='.repeat(78));

  const musubiOtherItems = musubiDelivery.items.filter((i) => i.id !== MUSUBI_NORMAL_ITEM);
  console.log(`\nムスビNORMAL納品 他品目: ${musubiOtherItems.length}件（対象外＝変更されない想定）`);
  for (const i of musubiOtherItems) {
    console.log(`  id=${i.id} purchaseId=${i.purchaseId} quantity=${i.quantity} unitPrice=${i.unitPrice} amount=${i.amount}`);
  }
  if (musubiOtherItems.length !== 14) {
    console.log(`  ⚠️ 想定件数(14)と異なります: 実際=${musubiOtherItems.length}`);
  } else {
    console.log('  ✅ 件数想定どおり(14件)。applyスクリプトはこれらのidに一切触れません。');
  }

  const questOtherItems = questDelivery.items.filter((i) => i.id !== QUEST_NORMAL_ITEM);
  console.log(`\nクエストNORMAL納品 他品目: ${questOtherItems.length}件（対象外＝変更されない想定）`);
  for (const i of questOtherItems) {
    console.log(`  id=${i.id} purchaseId=${i.purchaseId} quantity=${i.quantity} unitPrice=${i.unitPrice} amount=${i.amount}`);
  }
  if (questOtherItems.length !== 7) {
    console.log(`  ⚠️ 想定件数(7)と異なります: 実際=${questOtherItems.length}`);
  } else {
    console.log('  ✅ 件数想定どおり(7件)。applyスクリプトはこれらのidに一切触れません。');
  }

  // ---------------------------------------------------------------
  // 【4】バジル関連DeliveryItem全件（変更前の最終スナップショット）
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('【4】バジル関連 DeliveryItem 全件（現状スナップショット）');
  console.log('='.repeat(78));

  const allBasilItems = await prisma.deliveryItem.findMany({
    where: {
      OR: [
        { purchaseId: { in: [PURCHASE_9, PURCHASE_6] } },
        { productName: { contains: 'バジル' } },
      ],
    },
    include: {
      delivery: { select: { id: true, deliveryNumber: true, type: true, status: true, deliveryDate: true, customer: { select: { companyName: true } } } },
    },
  });

  console.log(`件数: ${allBasilItems.length}`);
  for (const i of allBasilItems) {
    console.log(
      `  itemId=${i.id} | purchaseId=${i.purchaseId ?? 'NULL'} | 顧客=${i.delivery.customer?.companyName} | 納品日=${i.delivery.deliveryDate.toISOString().split('T')[0]} | ` +
      `type=${i.delivery.type} | status=${i.delivery.status} | quantity=${i.quantity} | unitPrice=${i.unitPrice} | amount=${i.amount} | deliveryId=${i.delivery.id}`
    );
  }

  // ---------------------------------------------------------------
  // 【5】適用予定の操作一覧（実行はしない）
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('【5】applyスクリプトで実行予定の操作（このdryrunでは未実行）');
  console.log('='.repeat(78));
  console.log(`
  1. prisma.deliveryItem.update({ where: { id: '${MUSUBI_NORMAL_ITEM}' }, data: { quantity: 3, amount: ${musubiNewItemAmount} } })
  2. prisma.delivery.update({ where: { id: '${MUSUBI_NORMAL_DELIVERY}' }, data: { totalAmount: ${musubiNewTotal} } })
  3. prisma.deliveryItem.delete({ where: { id: '${MUSUBI_RETURN_ITEM}' } })   // API経由ではなく直接削除
  4. prisma.delivery.delete({ where: { id: '${MUSUBI_RETURN_DELIVERY}' } })   // API経由ではなく直接削除
  5. prisma.deliveryItem.update({ where: { id: '${QUEST_NORMAL_ITEM}' }, data: { purchaseId: '${PURCHASE_9}' } })
  6. prisma.purchase.delete({ where: { id: '${PURCHASE_6}' } })
  7. prisma.purchase.update({ where: { id: '${PURCHASE_9}' }, data: { remainingQuantity: ${purchase9ExpectedRemaining}, status: '${purchase9ExpectedStatus}' } })

  ※ すべて prisma.$transaction([...]) 内で実行し、途中失敗時は全体ロールバック。
  ※ DELETE /api/deliveries/[id] や PUT /api/deliveries/[id] は一切呼び出さない
    （このAPIは delivery.type を無視して remainingQuantity を増減させるバグがあるため）。
`);

  console.log('='.repeat(78));
  console.log('dryrun完了（書き込みは一切行っていません）');
  console.log('='.repeat(78));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ エラー:', e);
  await prisma.$disconnect();
  process.exit(1);
});
