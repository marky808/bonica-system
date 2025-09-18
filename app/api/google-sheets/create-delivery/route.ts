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

    // 改善された納品書番号生成ロジック - より安全で確実な方式
    let generatedNumber = 'DEL-UNKNOWN';

    try {
      if (delivery.deliveryNumber && delivery.deliveryNumber.trim() !== '') {
        // 既に納品番号が設定されている場合はそれを使用
        generatedNumber = delivery.deliveryNumber;
        console.log('✅ Using existing delivery number:', generatedNumber);
      } else if (delivery.id) {
        // delivery.idベースの納品番号生成（文字列・数値両対応）
        const idString = String(delivery.id);
        
        // cuidの場合（cl***形式）の処理
        if (idString.startsWith('cl') && idString.length >= 10) {
          const uniquePart = idString.slice(2, 10); // "cl"を除いた8文字
          generatedNumber = `DEL-${uniquePart.toUpperCase()}`;
        } 
        // UUIDの場合の処理
        else if (idString.includes('-') && idString.length >= 36) {
          const shortId = idString.replace(/-/g, '').slice(0, 8).toUpperCase();
          generatedNumber = `DEL-${shortId}`;
        }
        // その他のID形式の処理
        else if (idString.length >= 8) {
          generatedNumber = `DEL-${idString.slice(0, 8).toUpperCase()}`;
        } else {
          generatedNumber = `DEL-${idString.padStart(8, '0')}`;
        }
        
        console.log('✅ Generated delivery number from ID:', {
          originalId: delivery.id,
          generatedNumber: generatedNumber
        });
      } else {
        // 最終フォールバック: タイムスタンプベース
        const timestamp = Date.now().toString();
        const shortTimestamp = timestamp.slice(-8);
        generatedNumber = `DEL-${shortTimestamp}`;
        
        console.log('⚠️ Using timestamp-based fallback number:', generatedNumber);
      }

      // 納品番号の最終検証
      if (!generatedNumber || generatedNumber === 'DEL-UNKNOWN') {
        throw new Error('Failed to generate valid delivery number');
      }

      console.log('✅ Delivery number generation successful:', {
        deliveryId: delivery.id,
        finalNumber: generatedNumber
      });
    } catch (numberError) {
      console.error('❌ Delivery number generation failed:', numberError);
      
      // 緊急フォールバック: 現在時刻 + ランダム文字列
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
      generatedNumber = `DEL-${timestamp}${randomSuffix}`;
      
      console.log('🆘 Emergency fallback delivery number:', generatedNumber);
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
        status: 'DELIVERED', // Google Sheets納品書作成完了でDELIVEREDステータスに
        // 納品番号が未設定の場合は生成した番号を保存
        ...((!delivery.deliveryNumber || delivery.deliveryNumber.trim() === '') && {
          deliveryNumber: finalDeliveryNumber
        })
      }
    });

    console.log('✅ Database updated with sheet info and status changed to DELIVERED:', {
      id: updatedDelivery.id,
      status: updatedDelivery.status,
      googleSheetId: updatedDelivery.googleSheetId,
      deliveryNumber: updatedDelivery.deliveryNumber
    });

    // デバッグ用：更新後のdeliveryデータを再取得して確認
    const verifyDelivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, status: true, deliveryNumber: true, googleSheetId: true }
    });
    console.log('🔍 Verification - Current delivery status in DB:', verifyDelivery);

    // PDFエクスポートを試行（失敗してもシート作成成功は維持）
    let pdfUrl = null;
    try {
      console.log('📕 Attempting PDF export...');
      pdfUrl = await googleSheetsClient.exportToPdf(result.sheetId);
      console.log('✅ PDF export successful:', pdfUrl);
    } catch (pdfError) {
      console.warn('⚠️ PDF export failed (but sheet creation was successful):', pdfError);
      // PDFエクスポート失敗はログに記録するが、全体の処理は成功とする
    }

    return NextResponse.json({
      success: true,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: pdfUrl
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
      } else if (error.message.includes('Invalid template sheet ID') || error.message.includes('テンプレートシートIDが無効')) {
        errorMessage = 'テンプレートIDの形式が正しくありません。数値のみを入力してください。';
      }
    }

    // エラーが発生してもdeliveryのステータスをERRORに更新して追跡可能にする
    try {
      if (deliveryId) {
        console.log('🔄 Attempting to update delivery status to ERROR for ID:', deliveryId);
        const updatedDelivery = await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'ERROR',
            notes: `Google Sheets作成エラー [${new Date().toISOString()}]: ${errorDetails || errorMessage}`.slice(0, 500) // メモの長さ制限
          }
        });
        console.log('✅ Delivery status updated to ERROR for tracking:', updatedDelivery.status);
      } else {
        console.log('⚠️ No deliveryId available for status update');
      }
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