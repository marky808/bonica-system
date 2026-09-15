#!/usr/bin/env tsx
/**
 * バジル仕入是正 事前バックアップスクリプト（読み取り専用・書き込み一切なし）
 *
 * 変更対象となる全レコードの「現在の状態」をJSONファイルに出力する。
 * 手動復元用に、各レコードの全フィールドをそのまま保存する。
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const PURCHASE_9 = 'cmt0uo76p0003j2dac6v634eh';
const PURCHASE_6 = 'cmt13rls20001bs9yu680mqdf';

const MUSUBI_NORMAL_DELIVERY = 'cmt11rfdw000465x77og9a4tg';
const MUSUBI_RETURN_DELIVERY = 'cmt13g6zr0009qie3k7zk1ox5';
const QUEST_NORMAL_DELIVERY = 'cmt13we1z000dqie3e9e8pgzk';

async function main() {
  const purchase9 = await prisma.purchase.findUniqueOrThrow({ where: { id: PURCHASE_9 } });
  const purchase6 = await prisma.purchase.findUniqueOrThrow({ where: { id: PURCHASE_6 } });

  const musubiNormalDelivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: MUSUBI_NORMAL_DELIVERY },
    include: { items: true },
  });
  const musubiReturnDelivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: MUSUBI_RETURN_DELIVERY },
    include: { items: true },
  });
  const questNormalDelivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: QUEST_NORMAL_DELIVERY },
    include: { items: true },
  });

  const backup = {
    _meta: {
      purpose: 'バジル仕入是正（江川GF 2026-08-19仕入 9袋/6袋）実行前バックアップ',
      takenAt: new Date().toISOString(),
      restoreNotes: [
        '手動復元する場合は、このJSON内の各レコードの全フィールドをそのまま元テーブルへUPDATE/INSERTし直すこと。',
        'purchases: id指定でUPSERT。',
        'deliveries: id指定でUPSERT。',
        'delivery_items: id指定でUPSERT（deliveryId, purchaseIdの参照も含めて復元）。',
        '削除されたレコード（Purchase 6袋、ムスビRETURN納品とその明細）は、このJSONの内容でINSERTし直せば復元可能。',
      ],
    },
    purchases: [purchase9, purchase6],
    deliveries: [musubiNormalDelivery, musubiReturnDelivery, questNormalDelivery].map((d) => {
      const { items, ...rest } = d;
      return rest;
    }),
    deliveryItems: [
      ...musubiNormalDelivery.items,
      ...musubiReturnDelivery.items,
      ...questNormalDelivery.items,
    ],
  };

  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `basil-correction-${backup._meta.takenAt.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

  console.log('✅ バックアップ完了');
  console.log(`  保存先: ${filepath}`);
  console.log(`  Purchase: ${backup.purchases.length}件`);
  console.log(`  Delivery: ${backup.deliveries.length}件`);
  console.log(`  DeliveryItem: ${backup.deliveryItems.length}件`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ エラー:', e);
  await prisma.$disconnect();
  process.exit(1);
});
