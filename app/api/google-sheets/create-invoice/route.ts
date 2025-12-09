import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { customerId, billingCustomerId, startDate, endDate, templateId } = body;

    // billingCustomerIdが指定されている場合はそれを請求先として使用
    // customerId は単一の納品先を指定する場合に使用（後方互換性のため）
    const targetBillingCustomerId = billingCustomerId || customerId;

    if (!targetBillingCustomerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: '請求先顧客ID（または顧客ID）、期間が必要です' },
        { status: 400 }
      );
    }

    // templateIdが提供されていない場合は、環境変数から取得
    if (!templateId) {
      console.log('🔍 No templateId provided, using environment variable...');
      templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID;

      if (!templateId) {
        console.log('❌ GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID not set');
        return NextResponse.json(
          {
            error: '請求書用のGoogle Sheetsテンプレートが設定されていません。環境変数を確認してください。',
            suggestion: 'GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID環境変数を設定してください。'
          },
          { status: 400 }
        );
      }
      console.log('✅ Using invoice template from environment:', templateId);
    }

    // 請求先顧客情報を取得
    const billingCustomer = await prisma.customer.findUnique({
      where: { id: targetBillingCustomerId }
    });

    if (!billingCustomer) {
      return NextResponse.json(
        { error: '指定された請求先顧客が見つかりません' },
        { status: 404 }
      );
    }

    // この請求先に紐付く全ての納品先顧客を取得
    // 1. 自分自身（billingCustomerIdがnullまたは自分自身を指している）
    // 2. billingCustomerIdがこの請求先を指している顧客
    const deliveryCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { id: targetBillingCustomerId, billingCustomerId: null },
          { id: targetBillingCustomerId, billingCustomerId: targetBillingCustomerId },
          { billingCustomerId: targetBillingCustomerId }
        ]
      }
    });

    const deliveryCustomerIds = deliveryCustomers.map(c => c.id);
    console.log(`📋 Found ${deliveryCustomers.length} delivery customers for billing customer:`,
      deliveryCustomers.map(c => c.companyName));

    // 対象期間の納品データを取得（全ての納品先から）
    const deliveries = await prisma.delivery.findMany({
      where: {
        customerId: { in: deliveryCustomerIds },
        deliveryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'DELIVERED'
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true
          }
        },
        items: {
          include: {
            purchase: true,
            category: true
          }
        }
      },
      orderBy: [
        { deliveryDate: 'asc' },
        { customerId: 'asc' }
      ]
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: '指定期間内に完了した納品データが見つかりません' },
        { status: 404 }
      );
    }

    // 納品先が複数あるかどうかを判定
    const uniqueDeliveryCustomerIds = new Set(deliveries.map(d => d.customerId));
    const hasMultipleDestinations = uniqueDeliveryCustomerIds.size > 1;

    console.log(`📦 Found ${deliveries.length} deliveries from ${uniqueDeliveryCustomerIds.size} delivery destinations`);
    console.log(`📋 Multiple destinations: ${hasMultipleDestinations}`);

    // 請求書明細を作成（集約せず、納品ごとに明細表示）
    // 納品先が複数の場合のみ、各明細に納品先名を含める
    const items: Array<{
      date: string;
      delivery_destination: string;
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      tax_rate: number;
      subtotal: number;
      tax_amount: number;
      amount: number;
    }> = [];

    deliveries.forEach(delivery => {
      const deliveryDate = delivery.deliveryDate.toISOString().split('T')[0];
      // 納品先が複数の場合のみ納品先名を表示
      const deliveryDestination = hasMultipleDestinations ? delivery.customer.companyName : '';

      delivery.items.forEach(item => {
        const productName = item.purchase?.productName || item.productName || '不明';
        const unit = item.unit || item.purchase?.unit || '';
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTaxAmount = Math.floor(itemSubtotal * (item.taxRate / 100));

        items.push({
          date: deliveryDate,
          delivery_destination: deliveryDestination,
          description: productName,
          quantity: item.quantity,
          unit: unit,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          subtotal: itemSubtotal,
          tax_amount: itemTaxAmount,
          amount: itemSubtotal + itemTaxAmount
        });
      });
    });

    // 税率別集計
    const items8 = items.filter(item => item.tax_rate === 8);
    const items10 = items.filter(item => item.tax_rate === 10);

    const subtotal8 = items8.reduce((sum, item) => sum + item.subtotal, 0);
    const subtotal10 = items10.reduce((sum, item) => sum + item.subtotal, 0);

    const tax8 = Math.floor(subtotal8 * 0.08);
    const tax10 = Math.floor(subtotal10 * 0.1);

    const totalTax = tax8 + tax10;
    const subtotal = subtotal8 + subtotal10;
    const totalAmount = subtotal + totalTax;

    // 請求書番号を生成（請求先顧客ID + タイムスタンプで一意性を確保）
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${timestamp}`;

    // 支払期日を計算（請求先顧客のpaymentTermsに基づく）
    const paymentTerms = billingCustomer.paymentTerms || '30days';
    const daysToAdd = paymentTerms === '60days' ? 60 : 30;
    const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 納品先リストを生成（複数の納品先がある場合）
    const uniqueDeliveryDestinations = [...new Set(deliveries.map(d => d.customer.companyName))];
    const deliveryDestinationsText = uniqueDeliveryDestinations.length > 1
      ? `納品先: ${uniqueDeliveryDestinations.join(', ')}`
      : uniqueDeliveryDestinations.length === 1 && uniqueDeliveryDestinations[0] !== billingCustomer.companyName
        ? `納品先: ${uniqueDeliveryDestinations[0]}`
        : '';

    // 請求書データを準備
    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_date: now.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      // 請求先顧客名
      customer_name: billingCustomer.companyName,
      // 請求先住所
      billing_address: billingCustomer.billingAddress || billingCustomer.deliveryAddress || '',
      // 適格請求書登録番号（請求先顧客のもの）
      invoice_registration_number: billingCustomer.invoiceRegistrationNumber || '',
      // 請求サイクル（請求先顧客の設定）
      billing_cycle: billingCustomer.billingCycle || 'monthly',
      billing_day: billingCustomer.billingDay || 31,
      payment_terms: billingCustomer.paymentTerms || '30days',
      // 請求書備考（請求先顧客の設定）
      invoice_notes: billingCustomer.invoiceNotes || '',
      items,
      subtotal_8: subtotal8,
      tax_8: tax8,
      subtotal_10: subtotal10,
      tax_10: tax10,
      total_tax: totalTax,
      subtotal,
      tax_amount: totalTax,
      total_amount: totalAmount,
      // 備考欄に請求期間と納品先リストを記載
      notes: deliveryDestinationsText
        ? `請求期間: ${startDate} 〜 ${endDate}\n${deliveryDestinationsText}`
        : `請求期間: ${startDate} 〜 ${endDate}`
    };

    // Google Sheetsクライアントを取得
    const googleSheetsClient = getGoogleSheetsClient();

    // Google Sheetsに請求書を作成
    const result = await googleSheetsClient.createInvoiceSheet(invoiceData, templateId);

    // 請求書をデータベースに保存（請求先顧客に紐付け）
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        customerId: targetBillingCustomerId,
        invoiceDate: now,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
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

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: await googleSheetsClient.exportToPdf(result.sheetId)
    });

  } catch (error) {
    console.error('Error creating invoice sheet:', error);

    let errorMessage = 'Google Sheets請求書の作成に失敗しました';
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('DECODER routines') || error.message.includes('JWT')) {
        errorMessage = 'Google Sheets APIの認証に失敗しました。システム管理者にお問い合わせください。';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Google Sheets APIへのアクセス権限がありません。システム管理者にお問い合わせください。';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Google Sheetsテンプレートにアクセスできません。テンプレートの共有設定を確認してください。';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'Google Sheetsテンプレートが見つかりません。テンプレートIDを確認してください。';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}