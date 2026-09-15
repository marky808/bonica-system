#!/usr/bin/env tsx
/**
 * バジル仕入是正 実行後検証スクリプト（読み取り専用）
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const PURCHASE_9 = 'cmt0uo76p0003j2dac6v634eh';
const PURCHASE_6 = 'cmt13rls20001bs9yu680mqdf';

const MUSUBI_NORMAL_DELIVERY = 'cmt11rfdw000465x77og9a4tg';
const MUSUBI_RETURN_DELIVERY = 'cmt13g6zr0009qie3k7zk1ox5';
const QUEST_NORMAL_DELIVERY = 'cmt13we1z000dqie3e9e8pgzk';

const BACKUP_FILE = process.argv[2];

async function main() {
  console.log('='.repeat(78));
  console.log('【1】9袋Purchase の remainingQuantity / status');
  console.log('='.repeat(78));
  const purchase9 = await prisma.purchase.findUnique({ where: { id: PURCHASE_9 } });
  console.log(purchase9 ? `quantity=${purchase9.quantity} remainingQuantity=${purchase9.remainingQuantity} status=${purchase9.status}` : '見つかりません');

  const purchase6 = await prisma.purchase.findUnique({ where: { id: PURCHASE_6 } });
  console.log(`\n6袋Purchase (${PURCHASE_6}): ${purchase6 ? 'まだ存在しています ⚠️' : '削除済み ✅'}`);

  console.log('\n' + '='.repeat(78));
  console.log('【2】対象3納品の存在有無・totalAmount');
  console.log('='.repeat(78));

  const musubiDelivery = await prisma.delivery.findUnique({ where: { id: MUSUBI_NORMAL_DELIVERY }, include: { items: true } });
  console.log(`\nムスビNORMAL納品 (${MUSUBI_NORMAL_DELIVERY}):`);
  if (musubiDelivery) {
    console.log(`  存在: ✅ / totalAmount=${musubiDelivery.totalAmount} / アイテム件数=${musubiDelivery.items.length}`);
  } else {
    console.log('  存在しません ⚠️');
  }

  const returnDelivery = await prisma.delivery.findUnique({ where: { id: MUSUBI_RETURN_DELIVERY }, include: { items: true } });
  console.log(`\nムスビRETURN納品 (${MUSUBI_RETURN_DELIVERY}):`);
  console.log(returnDelivery ? '  まだ存在しています ⚠️' : '  削除済み ✅');

  const questDelivery = await prisma.delivery.findUnique({ where: { id: QUEST_NORMAL_DELIVERY }, include: { items: true } });
  console.log(`\nクエストNORMAL納品 (${QUEST_NORMAL_DELIVERY}):`);
  if (questDelivery) {
    console.log(`  存在: ✅ / totalAmount=${questDelivery.totalAmount} / アイテム件数=${questDelivery.items.length}`);
  } else {
    console.log('  存在しません ⚠️');
  }

  console.log('\n' + '='.repeat(78));
  console.log('【3】バジル関連 DeliveryItem 全件一覧（現状）');
  console.log('='.repeat(78));
  const basilItems = await prisma.deliveryItem.findMany({
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
  console.log(`件数: ${basilItems.length}`);
  for (const i of basilItems) {
    console.log(
      `  itemId=${i.id} | purchaseId=${i.purchaseId ?? 'NULL'} | 顧客=${i.delivery.customer?.companyName} | 納品日=${i.delivery.deliveryDate.toISOString().split('T')[0]} | ` +
      `type=${i.delivery.type} | quantity=${i.quantity} | unitPrice=${i.unitPrice} | amount=${i.amount} | deliveryId=${i.delivery.id}`
    );
  }

  console.log('\n' + '='.repeat(78));
  console.log('【4】混載他品目が変化していないことの確認（バックアップJSONとの突合）');
  console.log('='.repeat(78));

  if (!BACKUP_FILE || !fs.existsSync(BACKUP_FILE)) {
    console.log('⚠️ バックアップJSONのパスが指定されていない、または見つかりません。突合をスキップします。');
    console.log('  使い方: npx tsx scripts/verify-basil-correction.ts backups/basil-correction-XXXX.json');
  } else {
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    const backupItemsById: Record<string, any> = {};
    for (const i of backup.deliveryItems) backupItemsById[i.id] = i;

    const targetItemIds = new Set([
      'cmt11rfeq000c65x7kalc6u11', // ムスビ バジル明細（変更対象）
      'cmt13g6zw000aqie3bbpt6vys', // ムスビ 赤伝明細（削除対象）
      'cmt13we2b000jqie303wib57t', // クエスト バジル明細（purchaseId付替え対象）
    ]);

    const currentItemsById: Record<string, any> = {};
    if (musubiDelivery) for (const i of musubiDelivery.items) currentItemsById[i.id] = i;
    if (questDelivery) for (const i of questDelivery.items) currentItemsById[i.id] = i;

    let mismatchCount = 0;
    let checkedCount = 0;
    for (const [id, before] of Object.entries(backupItemsById)) {
      if (targetItemIds.has(id)) continue; // 変更対象は別途確認済みなのでスキップ
      if (!musubiDelivery && !questDelivery) continue;
      const belongsToTarget = before.deliveryId === MUSUBI_NORMAL_DELIVERY || before.deliveryId === QUEST_NORMAL_DELIVERY;
      if (!belongsToTarget) continue; // RETURN納品側の明細（削除対象そのもの）は対象外

      checkedCount++;
      const after = currentItemsById[id];
      if (!after) {
        console.log(`  ⚠️ id=${id} が消失しています（想定外）`);
        mismatchCount++;
        continue;
      }
      const same =
        after.purchaseId === before.purchaseId &&
        after.quantity === before.quantity &&
        after.unitPrice === before.unitPrice &&
        after.amount === before.amount;
      if (!same) {
        console.log(`  ⚠️ id=${id} が変化しています: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
        mismatchCount++;
      }
    }

    console.log(`\n突合対象（混載他品目）: ${checkedCount}件`);
    if (mismatchCount === 0) {
      console.log('✅ 全件、バックアップ時点と完全一致（変化なし）を確認しました。');
    } else {
      console.log(`⚠️ ${mismatchCount}件で差分が検出されました（上記参照）。`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ エラー:', e);
  await prisma.$disconnect();
  process.exit(1);
});
