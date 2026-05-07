/**
 * 問題のある納品データを日付ごとに分割するスクリプト
 *
 * ケース1: 複数日付混在 - Item.deliveryDateでグループ化して新しいDeliveryを作成
 * ケース2: 1日程度のずれ - Item.deliveryDateをDelivery.deliveryDateに統一
 *
 * 実行:
 *   ドライラン: npx tsx scripts/fix-delivery-dates.ts
 *   実行:       npx tsx scripts/fix-delivery-dates.ts --execute
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ドライランモードかどうか
const isDryRun = !process.argv.includes('--execute');

// 対象データの定義
interface TargetDelivery {
  id: string;
  description: string;
  type: 'SPLIT' | 'UNIFY';
}

// ケース1: 複数日付混在（分割が必要）
const SPLIT_TARGETS: TargetDelivery[] = [
  { id: 'DEL-CMKUPIJU', description: 'ICHINA - 01/15と01/22混在', type: 'SPLIT' },
  { id: 'DEL-CMJAXYKR', description: 'ICHINA - 12/16と12/17混在', type: 'SPLIT' },
  { id: 'cmk3dnm68000cfakz9wtq5mey', description: '株式会社一〇八 - 12/09, 12/27, 12/28混在', type: 'SPLIT' },
  { id: 'cmk3dhg0w0002uol7cxagr7tq', description: '株式会社一〇八 - 12/02, 12/09混在', type: 'SPLIT' },
  { id: 'cmk3dhg020006fakzi6bzhsxp', description: '株式会社一〇八 - 12/02, 12/09混在', type: 'SPLIT' },
  { id: 'cmk0sssiu000214hy486vbk42', description: 'ファーストプロスパー - 12/01, 12/15, 12/19混在', type: 'SPLIT' },
];

// ケース2: 1日程度のずれ（統一するだけ）
const UNIFY_TARGETS: TargetDelivery[] = [
  { id: 'DEL-CMKKJ3G4', description: '鮨割烹「粋」 - Delivery:01/19, Item:01/20', type: 'UNIFY' },
  { id: 'DEL-CMKG6S9N', description: 'いっとく - Delivery:01/16, Item:01/15', type: 'UNIFY' },
  { id: 'DEL-CMKOSBE7', description: 'ICHINA - Delivery:01/14, Item:01/13', type: 'UNIFY' },
  { id: 'cmiwq09740002aapnyerbeahc', description: 'QUEST - Delivery:12/08, Item:12/04', type: 'UNIFY' },
];

/**
 * 納品IDで検索（deliveryNumberまたはidで検索）
 */
async function findDelivery(identifier: string) {
  // まずdeliveryNumberで検索
  let delivery = await prisma.delivery.findUnique({
    where: { deliveryNumber: identifier },
    include: {
      customer: true,
      items: {
        include: {
          purchase: true,
          category: true,
        },
      },
    },
  });

  // 見つからなければIDで検索
  if (!delivery) {
    delivery = await prisma.delivery.findUnique({
      where: { id: identifier },
      include: {
        customer: true,
        items: {
          include: {
            purchase: true,
            category: true,
          },
        },
      },
    });
  }

  return delivery;
}

/**
 * 日付を文字列に変換（YYYY-MM-DD形式）
 */
function formatDate(date: Date | null): string {
  if (!date) return 'null';
  return date.toISOString().split('T')[0];
}

/**
 * 新しい納品番号を生成
 */
function generateDeliveryNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'DEL-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ケース1: 複数日付混在の納品を分割
 */
async function splitDeliveryByDate(target: TargetDelivery): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`処理中: ${target.description}`);
  console.log(`ID: ${target.id}`);
  console.log(`${'='.repeat(60)}`);

  const delivery = await findDelivery(target.id);

  if (!delivery) {
    console.log(`  [警告] 納品データが見つかりません: ${target.id}`);
    return;
  }

  console.log(`\n  顧客: ${delivery.customer.companyName}`);
  console.log(`  納品日: ${formatDate(delivery.deliveryDate)}`);
  console.log(`  ステータス: ${delivery.status}`);
  console.log(`  合計金額: ¥${delivery.totalAmount.toLocaleString()}`);
  console.log(`  明細数: ${delivery.items.length}件`);

  // Item.deliveryDateでグループ化
  const itemsByDate = new Map<string, typeof delivery.items>();

  for (const item of delivery.items) {
    const dateKey = formatDate(item.deliveryDate);
    if (!itemsByDate.has(dateKey)) {
      itemsByDate.set(dateKey, []);
    }
    itemsByDate.get(dateKey)!.push(item);
  }

  console.log(`\n  日付別明細:`);
  for (const [date, items] of itemsByDate.entries()) {
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    console.log(`    ${date}: ${items.length}件, ¥${total.toLocaleString()}`);
    for (const item of items) {
      const productName = item.purchase?.productName || item.productName || '不明';
      console.log(`      - ${productName}: ${item.quantity} x ¥${item.unitPrice} = ¥${item.amount.toLocaleString()}`);
    }
  }

  // 日付が1種類しかない場合はスキップ
  if (itemsByDate.size <= 1) {
    console.log(`\n  [情報] 日付が1種類のみのため、分割不要です`);
    return;
  }

  if (isDryRun) {
    console.log(`\n  [ドライラン] 以下の処理を実行します:`);
    console.log(`    1. 元の納品 (${target.id}) を削除`);

    let index = 1;
    for (const [date, items] of itemsByDate.entries()) {
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      console.log(`    ${index + 1}. 新しい納品を作成: ${date}, ${items.length}件, ¥${total.toLocaleString()}`);
      index++;
    }
    return;
  }

  // 実行モード
  console.log(`\n  [実行] 分割処理を開始...`);

  await prisma.$transaction(async (tx) => {
    const newDeliveries: { id: string; date: string; total: number }[] = [];

    // 日付ごとに新しい納品を作成
    for (const [dateStr, items] of itemsByDate.entries()) {
      const deliveryDate = items[0].deliveryDate || delivery.deliveryDate;
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      // 新しい納品を作成
      const newDelivery = await tx.delivery.create({
        data: {
          customerId: delivery.customerId,
          deliveryDate: deliveryDate,
          totalAmount: totalAmount,
          status: delivery.status,
          inputMode: delivery.inputMode,
          purchaseLinkStatus: delivery.purchaseLinkStatus,
          type: delivery.type,
          notes: delivery.notes ? `${delivery.notes} (元ID: ${target.id}から分割)` : `元ID: ${target.id}から分割`,
          deliveryNumber: generateDeliveryNumber(),
        },
      });

      // 明細を新しい納品に移動（コピー）
      for (const item of items) {
        await tx.deliveryItem.create({
          data: {
            deliveryId: newDelivery.id,
            purchaseId: item.purchaseId,
            productName: item.productName,
            categoryId: item.categoryId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            deliveryDate: item.deliveryDate,
            unit: item.unit,
            taxRate: item.taxRate,
            notes: item.notes,
          },
        });
      }

      newDeliveries.push({
        id: newDelivery.id,
        date: dateStr,
        total: totalAmount,
      });

      console.log(`    作成: ${newDelivery.deliveryNumber || newDelivery.id} (${dateStr}, ¥${totalAmount.toLocaleString()})`);
    }

    // 元の納品の明細を削除（Cascade削除が設定されているはずだが念のため）
    await tx.deliveryItem.deleteMany({
      where: { deliveryId: delivery.id },
    });

    // 元の納品を削除
    await tx.delivery.delete({
      where: { id: delivery.id },
    });

    console.log(`    削除: 元の納品 (${target.id})`);
    console.log(`  [完了] ${newDeliveries.length}件の納品に分割しました`);
  });
}

