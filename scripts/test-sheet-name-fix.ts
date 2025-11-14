import { getGoogleSheetsClient } from '../lib/google-sheets-client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSheetNameFix() {
  console.log('🧪 シート名変更機能のテスト...\n');

  try {
    // 最新の納品データを取得
    const delivery = await prisma.delivery.findFirst({
      where: {
        status: 'DELIVERED',
      },
      include: {
        customer: true,
        items: {
          include: {
            purchase: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    if (!delivery) {
      console.log('❌ テスト用の納品データが見つかりません');
      return;
    }

    console.log('📋 テスト用納品データ:');
    console.log(`  ID: ${delivery.id}`);
    console.log(`  顧客: ${delivery.customer.companyName}`);
    console.log(`  納品日: ${delivery.deliveryDate.toISOString().split('T')[0]}`);
    console.log('');

    const deliveryData = {
      delivery_number: delivery.deliveryNumber || 'TEST-001',
      delivery_date: delivery.deliveryDate.toISOString().split('T')[0],
      customer_name: delivery.customer.companyName,
      customer_address: delivery.customer.deliveryAddress,
      invoice_registration_number: delivery.customer.invoiceRegistrationNumber || '',
      invoice_notes: delivery.customer.invoiceNotes || '',
      items: delivery.items.map(item => ({
        product_name: item.purchase.productName,
        delivery_date: item.deliveryDate?.toISOString().split('T')[0] || '',
        quantity: item.quantity,
        unit: item.unit || '',
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        subtotal: item.unitPrice * item.quantity,
        tax_amount: Math.floor(item.unitPrice * item.quantity * (item.taxRate / 100)),
        amount: item.unitPrice * item.quantity + Math.floor(item.unitPrice * item.quantity * (item.taxRate / 100))
      })),
      subtotal_8: 0,
      tax_8: 0,
      subtotal_10: delivery.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      tax_10: Math.floor(delivery.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 0.1),
      total_tax: Math.floor(delivery.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 0.1),
      total_amount: delivery.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + Math.floor(delivery.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 0.1),
      notes: ''
    };

    const templateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;
    if (!templateId) {
      console.log('❌ GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID が設定されていません');
      return;
    }

    console.log('📊 納品書を作成中...');
    const googleSheetsClient = getGoogleSheetsClient();
    const result = await googleSheetsClient.createDeliverySheet(deliveryData, templateId);

    console.log('\n✅ 納品書作成成功！');
    console.log(`  シートID: ${result.sheetId}`);
    console.log(`  URL: ${result.url}`);
    console.log(`\n期待されるタブ名: ${delivery.customer.companyName}_${delivery.deliveryDate.toISOString().split('T')[0]}`);
    console.log('\n👉 上記URLにアクセスして、タブ名が正しく設定されているか確認してください');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testSheetNameFix();
