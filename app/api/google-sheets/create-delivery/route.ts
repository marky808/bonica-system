import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets-client';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deliveryId, templateId } = body;

    if (!deliveryId || !templateId) {
      return NextResponse.json(
        { error: 'Delivery ID and template ID are required' },
        { status: 400 }
      );
    }

    // 納品データを取得
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
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    // Google Sheetsクライアントを取得
    const googleSheetsClient = getGoogleSheetsClient();

    // 納品書データを準備
    const deliveryData = {
      delivery_number: delivery.deliveryNumber || `DEL-${delivery.id.slice(0, 8)}`,
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

    // Google Sheetsに納品書を作成
    const result = await googleSheetsClient.createDeliverySheet(deliveryData, templateId);

    // データベースを更新
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        googleSheetId: result.sheetId,
        googleSheetUrl: result.url
      }
    });

    return NextResponse.json({
      success: true,
      sheetId: result.sheetId,
      url: result.url,
      pdfUrl: await googleSheetsClient.exportToPdf(result.sheetId)
    });

  } catch (error) {
    console.error('Error creating delivery sheet:', error);
    
    let errorMessage = 'Google Sheets納品書の作成に失敗しました';
    
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