/**
 * ケース2: Item.deliveryDateをDelivery.deliveryDateに統一
 */
async function unifyDeliveryDates(target: TargetDelivery): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`処理中: ${target.description}`);
  console.log(`ID: ${target.id}`);
  console.log(`${'='.repeat(60)}`);

  const delivery = await findDelivery(target.id);

  if (!delivery) {
    console.log(`  [警告] 納品データが見つかりません: ${target.id}`);
    return;
  }

  console.log(`\n  顧客: ${delivery.customer.companyName}`);
  console.log(`  Delivery.deliveryDate: ${formatDate(delivery.deliveryDate)}`);
  console.log(`  ステータス: ${delivery.status}`);
  console.log(`  明細数: ${delivery.items.length}件`);

  // Item.deliveryDateの確認
  console.log(`\n  明細の日付:`);
  const uniqueDates = new Set<string>();
  for (const item of delivery.items) {
    const dateStr = formatDate(item.deliveryDate);
    uniqueDates.add(dateStr);
    const productName = item.purchase?.productName || item.productName || '不明';
    console.log(`    - ${productName}: ${dateStr}`);
  }

  // すでに統一されている場合はスキップ
  const deliveryDateStr = formatDate(delivery.deliveryDate);
  const needsUpdate = [...uniqueDates].some(d => d !== deliveryDateStr && d !== 'null');

  if (!needsUpdate) {
    console.log(`\n  [情報] すでにDelivery.deliveryDateと一致しているため、更新不要です`);
    return;
  }

  if (isDryRun) {
    console.log(`\n  [ドライラン] 以下の処理を実行します:`);
    console.log(`    全ての明細のdeliveryDateを ${deliveryDateStr} に更新`);
    return;
  }

  // 実行モード
  console.log(`\n  [実行] 日付統一処理を開始...`);

  await prisma.deliveryItem.updateMany({
    where: { deliveryId: delivery.id },
    data: { deliveryDate: delivery.deliveryDate },
  });

  console.log(`  [完了] ${delivery.items.length}件の明細の日付を ${deliveryDateStr} に更新しました`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('納品データ日付修正スクリプト');
  console.log('========================================');
  console.log(`モード: ${isDryRun ? 'ドライラン（変更なし）' : '実行モード'}`);
  console.log(`実行日時: ${new Date().toISOString()}`);

  if (isDryRun) {
    console.log('\n[注意] ドライランモードです。実際の変更は行われません。');
    console.log('変更を実行するには、--execute オプションを付けて実行してください。');
    console.log('例: npx tsx scripts/fix-delivery-dates.ts --execute');
  }

  // ケース1: 複数日付混在の納品を分割
  console.log('\n\n########################################');
  console.log('ケース1: 複数日付混在（分割処理）');
  console.log('########################################');

  for (const target of SPLIT_TARGETS) {
    try {
      await splitDeliveryByDate(target);
    } catch (error) {
      console.error(`  [エラー] ${target.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ケース2: 1日程度のずれ（統一処理）
  console.log('\n\n########################################');
  console.log('ケース2: 1日程度のずれ（日付統一処理）');
  console.log('########################################');

  for (const target of UNIFY_TARGETS) {
    try {
      await unifyDeliveryDates(target);
    } catch (error) {
      console.error(`  [エラー] ${target.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // サマリー
  console.log('\n\n========================================');
  console.log('処理完了');
  console.log('========================================');

  if (isDryRun) {
    console.log('\n[注意] ドライランモードでした。実際の変更は行われていません。');
    console.log('変更を実行するには、--execute オプションを付けて実行してください。');
  } else {
    console.log('\n全ての処理が完了しました。');
  }
}

main()
  .catch((error) => {
    console.error('スクリプトエラー:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
