#!/usr/bin/env tsx
/**
 * いっとく 4月分請求書 破棄スクリプト
 *
 * 動作:
 * 1. いっとく顧客の2026年4月分Invoiceレコードを特定
 * 2. その請求書に紐付く納品(deliveryIds)のステータスを INVOICED → DELIVERED に戻す
 * 3. Invoiceレコードを削除
 *
 * 使用方法:
 *   ドライラン (確認のみ): npx tsx scripts/reset-ittoku-april-invoice.ts
 *   実行             : npx tsx scripts/reset-ittoku-april-invoice.ts --execute
 *
 * 注意:
 * - Google Sheetsの請求書タブはそのまま残ります（ユーザーが手動削除）
 * - 実行後は、UIの請求書作成画面から2026年4月を選んで再発行してください
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');

async function main() {
  console.log('🔧 いっとく 4月分請求書 破棄スクリプト');
  console.log(`モード: ${EXECUTE ? '🚨 実行 (--execute)' : '👀 ドライラン'}`);
  console.log('='.repeat(60));

  // 1. いっとく顧客を検索
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { companyName: { contains: 'いっとく' } },
        { companyName: { contains: 'イットク' } },
        { companyName: { contains: 'ittoku' } },
      ],
    },
  });

  if (customers.length === 0) {
    console.log('❌ いっとく顧客が見つかりません。中断します。');
    return;
  }

  if (customers.length > 1) {
    console.log(`⚠️ 複数の顧客が見つかりました (${customers.length}件):`);
    customers.forEach((c) => console.log(`  - ${c.companyName} (id: ${c.id})`));
    console.log('対象を絞り込めないため中断します。スクリプトを修正してください。');
    return;
  }

  const customer = customers[0];
  console.log(`\n📋 対象顧客: ${customer.companyName} (id: ${customer.id})`);

  // 2. 2026年4月分の請求書を取得
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: customer.id,
      year: 2026,
      month: 4,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (invoices.length === 0) {
    console.log('\n✅ 2026年4月分の請求書は存在しません。何もしません。');
    return;
  }

  console.log(`\n📄 2026年4月分の請求書: ${invoices.length}件`);

  const allDeliveryIds: string[] = [];

  for (const inv of invoices) {
    console.log(`\n  --- ${inv.invoice_number} ---`);
    console.log(`  ID: ${inv.id}`);
    console.log(`  発行日: ${inv.invoiceDate.toISOString().split('T')[0]}`);
    console.log(`  金額: ¥${inv.totalAmount.toLocaleString()}`);
    console.log(`  Google Sheet: ${inv.googleSheetUrl || 'なし'}`);

    let ids: string[] = [];
    try {
      ids = JSON.parse(inv.deliveryIds);
    } catch {
      console.log('  ⚠️ deliveryIds パース失敗、スキップ');
      continue;
    }

    console.log(`  紐付く納品: ${ids.length}件`);
    for (const did of ids) {
      const d = await prisma.delivery.findUnique({
        where: { id: did },
        select: { id: true, deliveryNumber: true, deliveryDate: true, totalAmount: true, status: true },
      });
      if (d) {
        console.log(
          `    - ${d.deliveryNumber || d.id} | ${d.deliveryDate.toISOString().split('T')[0]} | ¥${d.totalAmount.toLocaleString()} | status=${d.status}`,
        );
      } else {
        console.log(`    - ${did} (見つかりません、スキップ)`);
      }
    }

    allDeliveryIds.push(...ids);
  }

  // 重複除去
  const uniqueDeliveryIds = [...new Set(allDeliveryIds)];

  console.log('\n' + '='.repeat(60));
  console.log('📝 実行内容:');
  console.log(`  1. 納品 ${uniqueDeliveryIds.length}件を INVOICED → DELIVERED に戻す`);
  console.log(`  2. 請求書 ${invoices.length}件 を削除`);
  console.log('  ※ Google Sheetsのタブは手動削除が必要');

  if (!EXECUTE) {
    console.log('\n👀 ドライランのため変更は行いません。');
    console.log('🚀 実行する場合: npx tsx scripts/reset-ittoku-april-invoice.ts --execute');
    return;
  }

  console.log('\n🚨 実行モード: トランザクションを開始します...');

  await prisma.$transaction(async (tx) => {
    // 1. 納品ステータスを戻す（INVOICEDのもののみ）
    if (uniqueDeliveryIds.length > 0) {
      const result = await tx.delivery.updateMany({
        where: {
          id: { in: uniqueDeliveryIds },
          status: 'INVOICED',
        },
        data: { status: 'DELIVERED' },
      });
      console.log(`  ✅ ${result.count}件の納品を DELIVERED に戻しました`);
    }

    // 2. 請求書削除
    const delResult = await tx.invoice.deleteMany({
      where: {
        id: { in: invoices.map((i) => i.id) },
      },
    });
    console.log(`  ✅ ${delResult.count}件の請求書を削除しました`);
  });

  console.log('\n✅ 完了。UIの請求書作成画面から2026年4月を選んで再発行してください。');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
