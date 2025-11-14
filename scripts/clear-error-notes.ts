import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearErrorNotes() {
  console.log('🔍 過去のエラーメッセージをクリア中...\n');

  try {
    // ERRORステータスかつnotesにエラーメッセージが含まれる納品を検索
    const errorDeliveries = await prisma.delivery.findMany({
      where: {
        OR: [
          { notes: { contains: 'Google Sheets作成エラー' } },
          { notes: { contains: 'テンプレートファイル' } },
          { notes: { contains: 'が見つかりません' } },
        ]
      },
      select: {
        id: true,
        deliveryNumber: true,
        notes: true,
        status: true,
      }
    });

    console.log(`📋 見つかった納品データ: ${errorDeliveries.length}件\n`);

    if (errorDeliveries.length === 0) {
      console.log('✅ クリアするエラーメッセージはありません');
      return;
    }

    // 確認メッセージを表示
    console.log('以下の納品データのnotesフィールドをクリアします:\n');
    errorDeliveries.forEach((delivery, index) => {
      console.log(`${index + 1}. ID: ${delivery.id}`);
      console.log(`   納品番号: ${delivery.deliveryNumber || '未設定'}`);
      console.log(`   ステータス: ${delivery.status}`);
      console.log(`   Notes: ${delivery.notes?.substring(0, 100)}...`);
      console.log('');
    });

    // バッチ更新
    const result = await prisma.delivery.updateMany({
      where: {
        OR: [
          { notes: { contains: 'Google Sheets作成エラー' } },
          { notes: { contains: 'テンプレートファイル' } },
          { notes: { contains: 'が見つかりません' } },
        ]
      },
      data: {
        notes: null,
      }
    });

    console.log(`✅ ${result.count}件の納品データのnotesをクリアしました`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearErrorNotes();
