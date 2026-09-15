#!/usr/bin/env tsx
/**
 * いっとくの4月分請求書状況調査スクリプト（読み取り専用）
 *
 * 目的:
 * - いっとくの顧客情報（billingDay）を確認
 * - 4月（2026年4月）の請求書を特定
 * - 請求書に含まれる納品IDを確認
 * - 4/30納品データの存在・ステータス・customerIdを確認
 * - 修正方針の決定材料を出力
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 いっとく 4月分請求書 状況調査');
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
    console.log('❌ いっとく顧客が見つかりません');
    return;
  }

  for (const customer of customers) {
    console.log('\n📋 顧客情報:');
    console.log(`  ID: ${customer.id}`);
    console.log(`  会社名: ${customer.companyName}`);
    console.log(`  締め日: ${customer.billingDay}`);
    console.log(`  請求サイクル: ${customer.billingCycle}`);
    console.log(`  支払条件: ${customer.paymentTerms}`);
    console.log(`  別請求先ID: ${customer.billingCustomerId || 'なし'}`);

    // 2. 4月分・5月分の請求書を確認
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: customer.id,
        year: 2026,
        month: { in: [4, 5] },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { createdAt: 'asc' }],
    });

    console.log(`\n📄 2026年4月・5月の請求書: ${invoices.length}件`);
    for (const invoice of invoices) {
      console.log(`\n  --- 請求書 ${invoice.invoice_number} ---`);
      console.log(`  ID: ${invoice.id}`);
      console.log(`  対象月: ${invoice.year}年${invoice.month}月`);
      console.log(`  発行日: ${invoice.invoiceDate.toISOString().split('T')[0]}`);
      console.log(`  作成日時: ${invoice.createdAt.toISOString()}`);
      console.log(`  合計金額: ¥${invoice.totalAmount.toLocaleString()}`);
      console.log(`  ステータス: ${invoice.status}`);
      console.log(`  Google Sheet: ${invoice.googleSheetUrl || 'なし'}`);

      try {
        const deliveryIds = JSON.parse(invoice.deliveryIds);
        console.log(`  含まれる納品ID (${deliveryIds.length}件):`);
        for (const id of deliveryIds) {
          const d = await prisma.delivery.findUnique({
            where: { id },
            select: { id: true, deliveryDate: true, totalAmount: true, status: true, deliveryNumber: true },
          });
          if (d) {
            console.log(`    - ${d.deliveryNumber || d.id} | ${d.deliveryDate.toISOString().split('T')[0]} | ¥${d.totalAmount.toLocaleString()} | ${d.status}`);
          } else {
            console.log(`    - ${id} (納品データが見つかりません)`);
          }
        }
      } catch (e) {
        console.log(`  含まれる納品ID: パース失敗 (${invoice.deliveryIds})`);
      }
    }

    // 3. 4月の全納品データ確認（請求書外も含む）
    console.log(`\n📦 ${customer.companyName} の2026年4月全納品データ:`);
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

    console.log(`  4月納品件数: ${aprilDeliveries.length}件`);
    for (const d of aprilDeliveries) {
      console.log(`    - ${d.deliveryNumber || d.id} | 納品日:${d.deliveryDate.toISOString().split('T')[0]} | ¥${d.totalAmount.toLocaleString()} | status=${d.status} | type=${d.type} | 登録:${d.createdAt.toISOString()}`);
    }

    // 4. 4/30の納品データ詳細
    const apr30Start = new Date(2026, 3, 30);
    apr30Start.setHours(0, 0, 0, 0);
    const apr30End = new Date(2026, 3, 30);
    apr30End.setHours(23, 59, 59, 999);

    const apr30Deliveries = await prisma.delivery.findMany({
      where: {
        customerId: customer.id,
        deliveryDate: { gte: apr30Start, lte: apr30End },
      },
    });

    console.log(`\n🎯 4/30納品データ: ${apr30Deliveries.length}件`);
    for (const d of apr30Deliveries) {
      console.log(`  - ${d.deliveryNumber || d.id} | status=${d.status} | type=${d.type} | 登録:${d.createdAt.toISOString()}`);
    }
  }

  console.log('\n' + '='.repeat(60));
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
