import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  let deliveryId: string = '';
  let templateId: string = '';

  try {
    const body = await request.json();
    ({ deliveryId, templateId } = body);

    console.log('📊 Delivery sheet creation request:', { deliveryId, templateId });

    if (!deliveryId || !templateId) {
      return NextResponse.json(
        { error: 'Delivery ID and template ID are required' },
        { status: 400 }
      );
    }

    // 納品データを取得
    console.log('🔍 Fetching delivery data for ID:', deliveryId);
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        customer: true,
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
      status: delivery.status
    });

    // Google Sheetsクライアントを取得
    console.log('🔧 Initializing Google Sheets client...');
    const googleSheetsClient = getGoogleSheetsClient();
    console.log('✅ Google Sheets client initialized');

    // テンプレートIDのログ出力とテンプレート確認（デバッグ用）
    console.log('🔍 Using templateId:', templateId);

    // テンプレートIDの妥当性をログ出力（詳細なエラーは実際の作成時に判明）
    console.log('📋 Template validation will be performed during sheet creation');

    // 納品書データを準備
    console.log('🔍 Delivery ID for number generation:', delivery.id);
    console.log('🔍 Existing delivery number:', delivery.deliveryNumber);

    // より安全な納品書番号生成
    let generatedNumber = 'DEL-UNKNOWN';
    if (delivery.id && typeof delivery.id === 'string' && delivery.id.length >= 8) {
      generatedNumber = `DEL-${delivery.id.slice(0, 8)}`;
    } else if (delivery.id) {
      generatedNumber = `DEL-${delivery.id}`;
    } else {
      generatedNumber = `DEL-${Date.now().toString().slice(-8)}`;
    }

    const finalDeliveryNumber = delivery.deliveryNumber || generatedNumber;

    console.log('🔍 Generated number:', generatedNumber);
    console.log('🔍 Final delivery number:', finalDeliveryNumber);

    const deliveryData = {
      delivery_number: finalDeliveryNumber,
      delivery_date: delivery.deliveryDate.toISOString().split('T')[0],
      customer_name: delivery.customer.companyName,
      customer_address: delivery.customer.deliveryAddress,
      items: delivery.items.map(item => ({
        product_name: item.purchase.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount
      })),
      total_amount: delivery.totalAmount,
      notes: delivery.notes || ''
    };

    console.log('📋 Prepared delivery data:', deliveryData);

    // Google Sheetsに納品書を作成
    console.log('📊 Creating delivery sheet with templateId:', templateId);
    const result = await googleSheetsClient.createDeliverySheet(deliveryData, templateId);
    console.log('✅ Delivery sheet created:', result);

    // データベースを更新（ステータスも更新）
    console.log('🔄 Updating delivery status to DELIVERED for ID:', deliveryId);
    const updatedDelivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        googleSheetId: result.sheetId,
        googleSheetUrl: result.url,
        status: 'DELIVERED' // Google Sheets納品書作成完了でDELIVEREDステータスに
      }
    });

    console.log('✅ Database updated with sheet info and status changed to DELIVERED:', {
      id: updatedDelivery.id,
      status: updatedDelivery.status,
      googleSheetId: updatedDelivery.googleSheetId
    });

    return NextResponse.json({
      success: true,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: await googleSheetsClient.exportToPdf(result.sheetId)
    });

  } catch (error) {
    console.error('❌ DETAILED ERROR in delivery sheet creation:', error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));

    // デバッグ用：実際のエラー詳細を返す
    let errorMessage = 'Google Sheets納品書の作成に失敗しました';
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('DECODER routines') || error.message.includes('JWT')) {
        errorMessage = 'Google Sheets APIの認証に失敗しました。環境変数を確認してください。';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Google Sheets APIへのアクセス権限がありません。サービスアカウントの設定を確認してください。';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Google Sheetsテンプレートにアクセスできません。テンプレートの共有設定を確認してください。';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'Google Sheetsテンプレートが見つかりません。テンプレートIDを確認してください。';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (error.message.includes('Template not found') || error.message.includes('テンプレート')) {
        errorMessage = 'テンプレートが存在しません。先にテンプレートを作成してください。';
      }
    }

    // エラーが発生してもdeliveryのステータスをERRORに更新して追跡可能にする
    try {
      console.log('🔄 Attempting to update delivery status to ERROR for ID:', deliveryId);
      const updatedDelivery = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'ERROR',
          notes: `Google Sheets作成エラー: ${errorDetails || errorMessage}`
        }
      });
      console.log('✅ Delivery status updated to ERROR for tracking:', updatedDelivery.status);
    } catch (updateError) {
      console.error('❌ Failed to update delivery status to ERROR:', updateError);
      console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        templateId: templateId, // デバッグ情報
        deliveryId: deliveryId, // デバッグ情報
        debugInfo: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}