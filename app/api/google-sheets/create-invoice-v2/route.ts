import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient, type InvoiceDataV2 } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

/**
 * 新しい9列構造テンプレート（V2）を使用した請求書作成API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { customerId, startDate, endDate, templateId } = body;

    if (!customerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: '顧客ID、期間が必要です' },
        { status: 400 }
      );
    }

    // templateIdが提供されていない場合は、環境変数から取得（V2優先）
    if (!templateId) {
      console.log('🔍 No templateId provided, using environment variable...');
      templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID;

      if (!templateId) {
        console.log('❌ GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID not set');
        return NextResponse.json(
          {
            error: '新しい請求書用テンプレートが設定されていません。環境変数を確認してください。',
            suggestion: 'GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID環境変数を設定してください。'
          },
          { status: 400 }
        );
      }
      console.log('✅ Using new invoice template V2 from environment:', templateId);
    }

    // 顧客情報を取得（請求先情報を含む）
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

    // 請求先の決定: billingCustomerが設定されている場合はそちらを使用
    const billingTarget = customer.billingCustomer || customer;
    const billingCompanyName = customer.billingCustomer
      ? customer.billingCustomer.companyName
      : customer.companyName;
    const billingAddress = customer.billingCustomer
      ? customer.billingCustomer.billingAddress
      : customer.billingAddress;

    console.log('📋 請求先情報:', {
      納品先: customer.companyName,
      請求先: billingCompanyName,
      請求先住所: billingAddress,
      別請求先設定: !!customer.billingCustomer
    });

    // 対象期間の納品データを取得
    const deliveries = await prisma.delivery.findMany({
      where: {
        customerId: customerId,
        deliveryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'DELIVERED'
      },
      include: {
        items: {
          include: {
            purchase: true
          }
        }
      }
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: '指定期間内に完了した納品データが見つかりません' },
        { status: 404 }
      );
    }

    // 日付フォーマット関数（YYYY-MM-DD → MM/DD）
    function formatDateToMMDD(dateString: string): string {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    }

    // 納品データを請求書項目に集約
    const itemsMap = new Map<string, {
      date: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      unit: string;
      tax_rate: string;
    }>();

    deliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        const key = `${item.purchase.productName}_${item.unitPrice}_${item.taxRate}`;
        const existing = itemsMap.get(key);

        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemsMap.set(key, {
            date: formatDateToMMDD(delivery.deliveryDate.toISOString()),
            product_name: item.purchase.productName,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            unit: item.unit || 'kg',
            tax_rate: item.taxRate === 8 ? '8%' : '10%',
          });
        }
      });
    });

    const items = Array.from(itemsMap.values());

    // 請求書番号を生成
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(customerId).padStart(4, '0')}`;

    // 請求日（今日）
    const invoiceDate = new Date().toISOString().split('T')[0];

    // V2データ構造に変換（請求先情報を使用）
    const invoiceDataV2: InvoiceDataV2 = {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      customer_name: billingCompanyName,
      customer_address: billingAddress,
      items: items
    };

    console.log('📋 Prepared invoice data V2:', invoiceDataV2);

    // Google Sheetsクライアントを取得
    const googleSheetsClient = getGoogleSheetsClient();

    // Google Sheetsに請求書を作成（V2メソッド）
    const result = await googleSheetsClient.createInvoiceSheetV2(invoiceDataV2, templateId);

    // 税率別集計を計算（データベース保存用）
    const items8 = items.filter(item => item.tax_rate === '8%');
    const items10 = items.filter(item => item.tax_rate === '10%');

    const subtotal8 = items8.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const subtotal10 = items10.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    const tax8 = Math.floor(subtotal8 * 0.08);
    const tax10 = Math.floor(subtotal10 * 0.1);

    const totalTax = tax8 + tax10;
    const subtotal = subtotal8 + subtotal10;
    const totalAmount = subtotal + totalTax;

    // 請求書をデータベースに保存
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        customerId: customerId,
        invoiceDate: new Date(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalAmount: totalAmount,
        status: 'DRAFT',
        googleSheetId: result.sheetId,
        googleSheetUrl: result.url,
        deliveryIds: JSON.stringify(deliveries.map(d => d.id))
      }
    });

    // 関連する納品データのステータスを更新（請求済みに変更）
    await prisma.delivery.updateMany({
      where: {
        id: {
          in: deliveries.map(d => d.id)
        }
      },
      data: {
        status: 'INVOICED'
      }
    });

    console.log(`✅ Updated ${deliveries.length} deliveries to INVOICED status`);

    // PDFエクスポートを試行
    let pdfUrl = null;
    try {
      pdfUrl = await googleSheetsClient.exportToPdf(result.sheetId);
    } catch (pdfError) {
      console.warn('⚠️ PDF export failed:', pdfError);
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: pdfUrl,
      version: 'V2',
      totalAmount: totalAmount
    });

  } catch (error) {
    console.error('Error creating invoice sheet V2:', error);

    let errorMessage = 'Google Sheets請求書（V2）の作成に失敗しました';

    if (error instanceof Error) {
      if (error.message.includes('OAuth') || error.message.includes('認証')) {
        errorMessage = 'Google Sheets APIの認証に失敗しました。OAuth 2.0設定を確認してください。';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'テンプレートへのアクセス権限がありません。テンプレートの共有設定を確認してください。';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'テンプレートが見つかりません。テンプレートIDを確認してください。';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        version: 'V2',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
