import { PrismaClient } from '@prisma/client';
import { getGoogleSheetsClient } from '../lib/google-sheets-client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// .env.localを手動で読み込む
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const prisma = new PrismaClient();

async function repairFailedDeliveries() {
  console.log('🔧 ERROR/PENDING状態の納品データ修復ツール\n');
  console.log('━'.repeat(70));

  try {
    // ERROR/PENDING状態の納品データを取得
    const failedDeliveries = await prisma.delivery.findMany({
      where: {
        OR: [
          { status: 'ERROR' },
          { status: 'PENDING', googleSheetId: null }
        ]
      },
      include: {
        customer: true,
        items: {
          include: {
            purchase: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        deliveryDate: 'desc'
      }
    });

    if (failedDeliveries.length === 0) {
      console.log('✅ 修復が必要な納品データはありません。\n');
      return;
    }

    console.log(`\n📋 修復対象の納品データ（${failedDeliveries.length}件）:\n`);

    failedDeliveries.forEach((delivery, index) => {
      console.log(`${index + 1}. ID: ${delivery.id.slice(0, 8)}...`);
      console.log(`   顧客: ${delivery.customer.companyName}`);
      console.log(`   納品日: ${delivery.deliveryDate.toISOString().split('T')[0]}`);
      console.log(`   合計金額: ¥${delivery.totalAmount.toLocaleString()}`);
      console.log(`   ステータス: ${delivery.status}`);
      console.log(`   明細数: ${delivery.items.length}`);
      console.log('');
    });

    console.log('━'.repeat(70));
    console.log('\n⚠️  重要な注意事項:');
    console.log('   - 各納品データに対してGoogle Sheetsを作成します');
    console.log('   - ステータスを DELIVERED に更新します');
    console.log('   - データベースが変更されます');
    console.log('');

    // ユーザー確認
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('これらの納品データを修復しますか？ (yes/no): ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ 修復をキャンセルしました。\n');
      return;
    }

    console.log('\n━'.repeat(70));
    console.log('🚀 修復を開始します...\n');

    const deliveryTemplateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
    if (!deliveryTemplateId) {
      console.error('❌ エラー: GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID が設定されていません');
      return;
    }

    const googleSheetsClient = getGoogleSheetsClient();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < failedDeliveries.length; i++) {
      const delivery = failedDeliveries[i];
      console.log(`\n[${i + 1}/${failedDeliveries.length}] 処理中: ${delivery.customer.companyName}`);
      console.log(`   ID: ${delivery.id.slice(0, 8)}...`);

      try {
        // 納品番号を生成（存在しない場合）
        const deliveryNumber = delivery.deliveryNumber || `DEL-${delivery.id.slice(0, 8)}`;

        // 商品明細を整形（税率別に計算）
        const items = delivery.items.map(item => {
          const taxRate = item.taxRate || 10;
          const subtotal = item.quantity * item.unitPrice;
          const taxAmount = Math.floor(subtotal * (taxRate / 100));
          const amount = subtotal + taxAmount;

          return {
            product_name: item.purchase.productName,
            delivery_date: item.deliveryDate?.toISOString().split('T')[0] || delivery.deliveryDate.toISOString().split('T')[0],
            quantity: item.quantity,
            unit: item.unit || item.purchase.unit,
            unit_price: item.unitPrice,
            tax_rate: taxRate,
            subtotal: subtotal,
            tax_amount: taxAmount,
            amount: amount
          };
        });

        // 税率別集計
        const subtotal_8 = items
          .filter(item => item.tax_rate === 8)
          .reduce((sum, item) => sum + item.subtotal, 0);

        const tax_8 = items
          .filter(item => item.tax_rate === 8)
          .reduce((sum, item) => sum + item.tax_amount, 0);

        const subtotal_10 = items
          .filter(item => item.tax_rate === 10)
          .reduce((sum, item) => sum + item.subtotal, 0);

        const tax_10 = items
          .filter(item => item.tax_rate === 10)
          .reduce((sum, item) => sum + item.tax_amount, 0);

        const total_tax = tax_8 + tax_10;
        const total_amount = subtotal_8 + tax_8 + subtotal_10 + tax_10;

        // Google Sheetsデータを作成
        const deliveryData = {
          delivery_number: deliveryNumber,
          delivery_date: delivery.deliveryDate.toISOString().split('T')[0],
          customer_name: delivery.customer.companyName,
          customer_address: delivery.customer.deliveryAddress || delivery.customer.address || '',
          invoice_registration_number: delivery.customer.invoiceRegistrationNumber || '',
          invoice_notes: delivery.customer.invoiceNotes || '',
          items: items,
          subtotal_8: subtotal_8,
          tax_8: tax_8,
          subtotal_10: subtotal_10,
          tax_10: tax_10,
          total_tax: total_tax,
          total_amount: total_amount,
          notes: delivery.notes || ''
        };

        console.log('   📄 Google Sheetsを作成中...');

        // Google Sheetsを作成
        const result = await googleSheetsClient.createDeliverySheet(
          deliveryData,
          deliveryTemplateId
        );

        console.log(`   ✅ Google Sheets作成成功: ${result.sheetId}`);
        console.log(`   🔗 URL: ${result.url}`);

        // データベースを更新
        console.log('   💾 データベースを更新中...');

        await prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            status: 'DELIVERED',
            googleSheetId: result.sheetId,
            googleSheetUrl: result.url,
            deliveryNumber: deliveryNumber
          }
        });

        console.log('   ✅ データベース更新完了');
        successCount++;

      } catch (error: any) {
        console.error(`   ❌ エラー: ${error.message}`);
        failCount++;

        // エラーが発生してもステータスをERRORに更新
        await prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            status: 'ERROR'
          }
        });
      }
    }

    console.log('\n━'.repeat(70));
    console.log('🎉 修復処理が完了しました！\n');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${failCount}件`);
    console.log('');

    if (successCount > 0) {
      console.log('📝 次のステップ:');
      console.log('   1. 以下のコマンドで結果を確認してください:');
      console.log('      npx tsx scripts/check-delivery-status.ts');
      console.log('');
      console.log('   2. フロントエンドから納品データを確認してください');
      console.log('');
    }

    if (failCount > 0) {
      console.log('⚠️  失敗した納品データは ERROR 状態のままです。');
      console.log('   エラーログを確認して、手動で修復してください。');
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ 致命的なエラー:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

repairFailedDeliveries();
