#!/usr/bin/env tsx
/**
 * クエスト・ICHINA・粋 4月分請求書 破棄スクリプト
 *
 * 動作:
 * 1. 各顧客の 2026年4月分 Invoice レコードを特定
 * 2. その請求書に紐付く納品(deliveryIds)のステータスを INVOICED → DELIVERED に戻す
 * 3. Invoiceレコードを削除
 *
 * 使用方法:
 *   ドライラン (確認のみ): npx tsx scripts/reset-april-invoices.ts
 *   実行             : npx tsx scripts/reset-april-invoices.ts --execute
 *
 * 注意:
 * - Google Sheetsの請求書タブはそのまま残ります（ユーザーが手動削除）
 * - 実行後は、UIの請求書作成画面から2026年4月を選んで再発行してください
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXECUTE = process.argv.includes('--execute');

const TARGETS: Array<{ label: string; customerId: string }> = [
  { label: 'ダイニングレストラン　QUEST', customerId: 'cmgg2ujvp00033wtgxer5owll' },
  { label: 'ICHINA', customerId: 'cmgg3ahyj00043wtgyv0s15vt' },
  { label: '鮨割烹　「粋」', customerId: 'cmiwjqvz1000113i4gzaj7sbo' },
];

async function processCustomer(label: string, customerId: string) {
  console.log('\n' + '█'.repeat(60));
  console.log(`█ 対象: ${label}`);
  console.log('█'.repeat(60));

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    console.log(`❌ 顧客 ${label} (${customerId}) が見つかりません。スキップ。`);
    return { invoiceIds: [], deliveryIds: [] };
  }

  const invoices = await prisma.invoice.findMany({
    where: { customerId, year: 2026, month: 4 },
    orderBy: { createdAt: 'asc' },
  });

  if (invoices.length === 0) {
    console.log(`✅ ${label} の2026年4月分の請求書は存在しません。スキップ。`);
    return { invoiceIds: [], deliveryIds: [] };
  }

  console.log(`\n📄 2026年4月分の請求書: ${invoices.length}件`);
  const allDeliveryIds: string[] = [];

  for (const inv of invoices) {
    console.log(`\n  --- ${inv.invoice_number} ---`);
    console.log(`  ID: ${inv.id}`);
    console.log(`  発行日: ${inv.invoiceDate.toISOString().split('T')[0]}`);
    console.log(`  金額: ¥${inv.totalAmount.toLocaleString()}`);
    console.log(`  ステータス: ${inv.status}`);
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
        select: {
          id: true,
          deliveryNumber: true,
          deliveryDate: true,
          totalAmount: true,
          status: true,
        },
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

  return {
    invoiceIds: invoices.map((i) => i.id),
    deliveryIds: [...new Set(allDeliveryIds)],
  };
}

async function main() {
  console.log('🔧 4月分請求書 破棄スクリプト (クエスト / ICHINA / 粋)');
  console.log(`モード: ${EXECUTE ? '🚨 実行 (--execute)' : '👀 ドライラン'}`);
  console.log('='.repeat(60));

  const totals: Array<{ label: string; invoiceIds: string[]; deliveryIds: string[] }> = [];
  for (const target of TARGETS) {
    const result = await processCustomer(target.label, target.customerId);
    totals.push({ label: target.label, ...result });
  }

  // サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📝 実行内容サマリー:');
  let totalInv = 0;
  let totalDel = 0;
  for (const t of totals) {
    console.log(`  ${t.label}: 請求書 ${t.invoiceIds.length}件 / 納品 ${t.deliveryIds.length}件`);
    totalInv += t.invoiceIds.length;
    totalDel += t.deliveryIds.length;
  }
  console.log(`  合計: 請求書 ${totalInv}件 削除 / 納品 ${totalDel}件 を INVOICED → DELIVERED に戻す`);
  console.log('  ※ Google Sheetsのタブは手動削除が必要');

  if (!EXECUTE) {
    console.log('\n👀 ドライランのため変更は行いません。');
    console.log('🚀 実行する場合: npx tsx scripts/reset-april-invoices.ts --execute');
    return;
  }

  console.log('\n🚨 実行モード: トランザクションを開始します...');

  await prisma.$transaction(async (tx) => {
    for (const t of totals) {
      if (t.invoiceIds.length === 0) continue;
      console.log(`\n--- ${t.label} ---`);

      // 1. 納品ステータスを戻す（INVOICEDのもののみ）
      if (t.deliveryIds.length > 0) {
        const result = await tx.delivery.updateMany({
          where: {
            id: { in: t.deliveryIds },
            status: 'INVOICED',
          },
          data: { status: 'DELIVERED' },
        });
        console.log(`  ✅ ${result.count}件の納品を DELIVERED に戻しました`);
      }

      // 2. 請求書削除
      const delResult = await tx.invoice.deleteMany({
        where: { id: { in: t.invoiceIds } },
      });
      console.log(`  ✅ ${delResult.count}件の請求書を削除しました`);
    }
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
