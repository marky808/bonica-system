import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient, type DeliveryDataV2 } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

/**
 * 新しい9列構造テンプレート（V2）を使用した納品書作成API
 */
export async function POST(request: NextRequest) {
  let deliveryId: string = '';
  let templateId: string | undefined = '';

  try {
    const body = await request.json();
    ({ deliveryId, templateId } = body);

    console.log('📊 Delivery sheet V2 creation request:', { deliveryId, templateId });

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'Delivery ID is required' },
        { status: 400 }
      );
    }

    // templateIdが提供されていない場合は、環境変数から取得（V2優先）
    if (!templateId) {
      console.log('🔍 No templateId provided, using environment variable...');
      templateId = process.env.GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID;

      if (!templateId) {
        console.log('❌ GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID not set');
        return NextResponse.json(
          {
            error: '新しい納品書用テンプレートが設定されていません。環境変数を確認してください。',
            suggestion: 'GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID環境変数を設定してください。'
          },
          { status: 400 }
        );
      }

      templateId = templateId.trim();
      console.log('✅ Using new delivery template V2 from environment:', templateId);
    }

    // 納品データを取得
    console.log('🔍 Fetching delivery data for ID:', deliveryId);
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            deliveryAddress: true,
            billingAddress: true,
            deliveryTimePreference: true,
            specialRequests: true,
            specialNotes: true,
            billingCycle: true,
            billingDay: true,
            paymentTerms: true,
            invoiceRegistrationNumber: true,
            invoiceNotes: true,
          }
        },
        items: {
          include: {
            purchase: true
          }
        }
      }
    });

    if (!delivery) {
      console.log('❌ Delivery not found:', deliveryId);
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    console.log('✅ Delivery data retrieved:', {
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      customer: delivery.customer?.companyName,
      itemsCount: delivery.items.length,
    });

    // Google Sheetsクライアント初期化
    console.log('🔧 Initializing Google Sheets client...');
    const googleSheetsClient = getGoogleSheetsClient();
    console.log('✅ Google Sheets client initialized successfully');

    // 納品書番号を生成または取得
    let deliveryNumber = delivery.deliveryNumber;

    if (!deliveryNumber || deliveryNumber.trim() === '') {
      const idString = String(delivery.id);
      if (idString.startsWith('cl') && idString.length >= 10) {
        const uniquePart = idString.slice(2, 10);
        deliveryNumber = `DEL-${uniquePart.toUpperCase()}`;
      } else if (idString.length >= 8) {
        deliveryNumber = `DEL-${idString.slice(0, 8).toUpperCase()}`;
      } else {
        deliveryNumber = `DEL-${idString.padStart(8, '0')}`;
      }
      console.log('✅ Generated delivery number:', deliveryNumber);
    }

    // 日付フォーマット関数（YYYY-MM-DD → MM/DD）
    function formatDateToMMDD(dateString: string): string {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    }

    // V2データ構造に変換
    // 直接入力モードの場合は item.productName を使用、通常モードは item.purchase.productName を使用
    const deliveryDataV2: DeliveryDataV2 = {
      delivery_number: deliveryNumber,
      delivery_date: delivery.deliveryDate.toISOString().split('T')[0],
      customer_name: delivery.customer.companyName,
      customer_address: delivery.customer.deliveryAddress,
      items: delivery.items.map(item => ({
        date: formatDateToMMDD(item.deliveryDate?.toISOString() || delivery.deliveryDate.toISOString()),
        product_name: item.purchase?.productName || item.productName || '商品名なし',
        unit_price: item.unitPrice,
        quantity: item.quantity, // 整数の場合は10、小数の場合は10.5のように自然な形で
        unit: item.unit || 'kg',
        tax_rate: item.taxRate === 8 ? '8%' : '10%',
        notes: ''
      })),
      // 合計金額（税込）を追加 - シート上部に大きく表示される
      total_amount: delivery.totalAmount
    };

    console.log('📋 Prepared delivery data V2:', deliveryDataV2);

    // Google Sheetsに納品書を作成（V2メソッド）
    console.log('📊 Creating delivery sheet V2 with templateId:', templateId);
    const result = await googleSheetsClient.createDeliverySheetV2(deliveryDataV2, templateId);
    console.log('✅ Delivery sheet V2 created successfully:', result);

    // データベースを更新
    console.log('🔄 Updating delivery status to DELIVERED for ID:', deliveryId);
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        googleSheetId: result.sheetId,
        googleSheetUrl: result.url,
        status: 'DELIVERED',
        ...((!delivery.deliveryNumber || delivery.deliveryNumber.trim() === '') && {
          deliveryNumber: deliveryNumber
        })
      }
    });

    console.log('✅ Database updated with sheet info and status changed to DELIVERED');

    // PDFエクスポートを試行
    let pdfUrl = null;
    try {
      console.log('📕 Attempting PDF export...');
      pdfUrl = await googleSheetsClient.exportToPdf(result.sheetId);
      console.log('✅ PDF export successful:', pdfUrl);
    } catch (pdfError) {
      console.warn('⚠️ PDF export failed (but sheet creation was successful):', pdfError);
    }

    return NextResponse.json({
      success: true,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: pdfUrl,
      version: 'V2',
      deliveryNumber: deliveryNumber
    });

  } catch (error) {
    console.error('❌ Error in delivery sheet V2 creation:', error);

    let errorMessage = 'Google Sheets納品書（V2）の作成に失敗しました';
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('OAuth') || error.message.includes('認証')) {
        errorMessage = 'Google Sheets APIの認証に失敗しました。OAuth 2.0設定を確認してください。';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'テンプレートへのアクセス権限がありません。テンプレートの共有設定を確認してください。';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'テンプレートが見つかりません。テンプレートIDを確認してください。';
      }
    }

    // エラー発生時にステータスをERRORに更新
    try {
      if (deliveryId) {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'ERROR',
            notes: `V2作成エラー [${new Date().toISOString()}]: ${errorDetails || errorMessage}`.slice(0, 500)
          }
        });
      }
    } catch (updateError) {
      console.error('❌ Failed to update delivery status to ERROR:', updateError);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        version: 'V2',
        debugInfo: {
          templateId: templateId,
          deliveryId: deliveryId,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        }
      },
      { status: 500 }
    );
  }
}
