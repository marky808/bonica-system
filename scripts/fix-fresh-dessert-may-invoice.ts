#!/usr/bin/env tsx
/**
 * フレッシュデザート株式会社 5月分請求書の重複解消・統合
 *
 * 実行内容（EXECUTE=1 の場合のみ書き込みを行う。指定なしはdry-run）:
 * 1. 重複請求書 IQU2 / 34F8 に紐づく実在の納品ステータスを DELIVERED に戻す
 * 2. IQU2 / 34F8 の Invoice レコードを削除
 * 3. 本来の請求書 INV-202605-6KD4 について、再発行API（reissue）と同一のロジックで
 *    - 自身の deliveryIds を DELIVERED に戻す
 *    - 5月の請求期間内で DELIVERED になっている納品を全件（12件想定）再集計
 *    - 同じGoogle Sheetsタブ（5月分_フレッシュデザート株式会社）を正しい内容で上書き
 *    - Invoice レコード（id・invoice_numberは維持）を更新し、対象納品をINVOICEDに戻す
 */
import { PrismaClient } from '@prisma/client';
import { getGoogleSheetsClient, type InvoiceDataV2 } from '../lib/google-sheets-client';
import { calculateBillingPeriod } from '../lib/billing';

const prisma = new PrismaClient();
const EXECUTE = process.env.EXECUTE === '1';

const CUSTOMER_ID = 'cml9b8jth0001w2bwqs8eimpd';
const CANONICAL_INVOICE_ID = 'cms8b6ncu00021gbo260he3bi'; // INV-202605-6KD4
const DUPLICATE_INVOICE_IDS = ['cmse7ispt000947s9wez22p38', 'cmsin36vr000812zras99bhbi']; // IQU2, 34F8

