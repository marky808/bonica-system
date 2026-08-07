import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGoogleSheetsClient, type InvoiceDataV2 } from '@/lib/google-sheets-client';
import { calculateBillingPeriod } from '@/lib/billing';

/**
 * POST /api/invoices/[id]/reissue
 *
 * 請求書を「同じ請求書番号のまま」再発行する。
 * 1. この請求書に紐付いていた納品を INVOICED → DELIVERED に戻す
 * 2. 対象の請求期間内で DELIVERED になっている納品（戻した分＋新たに追加された分）を全件再集計
 * 3. 既存のGoogle Sheets（同一スプレッドシート・同一タブ）を上書き更新
 * 4. Invoice レコードを同じID・同じ invoice_number のまま更新（発行日のみ最新化）
 * 5. 再集計対象の納品をすべて INVOICED に戻す
 *
 * 途中でGoogle Sheets更新に失敗した場合は、納品ステータスを元（INVOICED）に戻す。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);

    const invoiceId = params.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    }

    if (!invoice.googleSheetId) {
      return NextResponse.json(
        { error: 'この請求書にはGoogle Sheetsのスプレッドシート情報が保存されていないため再発行できません' },
        { status: 400 }
      );
    }

    const templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID;
    if (!templateId) {
      return NextResponse.json({ error: '請求書テンプレートが設定されていません' }, { status: 500 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: invoice.customerId },
      include: {
        billingCustomer: {
          select: {
            id: true,
            companyName: true,
            billingAddress: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 });
    }

    let oldDeliveryIds: string[] = [];
    try {
      oldDeliveryIds = JSON.parse(invoice.deliveryIds);
    } catch {
      console.warn(`⚠️ deliveryIds パース失敗: invoiceId=${invoiceId}`);
    }

    console.log(`🔄 請求書再発行開始: ${invoice.invoice_number} (id=${invoiceId})`);
    console.log(`  旧納品件数: ${oldDeliveryIds.length}件`);

    const { startDate, endDate } = calculateBillingPeriod(invoice.year, invoice.month, customer.billingDay);

    // 旧納品をDELIVEREDに戻したうえで、対象期間の請求可能な納品を全件再取得
    const deliveries = await prisma.$transaction(async (tx) => {
      if (oldDeliveryIds.length > 0) {
        await tx.delivery.updateMany({
          where: { id: { in: oldDeliveryIds }, status: 'INVOICED' },
          data: { status: 'DELIVERED' },
        });
      }

      return tx.delivery.findMany({
        where: {
          customerId: invoice.customerId,
          deliveryDate: { gte: startDate, lte: endDate },
          status: 'DELIVERED',
        },
        orderBy: { deliveryDate: 'asc' },
        include: {
          items: {
            include: { purchase: true, category: true },
          },
        },
      });
    });

    if (deliveries.length === 0) {
      // 請求対象がなくなった場合は何もしなかったことにする
      if (oldDeliveryIds.length > 0) {
        await prisma.delivery.updateMany({
          where: { id: { in: oldDeliveryIds } },
          data: { status: 'INVOICED' },
        });
      }
      return NextResponse.json(
        { error: '対象期間内に請求可能な納品データがなくなったため、再発行を中止し元の状態に戻しました' },
        { status: 400 }
      );
    }

    console.log(`  再集計後の納品件数: ${deliveries.length}件`);

    // 請求先の決定
    const billingCompanyName = customer.billingCustomer
      ? customer.billingCustomer.companyName
      : customer.companyName;
    const billingAddress = customer.billingCustomer
      ? customer.billingCustomer.billingAddress
      : customer.billingAddress;

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

    const items: Array<{
      date: string;
      delivery_destination: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      unit: string;
      tax_rate: string;
    }> = [];

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

    // 税率別集計を計算（monthly作成時と同じロジック）
    const items8 = items.filter(item => item.tax_rate === '8%');
    const items10 = items.filter(item => item.tax_rate === '10%');

    const subtotal8 = items8.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const subtotal10 = items10.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    const tax8 = Math.round(subtotal8 * 0.08);
    const tax10 = Math.round(subtotal10 * 0.1);

    const totalTax = tax8 + tax10;
    const subtotal = subtotal8 + subtotal10;
    const totalAmount = subtotal + totalTax;

    console.log(`  再集計金額: 小計=${subtotal}, 税8%=${tax8}, 税10%=${tax10}, 合計=${totalAmount}`);

    // 発行日は再発行時の日付に更新。請求書番号は変更しない。
    const invoiceDate = new Date().toISOString().split('T')[0];

    const invoiceDataV2: InvoiceDataV2 = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoiceDate,
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

    let googleSheetsClient;
    let result;
    try {
      googleSheetsClient = getGoogleSheetsClient();

      // 既存のスプレッドシートIDを渡すことで、同名タブ（{month}月分_{customerName}）が
      // 見つかった場合はそのタブを上書き更新する（lib/google-sheets-client.ts の
      // createOrAddInvoiceToMonthlySheet を参照）。新規タブは作られない。
      result = await googleSheetsClient.createOrAddInvoiceToMonthlySheet(
        invoiceDataV2,
        templateId,
        invoice.year,
        invoice.month,
        customer.companyName,
        invoice.googleSheetId
      );
    } catch (sheetError) {
      // Google Sheetsクライアントの初期化・更新のいずれかに失敗した場合、
      // 旧納品のステータスを請求済みに戻す（DELIVEREDのまま放置しない）
      console.error('❌ Google Sheets更新に失敗、納品ステータスを元に戻します:', sheetError);
      if (oldDeliveryIds.length > 0) {
        await prisma.delivery.updateMany({
          where: { id: { in: oldDeliveryIds } },
          data: { status: 'INVOICED' },
        });
      }
      throw sheetError;
    }

    const newDeliveryIds = deliveries.map(d => d.id);

    // Invoice レコードを同じID・同じ請求書番号のまま更新し、対象納品を請求済みに戻す
    let updatedInvoice;
    try {
      updatedInvoice = await prisma.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: invoiceId },
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

        await tx.delivery.updateMany({
          where: { id: { in: newDeliveryIds } },
          data: { status: 'INVOICED' },
        });

        return updated;
      });
    } catch (dbError) {
      // この時点でGoogle Sheets側は既に新しい内容で上書き済み。
      // DB更新だけが失敗すると、シート上の金額とDB上の請求書レコードが
      // 食い違ったまま残るため、手動確認に必要な情報を明示してログに残す。
      console.error(
        `🚨 重大: 請求書再発行のDB更新に失敗しました。Google Sheetsは既に新しい内容で上書き済みのため、` +
        `手動での整合性確認が必要です。invoiceId=${invoiceId}, invoiceNumber=${invoice.invoice_number}, ` +
        `spreadsheetUrl=${result.spreadsheetUrl}, tabName=${result.tabName}, ` +
        `oldDeliveryIds=${JSON.stringify(oldDeliveryIds)}, newDeliveryIds=${JSON.stringify(newDeliveryIds)}`,
        dbError
      );
      throw dbError;
    }

    console.log(
      `✅ 請求書再発行完了: ${updatedInvoice.invoice_number} (納品${newDeliveryIds.length}件, 合計${totalAmount}円)`
    );

    let pdfUrl: string | null = null;
    try {
      pdfUrl = await googleSheetsClient.exportToPdf(result.spreadsheetId);
    } catch (pdfError) {
      console.warn('⚠️ PDF export failed:', pdfError);
    }

    return NextResponse.json({
      success: true,
      invoiceId: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoice_number,
      spreadsheetId: result.spreadsheetId,
      url: result.spreadsheetUrl,
      tabName: result.tabName,
      pdfUrl,
      totalAmount,
      deliveryCount: newDeliveryIds.length,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('❌ 請求書再発行エラー:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: error.message || '請求書の再発行に失敗しました',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
