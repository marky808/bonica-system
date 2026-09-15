#!/usr/bin/env tsx
/**
 * 顧客「108」の4月分請求書状況調査スクリプト（読み取り専用）
 *
 * 月次請求一覧（/billing）に4月分が出てこない原因を特定する：
 *   - 既存請求書の有無（INVOICEDステータスで隠れている）
 *   - 4月の納品ステータス（DELIVERED/INVOICED/その他）
 *   - 締め日と納品日の関係（請求期間のズレ）
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 顧客「108」の4月分請求書調査');
  console.log('='.repeat(60));

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { companyName: { contains: '一〇八' } }, // 漢字
        { companyName: { contains: '108' } },
        { companyName: { contains: '１０８' } }, // 全角
        { companyName: { contains: '一○八' } }, // 〇ではなく○
      ],
    },
  });

  if (customers.length === 0) {
    console.log('❌ 「108」を含む顧客が見つかりません');
    console.log('\n📋 全顧客一覧（参考）:');
    const all = await prisma.customer.findMany({
      select: { id: true, companyName: true, billingDay: true },
      orderBy: { companyName: 'asc' },
    });
    all.forEach((c) => console.log(`  - ${c.companyName} (id: ${c.id}, 締め: ${c.billingDay})`));
    return;
  }

  console.log(`\n✅ ${customers.length}件の候補顧客が見つかりました\n`);

  for (const customer of customers) {
    console.log('█'.repeat(60));
    console.log(`📋 ${customer.companyName}`);
    console.log('█'.repeat(60));
    console.log(`  ID: ${customer.id}`);
    console.log(`  締め日: ${customer.billingDay}`);
    console.log(`  請求サイクル: ${customer.billingCycle}`);
    console.log(`  別請求先ID: ${customer.billingCustomerId || 'なし'}`);

    // 2026年4月分の請求書
    const invoices = await prisma.invoice.findMany({
      where: { customerId: customer.id, year: 2026, month: 4 },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`\n📄 2026年4月分の請求書: ${invoices.length}件`);
    for (const inv of invoices) {
      console.log(`  --- ${inv.invoice_number} ---`);
      console.log(`    ID: ${inv.id}`);
      console.log(`    発行日: ${inv.invoiceDate.toISOString().split('T')[0]}`);
      console.log(`    金額: ¥${inv.totalAmount.toLocaleString()}`);
      console.log(`    ステータス: ${inv.status}`);
      console.log(`    Google Sheet: ${inv.googleSheetUrl || 'なし'}`);
      try {
        const ids: string[] = JSON.parse(inv.deliveryIds);
        console.log(`    納品ID(${ids.length}件):`);
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
              `      - ${d.deliveryNumber || d.id} | ${d.deliveryDate.toISOString().split('T')[0]} | ¥${d.totalAmount.toLocaleString()} | status=${d.status}`,
            );
          }
        }
      } catch {
        console.log('    ⚠️ deliveryIds パース失敗');
      }
    }

    // 2026年4月の全納品データ（status関係なく）
    const aprilStart = new Date(2026, 3, 1);
    aprilStart.setHours(0, 0, 0, 0);
    const aprilEnd = new Date(2026, 4, 0);
    aprilEnd.setHours(23, 59, 59, 999);

    const aprilDeliveries = await prisma.delivery.findMany({
      where: {
        customerId: customer.id,
        deliveryDate: { gte: aprilStart, lte: aprilEnd },
      },
      orderBy: { deliveryDate: 'asc' },
      select: {
        id: true,
        deliveryNumber: true,
        deliveryDate: true,
        totalAmount: true,
        status: true,
        type: true,
        createdAt: true,
      },
    });

    console.log(`\n📦 2026年4月の全納品データ: ${aprilDeliveries.length}件`);
    for (const d of aprilDeliveries) {
      console.log(
        `    - ${d.deliveryNumber || d.id} | 納品日:${d.deliveryDate.toISOString().split('T')[0]} | ¥${d.totalAmount.toLocaleString()} | status=${d.status} | type=${d.type}`,
      );
    }

    // ステータスごとの集計
    const byStatus = aprilDeliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`\n  📊 ステータス別: ${JSON.stringify(byStatus)}`);

    console.log('\n  💡 月次一覧(/billing)に出る条件: status=DELIVERED の納品が1件以上');
    const deliveredCount = byStatus['DELIVERED'] || 0;
    if (deliveredCount === 0 && aprilDeliveries.length > 0) {
      console.log(`  ⚠️ DELIVERED が0件 → 月次一覧に表示されない`);
      const invoicedCount = byStatus['INVOICED'] || 0;
      if (invoicedCount > 0) {
        console.log(`  ✅ INVOICED が ${invoicedCount}件 → 既存請求書を削除＋ステータス戻しで再生成可`);
      }
    } else if (deliveredCount > 0) {
      console.log(`  ✅ DELIVERED が${deliveredCount}件 → 月次一覧に出るはず`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('✅ 調査完了');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
