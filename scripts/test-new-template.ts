/**
 * 新しい9列構造テンプレートのテストスクリプト
 */

import { getGoogleSheetsClient } from '../lib/google-sheets-client';
import type { DeliveryDataV2, InvoiceDataV2 } from '../lib/google-sheets-client';

// 新しいテンプレートのID（Phase 1で作成）
const NEW_INVOICE_TEMPLATE_ID = '1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E';
const NEW_DELIVERY_TEMPLATE_ID = '19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4';

/**
 * 請求書テンプレートのテスト
 */
async function testInvoiceTemplate() {
  console.log('\n========================================');
  console.log('📋 請求書テンプレート（V2）のテスト開始');
  console.log('========================================\n');

  const client = getGoogleSheetsClient();

  // テストデータ（PDFサンプルを参考）
  const testData: InvoiceDataV2 = {
    invoice_number: 'S000000330',
    invoice_date: '2025/09/01',
    customer_name: 'ムスビガーデン都立大学店',
    items: [
      {
        date: '08/22',
        product_name: '広石農園バレンシアオレンジ /神奈川県',
        unit_price: 350,
        quantity: 5,
        unit: 'kg',
        tax_rate: '8%',
        notes: '',
      },
      {
        date: '08/22',
        product_name: '大塚さんのベビーリーフ',
        unit_price: 1890,
        quantity: 10,
        unit: '袋',
        tax_rate: '8%',
        notes: '',
      },
      {
        date: '08/22',
        product_name: 'トマト大玉 /長野県',
        unit_price: 2400,
        quantity: 2.5,
        unit: 'kg',
        tax_rate: '8%',
        notes: '',
      },
      {
        date: '08/22',
        product_name: '送料 ヤマト運輸 /',
        unit_price: 1800,
        quantity: 1,
        unit: '箱',
        tax_rate: '10%',
        notes: '冷蔵',
      },
    ],
  };

  try {
    console.log('🔄 請求書を作成中...');
    const result = await client.createInvoiceSheetV2(testData, NEW_INVOICE_TEMPLATE_ID);

    console.log('\n✅ 請求書作成成功！');
    console.log('📄 スプレッドシートID:', result.sheetId);
    console.log('🔗 URL:', result.url);
    console.log('\n📊 作成された請求書の内容:');
    console.log('  - 請求書番号:', testData.invoice_number);
    console.log('  - 請求日:', testData.invoice_date);
    console.log('  - 顧客:', testData.customer_name);
    console.log('  - 明細数:', testData.items.length);
    console.log('\n💡 上記URLをブラウザで開いて確認してください');

    return result;
  } catch (error: any) {
    console.error('\n❌ 請求書作成失敗:');
    console.error('エラーメッセージ:', error.message);
    if (error.cause) {
      console.error('原因:', error.cause);
    }
    throw error;
  }
}

/**
 * 納品書テンプレートのテスト
 */
async function testDeliveryTemplate() {
  console.log('\n========================================');
  console.log('📦 納品書テンプレート（V2）のテスト開始');
  console.log('========================================\n');

  const client = getGoogleSheetsClient();

  // テストデータ
  const testData: DeliveryDataV2 = {
    delivery_number: 'D000000123',
    delivery_date: '2025/11/15',
    customer_name: 'テスト取引先株式会社',
    items: [
      {
        date: '11/15',
        product_name: 'ほうれん草 /埼玉県',
        unit_price: 280,
        quantity: 10,
        unit: 'kg',
        tax_rate: '8%',
        notes: '',
      },
      {
        date: '11/15',
        product_name: 'にんじん /千葉県',
        unit_price: 150,
        quantity: 5.5,
        unit: 'kg',
        tax_rate: '8%',
        notes: '',
      },
      {
        date: '11/15',
        product_name: '配送料',
        unit_price: 1500,
        quantity: 1,
        unit: '箱',
        tax_rate: '10%',
        notes: '常温',
      },
    ],
  };

  try {
    console.log('🔄 納品書を作成中...');
    const result = await client.createDeliverySheetV2(testData, NEW_DELIVERY_TEMPLATE_ID);

    console.log('\n✅ 納品書作成成功！');
    console.log('📄 スプレッドシートID:', result.sheetId);
    console.log('🔗 URL:', result.url);
    console.log('\n📊 作成された納品書の内容:');
    console.log('  - 納品書番号:', testData.delivery_number);
    console.log('  - 納品日:', testData.delivery_date);
    console.log('  - 顧客:', testData.customer_name);
    console.log('  - 明細数:', testData.items.length);
    console.log('\n💡 上記URLをブラウザで開いて確認してください');

    return result;
  } catch (error: any) {
    console.error('\n❌ 納品書作成失敗:');
    console.error('エラーメッセージ:', error.message);
    if (error.cause) {
      console.error('原因:', error.cause);
    }
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧪 新しい9列構造テンプレートのテスト');
  console.log('=' . repeat(60));

  try {
    // 請求書テスト
    await testInvoiceTemplate();

    console.log('\n' + '='.repeat(60));

    // 納品書テスト
    await testDeliveryTemplate();

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('\n📝 次のステップ:');
    console.log('1. 作成されたスプレッドシートをブラウザで開いて確認');
    console.log('2. 計算式が正しく動作しているか確認（G列の税抜金額、H列の消費税）');
    console.log('3. 税率別集計（52-56行目）が正しく計算されているか確認');
    console.log('4. 合計金額（58-60行目）が正しいか確認');
    console.log('5. 問題なければPhase 3（本番統合）へ進む');
  } catch (error) {
    console.error('\n💥 テスト中にエラーが発生しました');
    process.exit(1);
  }
}

// スクリプト実行
main()
  .then(() => {
    console.log('\n✅ テストスクリプト終了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