function formatDateToMMDD(dateString: string): string {
  const date = new Date(dateString);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

function getProductName(item: any): string {
  if (item.productName) return item.productName;
  if (item.purchase) return item.purchase.productName;
  return '不明';
}

async function main() {
  console.log(`=== フレッシュデザート5月分請求書修復 (${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}) ===\n`);

  const canonicalInvoice = await prisma.invoice.findUnique({ where: { id: CANONICAL_INVOICE_ID } });
  if (!canonicalInvoice) throw new Error('canonical invoice not found');

  const duplicateInvoices = await prisma.invoice.findMany({ where: { id: { in: DUPLICATE_INVOICE_IDS } } });
  console.log(`統合先: ${canonicalInvoice.invoice_number} (${canonicalInvoice.id})`);
  console.log(`削除予定: ${duplicateInvoices.map(i => i.invoice_number).join(', ')}\n`);

  // Step 1: 重複請求書に紐づく実在納品IDを収集
  let dupDeliveryIds: string[] = [];
  for (const inv of duplicateInvoices) {
    try {
      dupDeliveryIds.push(...JSON.parse(inv.deliveryIds));
    } catch {}
  }
  const existingDupDeliveries = await prisma.delivery.findMany({
    where: { id: { in: dupDeliveryIds } },
    select: { id: true, deliveryNumber: true, status: true },
  });
  console.log(`Step1: 重複請求書に紐づく実在納品 ${existingDupDeliveries.length}件 を DELIVERED に戻す`);
  console.table(existingDupDeliveries);

  if (EXECUTE) {
    await prisma.delivery.updateMany({
      where: { id: { in: existingDupDeliveries.map(d => d.id) } },
      data: { status: 'DELIVERED' },
    });
    console.log('✅ Step1 実行完了');
  }

  console.log(`\nStep2: 重複請求書レコード削除 (${DUPLICATE_INVOICE_IDS.join(', ')})`);
  if (EXECUTE) {
    await prisma.invoice.deleteMany({ where: { id: { in: DUPLICATE_INVOICE_IDS } } });
    console.log('✅ Step2 実行完了');
  }

  // Step3: canonical invoice を再発行ロジックで統合
  const customer = await prisma.customer.findUnique({
    where: { id: CUSTOMER_ID },
    include: { billingCustomer: { select: { id: true, companyName: true, billingAddress: true } } },
  });
  if (!customer) throw new Error('customer not found');

  let canonicalOldIds: string[] = [];
  try { canonicalOldIds = JSON.parse(canonicalInvoice.deliveryIds); } catch {}

  console.log(`\nStep3: ${canonicalInvoice.invoice_number} 自身の旧納品(${canonicalOldIds.length}件)を DELIVERED に戻す`);
  if (EXECUTE) {
    await prisma.delivery.updateMany({
      where: { id: { in: canonicalOldIds }, status: 'INVOICED' },
      data: { status: 'DELIVERED' },
    });
  }

  const { startDate, endDate } = calculateBillingPeriod(canonicalInvoice.year, canonicalInvoice.month, customer.billingDay);
  console.log(`請求期間: ${startDate.toISOString()} 〜 ${endDate.toISOString()}`);

  // dry-runでも「今この時点でDELIVEREDになっているはずの集合」をシミュレートするため、
  // EXECUTEでない場合は対象納品を明示的に取得（Step1/3のupdateが未実行なので、状態を仮定して表示）
  const targetIds = new Set([...existingDupDeliveries.map(d => d.id), ...canonicalOldIds]);
  const deliveries = await prisma.delivery.findMany({
    where: EXECUTE
      ? { customerId: CUSTOMER_ID, deliveryDate: { gte: startDate, lte: endDate }, status: 'DELIVERED' }
      : { customerId: CUSTOMER_ID, deliveryDate: { gte: startDate, lte: endDate }, id: { in: Array.from(targetIds) } },
    orderBy: { deliveryDate: 'asc' },
    include: { items: { include: { purchase: true, category: true } } },
  });

  console.log(`\n再集計対象納品: ${deliveries.length}件`);
  console.table(deliveries.map(d => ({ id: d.id.slice(0, 12), deliveryNumber: d.deliveryNumber, deliveryDate: d.deliveryDate.toISOString().split('T')[0], totalAmount: d.totalAmount })));

  const billingCompanyName = customer.billingCustomer ? customer.billingCustomer.companyName : customer.companyName;
  const billingAddress = customer.billingCustomer ? customer.billingCustomer.billingAddress : customer.billingAddress;

  const items: Array<{ date: string; delivery_destination: string; product_name: string; unit_price: number; quantity: number; unit: string; tax_rate: string }> = [];
  deliveries.forEach(delivery => {
    const isReturn = (delivery as any).type === 'RETURN';
    delivery.items.forEach(item => {
      const productName = getProductName(item);
      const displayProductName = isReturn ? `【返品】${productName}` : productName;
      items.push({
        date: formatDateToMMDD(delivery.deliveryDate.toISOString()),
        delivery_destination: customer.companyName,
        product_name: displayProductName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        unit: item.unit || item.purchase?.unit || 'kg',
        tax_rate: item.taxRate === 8 ? '8%' : '10%',
      });
    });
  });

  const items8 = items.filter(i => i.tax_rate === '8%');
  const items10 = items.filter(i => i.tax_rate === '10%');
  const subtotal8 = items8.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const subtotal10 = items10.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax8 = Math.round(subtotal8 * 0.08);
  const tax10 = Math.round(subtotal10 * 0.1);
  const totalTax = tax8 + tax10;
  const subtotal = subtotal8 + subtotal10;
  const totalAmount = subtotal + totalTax;

  console.log(`\n再計算後の金額: 小計8%=${subtotal8}, 小計10%=${subtotal10}, 消費税8%=${tax8}, 消費税10%=${tax10}, 合計=${totalAmount}`);
  console.log(`(参考) 現在のcanonical請求書totalAmount: ${canonicalInvoice.totalAmount}`);

  if (!EXECUTE) {
    console.log('\n--- DRY-RUN のため、Google Sheets書き込み・DB更新は行っていません ---');
    return;
  }

  const templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID;
  if (!templateId) throw new Error('GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID not set');

  const invoiceDataV2: InvoiceDataV2 = {
    invoice_number: canonicalInvoice.invoice_number,
    invoice_date: new Date().toISOString().split('T')[0],
    customer_name: billingCompanyName,
    customer_address: billingAddress,
    items,
    subtotal_8: subtotal8,
    tax_8: tax8,
    subtotal_10: subtotal10,
    tax_10: tax10,
    subtotal,
    total_tax: totalTax,
    total_amount: totalAmount,
  };

  const googleSheetsClient = getGoogleSheetsClient();
  const result = await googleSheetsClient.createOrAddInvoiceToMonthlySheet(
    invoiceDataV2,
    templateId,
    canonicalInvoice.year,
    canonicalInvoice.month,
    customer.companyName,
    canonicalInvoice.googleSheetId!
  );
  console.log('✅ Google Sheets更新完了:', result.spreadsheetUrl, result.tabName);

  const newDeliveryIds = deliveries.map(d => d.id);
  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: CANONICAL_INVOICE_ID },
      data: {
        invoiceDate: new Date(),
        totalAmount,
        deliveryIds: JSON.stringify(newDeliveryIds),
        googleSheetId: result.spreadsheetId,
        googleSheetUrl: result.spreadsheetUrl,
        sheetTabName: result.tabName,
        status: 'ISSUED',
      },
    });
    await tx.delivery.updateMany({ where: { id: { in: newDeliveryIds } }, data: { status: 'INVOICED' } });
    return inv;
  });

  console.log(`\n✅ 完了: ${updated.invoice_number}, 納品${newDeliveryIds.length}件, 合計¥${totalAmount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
