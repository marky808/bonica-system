#!/usr/bin/env tsx
/**
 * フレッシュデザート株式会社 5月分請求書 再発行不具合調査（読み取り専用）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calculateBillingPeriod(year: number, month: number, billingDay: number) {
  if (billingDay >= 28) {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  const startDate = new Date(year, month - 2, billingDay + 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month - 1, billingDay);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

async function main() {
  console.log('=== フレッシュデザート株式会社 調査 ===\n');

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { companyName: { contains: 'フレッシュデザート' } },
        { companyName: { contains: 'ﾌﾚｯｼｭﾃﾞｻﾞｰﾄ' } },
      ],
    },
  });

  console.log(`該当顧客: ${customers.length}件`);
  for (const c of customers) {
    console.log(JSON.stringify({
      id: c.id,
      companyName: c.companyName,
      billingDay: c.billingDay,
      billingCycle: c.billingCycle,
      billingCustomerId: c.billingCustomerId,
    }, null, 2));
  }

  if (customers.length === 0) {
    console.log('顧客が見つかりませんでした。');
    return;
  }

  for (const customer of customers) {
    console.log(`\n--- 顧客: ${customer.companyName} (${customer.id}) ---`);

    const deliveries = await prisma.delivery.findMany({
      where: { customerId: customer.id },
      orderBy: { deliveryDate: 'desc' },
      take: 30,
      select: {
        id: true,
        deliveryNumber: true,
        status: true,
        type: true,
        deliveryDate: true,
        totalAmount: true,
        inputMode: true,
        purchaseLinkStatus: true,
        googleSheetId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`\n直近納品一覧（最大30件）:`);
    console.table(deliveries.map(d => ({
      id: d.id.slice(0, 12),
      deliveryNumber: d.deliveryNumber,
      status: d.status,
      type: d.type,
      deliveryDate: d.deliveryDate.toISOString().split('T')[0],
      totalAmount: d.totalAmount,
      googleSheet: d.googleSheetId ? 'あり' : 'なし',
      createdAt: d.createdAt.toISOString(),
    })));

    // 直近作成された（createdAtが新しい）納品を明示
    const recentlyCreated = [...deliveries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
    console.log(`\n直近作成された納品（createdAt順、上位5件）:`);
    console.table(recentlyCreated.map(d => ({
      id: d.id.slice(0, 12),
      status: d.status,
      deliveryDate: d.deliveryDate.toISOString().split('T')[0],
      totalAmount: d.totalAmount,
      createdAt: d.createdAt.toISOString(),
    })));

    // 請求書一覧
    const invoices = await prisma.invoice.findMany({
      where: { customerId: customer.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 10,
    });

    console.log(`\n請求書一覧（最大10件）:`);
    for (const inv of invoices) {
      console.log(JSON.stringify({
        id: inv.id,
        invoice_number: inv.invoice_number,
        year: inv.year,
        month: inv.month,
        totalAmount: inv.totalAmount,
        invoiceDate: inv.invoiceDate.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        googleSheetUrl: inv.googleSheetUrl,
        sheetTabName: inv.sheetTabName,
        deliveryIdsCount: (() => { try { return JSON.parse(inv.deliveryIds).length } catch { return 'parse error' } })(),
      }, null, 2));
    }

    // 5月請求書があれば、期間計算とその期間内の全納品ステータスを突き合わせ
    const mayInvoice = invoices.find(inv => inv.month === 5);
    if (mayInvoice) {
      const { startDate, endDate } = calculateBillingPeriod(mayInvoice.year, mayInvoice.month, customer.billingDay);
      console.log(`\n5月請求書の請求期間（billingDay=${customer.billingDay}）: ${startDate.toISOString()} 〜 ${endDate.toISOString()}`);

      const inPeriod = await prisma.delivery.findMany({
        where: { customerId: customer.id, deliveryDate: { gte: startDate, lte: endDate } },
        orderBy: { deliveryDate: 'asc' },
        select: { id: true, deliveryNumber: true, status: true, deliveryDate: true, totalAmount: true, createdAt: true },
      });

      console.log(`\nこの期間内の全納品（ステータス問わず、${inPeriod.length}件）:`);
      console.table(inPeriod.map(d => ({
        id: d.id.slice(0, 12),
        deliveryNumber: d.deliveryNumber,
        status: d.status,
        deliveryDate: d.deliveryDate.toISOString().split('T')[0],
        totalAmount: d.totalAmount,
        createdAt: d.createdAt.toISOString(),
      })));

      let mayDeliveryIds: string[] = [];
      try { mayDeliveryIds = JSON.parse(mayInvoice.deliveryIds); } catch {}
      const notInInvoice = inPeriod.filter(d => !mayDeliveryIds.includes(d.id));
      console.log(`\n請求書のdeliveryIdsに含まれていない納品（期間内）: ${notInInvoice.length}件`);
      console.table(notInInvoice.map(d => ({
        id: d.id.slice(0, 12),
        status: d.status,
        deliveryDate: d.deliveryDate.toISOString().split('T')[0],
        totalAmount: d.totalAmount,
      })));
    } else {
      console.log('\n5月分の請求書は見つかりませんでした。');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
