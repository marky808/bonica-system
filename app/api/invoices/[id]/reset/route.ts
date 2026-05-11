import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/invoices/[id]/reset
 *
 * 請求書を発行前の状態に戻す（再発行のため）。
 * 1. 紐付く納品の status を INVOICED → DELIVERED に戻す
 * 2. Invoice レコードを削除
 *
 * Google Sheets のタブは残るため、ユーザーが手動で削除する。
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
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    let deliveryIds: string[] = [];
    try {
      deliveryIds = JSON.parse(invoice.deliveryIds);
    } catch {
      console.warn(`⚠️ deliveryIds パース失敗: invoiceId=${invoiceId}`);
    }

    console.log(`🔧 請求書リセット開始: ${invoice.invoice_number} (id=${invoiceId})`);
    console.log(`  顧客ID: ${invoice.customerId}`);
    console.log(`  対象月: ${invoice.year}年${invoice.month}月`);
    console.log(`  紐付く納品: ${deliveryIds.length}件`);
    console.log(`  旧スプレッドシート: ${invoice.googleSheetUrl || 'なし'}`);

    const result = await prisma.$transaction(async (tx) => {
      let deliveryUpdateCount = 0;
      if (deliveryIds.length > 0) {
        const updateResult = await tx.delivery.updateMany({
          where: {
            id: { in: deliveryIds },
            status: 'INVOICED',
          },
          data: { status: 'DELIVERED' },
        });
        deliveryUpdateCount = updateResult.count;
      }

      await tx.invoice.delete({ where: { id: invoiceId } });

      return { deliveryUpdateCount };
    });

    console.log(`✅ 請求書リセット完了: 納品 ${result.deliveryUpdateCount}件を DELIVERED に戻しました`);

    return NextResponse.json({
      success: true,
      customerId: invoice.customerId,
      year: invoice.year,
      month: invoice.month,
      deliveryUpdateCount: result.deliveryUpdateCount,
      oldGoogleSheetUrl: invoice.googleSheetUrl,
      oldSheetTabName: invoice.sheetTabName,
    });
  } catch (error: any) {
    console.error('❌ 請求書リセットエラー:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: error.message || '請求書のリセットに失敗しました',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
