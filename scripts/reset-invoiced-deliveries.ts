/**
 * 請求済み納品をリセットし、既存の請求書を無効化するスクリプト
 *
 * 実行: npx tsx scripts/reset-invoiced-deliveries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 請求済み納品のリセットを開始...');

  // 1. INVOICEDステータスの納品を取得
  const invoicedDeliveries = await prisma.delivery.findMany({
    where: { status: 'INVOICED' },
    include: {
      customer: { select: { companyName: true } }
    }
  });

  console.log(`📋 INVOICEDステータスの納品: ${invoicedDeliveries.length}件`);
  invoicedDeliveries.forEach(d => {
    console.log(`  - ${d.customer.companyName}: ${d.deliveryDate.toISOString().split('T')[0]} ¥${d.totalAmount}`);
  });

  // 2. 既存の請求書を取得
  const existingInvoices = await prisma.invoice.findMany();

  console.log(`\n📄 既存の請求書: ${existingInvoices.length}件`);
  for (const inv of existingInvoices) {
    const customer = await prisma.customer.findUnique({
      where: { id: inv.customerId },
      select: { companyName: true }
    });
    console.log(`  - ${customer?.companyName || inv.customerId}: ${inv.year}年${inv.month}月 ${inv.invoice_number} ¥${inv.totalAmount}`);
  }

  // 3. INVOICEDステータスの納品をDELIVEREDに戻す
  const updateResult = await prisma.delivery.updateMany({
    where: { status: 'INVOICED' },
    data: { status: 'DELIVERED' }
  });

  console.log(`\n✅ ${updateResult.count}件の納品をDELIVEREDに戻しました`);

  // 4. 既存の請求書を削除（または無効化）
  // 注意: 本番環境では削除ではなくステータス変更を推奨
  const deleteResult = await prisma.invoice.deleteMany({});

  console.log(`✅ ${deleteResult.count}件の請求書を削除しました`);

  // 5. 最終確認
  const remainingInvoiced = await prisma.delivery.count({ where: { status: 'INVOICED' } });
  const remainingInvoices = await prisma.invoice.count();

  console.log(`\n📊 リセット後の状態:`);
  console.log(`  - INVOICEDステータスの納品: ${remainingInvoiced}件`);
  console.log(`  - 請求書レコード: ${remainingInvoices}件`);

  // 6. DELIVEREDステータスの納品を確認
  const deliveredDeliveries = await prisma.delivery.findMany({
    where: { status: 'DELIVERED' },
    include: {
      customer: { select: { companyName: true } }
    },
    orderBy: { deliveryDate: 'desc' }
  });

  console.log(`\n📦 DELIVEREDステータスの納品（請求可能）: ${deliveredDeliveries.length}件`);
  deliveredDeliveries.forEach(d => {
    console.log(`  - ${d.customer.companyName}: ${d.deliveryDate.toISOString().split('T')[0]} ¥${d.totalAmount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
