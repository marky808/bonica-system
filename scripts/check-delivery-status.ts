import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.delivery.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      customer: {
        select: { companyName: true }
      },
      items: true
    }
  });

  console.log('\n=== 最新の納品データ（10件）===\n');

  deliveries.forEach((d, index) => {
    console.log(`${index + 1}. ID: ${d.id.slice(0, 8)}...`);
    console.log(`   顧客: ${d.customer.companyName}`);
    console.log(`   納品日: ${d.deliveryDate.toISOString().split('T')[0]}`);
    console.log(`   合計金額: ¥${d.totalAmount.toLocaleString()}`);
    console.log(`   ステータス: ${d.status}`);
    console.log(`   Google Sheet ID: ${d.googleSheetId || '未設定'}`);
    console.log(`   Google Sheet URL: ${d.googleSheetUrl ? '設定済み' : '未設定'}`);
    console.log(`   明細数: ${d.items.length}`);
    console.log(`   作成日時: ${d.createdAt.toISOString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
