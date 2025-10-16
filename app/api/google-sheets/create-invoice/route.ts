import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

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

    // templateIdが提供されていない場合は、環境変数から取得
    if (!templateId) {
      console.log('🔍 No templateId provided, using environment variable...');
      templateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

      if (!templateId) {
        console.log('❌ GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID not set');
        return NextResponse.json(
          {
            error: '請求書用のGoogle Sheetsテンプレートが設定されていません。環境変数を確認してください。',
            suggestion: 'GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID環境変数を設定してください。'
          },
          { status: 400 }
        );
      }
      console.log('✅ Using invoice template from environment:', templateId);
    }

    // 顧客情報を取得
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { error: '指定された顧客が見つかりません' },
        { status: 404 }
      );
    }

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

    // 納品データを請求書項目に集約（税率別対応）
    const itemsMap = new Map<string, {
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
      tax_rate: number;
      subtotal: number;
      tax_amount: number;
    }>();

    deliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        const key = `${item.purchase.productName}_${item.unitPrice}_${item.taxRate}`;
        const existing = itemsMap.get(key);

        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTaxAmount = Math.floor(itemSubtotal * (item.taxRate / 100));

        if (existing) {
          existing.quantity += item.quantity;
          existing.subtotal += itemSubtotal;
          existing.tax_amount += itemTaxAmount;
          existing.amount += (itemSubtotal + itemTaxAmount);
        } else {
          itemsMap.set(key, {
            description: `${item.purchase.productName} (${delivery.deliveryDate.toISOString().split('T')[0]})`,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            subtotal: itemSubtotal,
            tax_amount: itemTaxAmount,
            amount: itemSubtotal + itemTaxAmount
          });
        }
      });
    });

    const items = Array.from(itemsMap.values());

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

    // 請求書番号を生成
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(customerId).padStart(4, '0')}`;

    // 支払期日を計算（paymentTermsに基づく）
    const daysToAdd = customer.paymentTerms === '60days' ? 60 : 30;
    const dueDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    // 請求書データを準備
    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      customer_name: customer.companyName,
      customer_address: customer.deliveryAddress,
      billing_address: customer.billingAddress || customer.deliveryAddress,
      invoice_registration_number: customer.invoiceRegistrationNumber || '',
      billing_cycle: customer.billingCycle || 'monthly',
      billing_day: customer.billingDay || 31,
      payment_terms: customer.paymentTerms || '30days',
      invoice_notes: customer.invoiceNotes || '',
      items,
      subtotal_8: subtotal8,
      tax_8: tax8,
      subtotal_10: subtotal10,
      tax_10: tax10,
      total_tax: totalTax,
      subtotal,
      tax_amount: totalTax,
      total_amount: totalAmount,
      notes: `請求期間: ${startDate} 〜 ${endDate}`
    };

    // Google Sheetsクライアントを取得
    const googleSheetsClient = getGoogleSheetsClient();

    // Google Sheetsに請求書を作成
    const result = await googleSheetsClient.createInvoiceSheet(invoiceData, templateId);

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
    
    if (error instanceof Error) {
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
      { error: errorMessage },
      { status: 500 }
    );
  }
}