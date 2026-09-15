#!/usr/bin/env tsx
/**
 * バジル仕入是正 本実行スクリプト
 *
 * 前提: scripts/backup-basil-correction.ts でバックアップ済みであること。
 *
 * 実行内容（すべて prisma.$transaction 内・直接Prisma操作のみ。
 * DELETE/PUT /api/deliveries/[id] は一切使用しない）:
 *  1. ムスビNORMAL納品のバジル明細: quantity 9→3, amount 1350→450
 *  2. ムスビNORMAL納品の totalAmount: 10480→9580
 *  3. ムスビRETURN納品のDeliveryItemを削除
 *  4. ムスビRETURN納品のDeliveryを削除
 *  5. クエストNORMAL納品のバジル明細: purchaseId を6袋Purchase→9袋Purchaseへ付け替え
 *  6. 6袋Purchaseを削除
 *  7. 9袋Purchaseの remainingQuantity/status を再設定（0/USED、実質不変）
 *
 * 実行前に、dryrunで確認した現状値と一致するかをアサートし、
 * 一致しない場合は何もせず異常終了する（トランザクション未開始）。
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

async function main() {
  console.log('█'.repeat(78));
  console.log('█ バジル仕入是正 本実行');
  console.log('█'.repeat(78));

  // ---------------------------------------------------------------
  // 事前アサーション（dryrun時点の想定値と一致するか確認）
  // ---------------------------------------------------------------
  const [purchase9, purchase6, musubiDelivery, returnDelivery, questDelivery] = await Promise.all([
    prisma.purchase.findUniqueOrThrow({ where: { id: PURCHASE_9 } }),
    prisma.purchase.findUniqueOrThrow({ where: { id: PURCHASE_6 } }),
    prisma.delivery.findUniqueOrThrow({ where: { id: MUSUBI_NORMAL_DELIVERY }, include: { items: true } }),
    prisma.delivery.findUniqueOrThrow({ where: { id: MUSUBI_RETURN_DELIVERY }, include: { items: true } }),
    prisma.delivery.findUniqueOrThrow({ where: { id: QUEST_NORMAL_DELIVERY }, include: { items: true } }),
  ]);

  const musubiItem = musubiDelivery.items.find((i) => i.id === MUSUBI_NORMAL_ITEM);
  const returnItem = returnDelivery.items.find((i) => i.id === MUSUBI_RETURN_ITEM);
  const questItem = questDelivery.items.find((i) => i.id === QUEST_NORMAL_ITEM);

  const assertions: [boolean, string][] = [
    [purchase9.quantity === 9 && purchase9.remainingQuantity === 0 && purchase9.status === 'USED', '9袋Purchaseの現状値がdryrun時点と不一致'],
    [purchase6.quantity === 6 && purchase6.remainingQuantity === 0 && purchase6.status === 'USED', '6袋Purchaseの現状値がdryrun時点と不一致'],
    [musubiDelivery.totalAmount === 10480 && musubiDelivery.items.length === 15, 'ムスビNORMAL納品の現状値がdryrun時点と不一致'],
    [!!musubiItem && musubiItem.quantity === 9 && musubiItem.amount === 1350 && musubiItem.unitPrice === 150, 'ムスビNORMAL納品のバジル明細がdryrun時点と不一致'],
    [returnDelivery.type === 'RETURN' && returnDelivery.items.length === 1, 'ムスビRETURN納品の現状値がdryrun時点と不一致'],
    [!!returnItem && returnItem.quantity === -6 && returnItem.purchaseId === PURCHASE_9, 'ムスビRETURN明細がdryrun時点と不一致'],
    [questDelivery.totalAmount === 3300 && questDelivery.items.length === 8, 'クエストNORMAL納品の現状値がdryrun時点と不一致'],
    [!!questItem && questItem.purchaseId === PURCHASE_6 && questItem.quantity === 6 && questItem.amount === 900, 'クエストNORMAL納品のバジル明細がdryrun時点と不一致'],
  ];

  const failed = assertions.filter(([ok]) => !ok);
  if (failed.length > 0) {
    console.error('❌ 事前アサーション失敗。DBの状態がdryrun時点から変化している可能性があります。処理を中止します。');
    for (const [, msg] of failed) console.error(`  - ${msg}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('✅ 事前アサーション全て通過。トランザクションを開始します。');

  // ---------------------------------------------------------------
  // トランザクション実行
  // ---------------------------------------------------------------
  const musubiOtherItemsSum = musubiDelivery.items
    .filter((i) => i.id !== MUSUBI_NORMAL_ITEM)
    .reduce((s, i) => s + i.amount, 0);
  const musubiNewItemAmount = 3 * musubiItem!.unitPrice;
  const musubiNewTotal = musubiOtherItemsSum + musubiNewItemAmount;

  await prisma.$transaction(async (tx) => {
    // 1. ムスビNORMAL納品のバジル明細を訂正
    await tx.deliveryItem.update({
      where: { id: MUSUBI_NORMAL_ITEM },
      data: { quantity: 3, amount: musubiNewItemAmount },
    });

    // 2. ムスビNORMAL納品のtotalAmountを再計算
    await tx.delivery.update({
      where: { id: MUSUBI_NORMAL_DELIVERY },
      data: { totalAmount: musubiNewTotal },
    });

    // 3. ムスビRETURN納品のDeliveryItemを直接削除（APIは使わない）
    await tx.deliveryItem.delete({ where: { id: MUSUBI_RETURN_ITEM } });

    // 4. ムスビRETURN納品のDeliveryを直接削除（APIは使わない）
    await tx.delivery.delete({ where: { id: MUSUBI_RETURN_DELIVERY } });

    // 5. クエストNORMAL納品のバジル明細のpurchaseIdを付け替え
    await tx.deliveryItem.update({
      where: { id: QUEST_NORMAL_ITEM },
      data: { purchaseId: PURCHASE_9 },
    });

    // 6. 6袋Purchaseを削除（参照が無くなった後）
    await tx.purchase.delete({ where: { id: PURCHASE_6 } });

    // 7. 9袋Purchaseのremaining/statusを再設定（実質不変だが明示的に確定させる）
    await tx.purchase.update({
      where: { id: PURCHASE_9 },
      data: { remainingQuantity: 0, status: 'USED' },
    });
  });

  console.log('✅ トランザクション完了。');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ エラー（トランザクションはロールバックされています）:', e);
  await prisma.$disconnect();
  process.exit(1);
});
