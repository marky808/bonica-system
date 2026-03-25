import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGoogleSheetsClient, type InvoiceDataV2 } from '@/lib/google-sheets-client';

/**
 * 締め日に基づいて請求期間を計算
 * @param year 対象年
 * @param month 対象月
 * @param billingDay 締め日（1-31）
 * @returns { startDate: Date, endDate: Date }
 */
function calculateBillingPeriod(
  year: number,
  month: number,
  billingDay: number
): { startDate: Date; endDate: Date } {
  // 締め日が28以上の場合（月末締め）
  if (billingDay >= 28) {
    // 対象月の1日から末日まで
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0); // 月末
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // 通常の締め日（1-27）
  // 開始日: 前月の締め日翌日
  const startDate = new Date(year, month - 2, billingDay + 1);
  startDate.setHours(0, 0, 0, 0);

  // 終了日: 対象月の締め日
  const endDate = new Date(year, month - 1, billingDay);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * GET /api/invoices/monthly
 * 月次納品集計データを取得
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');
    const customerId = searchParams.get('customerId');

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '有効な年月を指定してください' },
        { status: 400 }
      );
    }

    console.log(`📊 月次集計データ取得: ${year}年${month}月`, customerId ? `顧客: ${customerId}` : '全顧客');

    // 顧客一覧を取得
    const customers = await prisma.customer.findMany({
      where: customerId && customerId !== 'all' ? { id: customerId } : undefined,
      select: {
        id: true,
        companyName: true,
        billingCycle: true,
        billingDay: true,
        paymentTerms: true,
        billingCustomerId: true,
      }
    });

    const summaries = await Promise.all(
      customers.map(async (customer) => {
        const { startDate, endDate } = calculateBillingPeriod(year, month, customer.billingDay);

        console.log(`📅 ${customer.companyName}: 締め日${customer.billingDay}日 → ${startDate.toISOString().split('T')[0]} 〜 ${endDate.toISOString().split('T')[0]}`);

        // 対象期間の納品データを取得（DELIVEREDのみ請求対象）
        const deliveries = await prisma.delivery.findMany({
          where: {
            customerId: customer.id,
            deliveryDate: { gte: startDate, lte: endDate },
            status: 'DELIVERED'
          },
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        });

        // 既存の請求書を確認
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            customerId: customer.id,
            year: year,
            month: month
          }
        });

        return {
          customerId: customer.id,
          customerName: customer.companyName,
          billingCycle: customer.billingCycle || 'monthly',
          billingDay: customer.billingDay,
          paymentTerms: customer.paymentTerms || '30days',
          deliveryCount: deliveries.length,
          totalAmount: deliveries.reduce((sum, d) => sum + d.totalAmount, 0),
          hasInvoice: !!existingInvoice,
          invoiceId: existingInvoice?.id,
          deliveryIds: deliveries.map(d => d.id),
          periodStart: startDate.toISOString().split('T')[0],
          periodEnd: endDate.toISOString().split('T')[0]
        };
      })
    );

    // 納品がある顧客のみフィルタリング
    const filteredSummaries = summaries.filter(s => s.deliveryCount > 0);

    console.log(`✅ 月次集計完了: ${filteredSummaries.length}顧客に納品データあり`);

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        summaries: filteredSummaries
      }
    });

  } catch (error: any) {
    console.error('月次請求データ取得エラー:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || '月次データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/monthly
 * 月次請求書を作成（月別スプレッドシートに集約）
 */
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);

    const body = await request.json();
    const { customerId, year, month } = body;

    if (!customerId || !year || !month) {
      return NextResponse.json(
        { error: '顧客ID、年、月が必要です' },
        { status: 400 }
      );
    }

    console.log(`📋 請求書作成開始: ${year}年${month}月 顧客ID: ${customerId}`);

    // 既存の月別スプレッドシートを確認
    const existingMonthlySpreadsheet = await prisma.monthlyInvoiceSpreadsheet.findUnique({
      where: {
        year_month: { year, month }
      }
    });
    console.log('📋 既存月別スプレッドシート:', existingMonthlySpreadsheet?.spreadsheetId || 'なし');

    // 顧客情報を取得
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        billingCustomer: {
          select: {
            id: true,
            companyName: true,
            billingAddress: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
          }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: '指定された顧客が見つかりません' },
        { status: 404 }
      );
    }

    // 締め日に基づいて期間を計算
    const { startDate, endDate } = calculateBillingPeriod(year, month, customer.billingDay);

    console.log(`📅 請求期間: ${startDate.toISOString().split('T')[0]} 〜 ${endDate.toISOString().split('T')[0]}`);

    // 対象期間の納品データを取得（DELIVEREDステータスのみ、日付順）
    const deliveries = await prisma.delivery.findMany({
      where: {
        customerId: customerId,
        deliveryDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED'
      },
      orderBy: {
        deliveryDate: 'asc'  // 日付順にソート
      },
      include: {
        items: {
          include: {
            purchase: true,
            category: true
          }
        }
      }
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: `指定期間内（${startDate.toISOString().split('T')[0]} 〜 ${endDate.toISOString().split('T')[0]}）に請求可能な納品データがありません` },
        { status: 400 }
      );
    }

    console.log(`📦 対象納品データ: ${deliveries.length}件`);

    // 請求先の決定
    const billingCompanyName = customer.billingCustomer
      ? customer.billingCustomer.companyName
      : customer.companyName;
    const billingAddress = customer.billingCustomer
      ? customer.billingCustomer.billingAddress
      : customer.billingAddress;

    console.log('📋 請求先情報:', {
      納品先: customer.companyName,
      請求先: billingCompanyName,
      別請求先設定: !!customer.billingCustomer
    });

    // 日付フォーマット関数
    function formatDateToMMDD(dateString: string): string {
      const date = new Date(dateString);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}`;
    }

    // 商品名を取得するヘルパー関数
    function getProductName(item: any): string {
      if (item.productName) return item.productName;
      if (item.purchase) return item.purchase.productName;
      return '不明';
    }

    // 納品データを請求書項目に変換
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
          delivery_destination: customer.companyName,  // 納品先名
          product_name: displayProductName,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          unit: item.unit || item.purchase?.unit || 'kg',
          tax_rate: item.taxRate === 8 ? '8%' : '10%'
        });
      });
    });

    console.log(`📋 請求書明細: ${items.length}件`);

    // 請求書番号を生成
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}-${timestamp}`;

    // 請求日（今日）
    const invoiceDate = new Date().toISOString().split('T')[0];

    // テンプレートIDを取得
    const templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID;
    if (!templateId) {
      return NextResponse.json(
        { error: '請求書テンプレートが設定されていません' },
        { status: 500 }
      );
    }

    // 税率別集計を計算（Google Sheetsへ渡す前に計算）
    const items8 = items.filter(item => item.tax_rate === '8%');
    const items10 = items.filter(item => item.tax_rate === '10%');

    const subtotal8 = items8.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const subtotal10 = items10.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    const tax8 = Math.round(subtotal8 * 0.08);
    const tax10 = Math.round(subtotal10 * 0.1);

    const totalTax = tax8 + tax10;
    const subtotal = subtotal8 + subtotal10;
    const totalAmount = subtotal + totalTax;

    console.log(`📊 請求金額: 小計=${subtotal}, 税8%=${tax8}, 税10%=${tax10}, 合計=${totalAmount}`);

    // V2データ構造に変換（税率別集計・合計を含む）
    const invoiceDataV2: InvoiceDataV2 = {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      customer_name: billingCompanyName,
      customer_address: billingAddress,
      items: items,
      // 税率別集計・合計をスプレッドシートに書き込み
      subtotal_8: subtotal8,
      tax_8: tax8,
      subtotal_10: subtotal10,
      tax_10: tax10,
      subtotal: subtotal,
      total_tax: totalTax,
      total_amount: totalAmount
    };

    console.log('📋 請求書データ:', invoiceDataV2);

    // Google Sheetsに請求書を作成（月別スプレッドシートに集約）
    const googleSheetsClient = getGoogleSheetsClient();
    const result = await googleSheetsClient.createOrAddInvoiceToMonthlySheet(
      invoiceDataV2,
      templateId,
      year,
      month,
      customer.companyName,  // 納品先名をタブ名に使用
      existingMonthlySpreadsheet?.spreadsheetId
    );

    // 新しいスプレッドシートが作成された場合、DBに保存
    let monthlySpreadsheetId = existingMonthlySpreadsheet?.id;
    if (result.isNewSpreadsheet) {
      const newMonthlySpreadsheet = await prisma.monthlyInvoiceSpreadsheet.create({
        data: {
          year,
          month,
          spreadsheetId: result.spreadsheetId,
          spreadsheetUrl: result.spreadsheetUrl
        }
      });
      monthlySpreadsheetId = newMonthlySpreadsheet.id;
      console.log('✅ 新しい月別スプレッドシートをDBに保存:', newMonthlySpreadsheet.id);
    }

    // 請求書をデータベースに保存（月別スプレッドシートへの参照を含む）
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        customerId: customerId,
        invoiceDate: new Date(),
        month: month,
        year: year,
        totalAmount: totalAmount,
        status: 'ISSUED',
        googleSheetId: result.spreadsheetId,
        googleSheetUrl: result.spreadsheetUrl,
        deliveryIds: JSON.stringify(deliveries.map(d => d.id)),
        monthlySpreadsheetId: monthlySpreadsheetId,
        sheetTabName: result.tabName
      }
    });

    // 関連する納品データのステータスを更新（請求済みに変更）
    await prisma.delivery.updateMany({
      where: {
        id: { in: deliveries.map(d => d.id) }
      },
      data: {
        status: 'INVOICED'
      }
    });

    console.log(`✅ ${deliveries.length}件の納品をINVOICEDに更新`);

    // PDFエクスポートを試行
    let pdfUrl = null;
    try {
      pdfUrl = await googleSheetsClient.exportToPdf(result.spreadsheetId);
    } catch (pdfError) {
      console.warn('⚠️ PDF export failed:', pdfError);
    }

    console.log(`✅ 請求書作成完了: ${invoiceNumber} (タブ: ${result.tabName})`);

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoiceNumber,
      spreadsheetId: result.spreadsheetId,
      url: result.spreadsheetUrl,
      tabName: result.tabName,
      pdfUrl: pdfUrl,
      totalAmount: totalAmount,
      deliveryCount: deliveries.length,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      isNewSpreadsheet: result.isNewSpreadsheet
    });

  } catch (error: any) {
    console.error('請求書作成エラー:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || '請求書の作成に失敗しました',
        details: error.message
      },
      { status: 500 }
    );
  }
}
