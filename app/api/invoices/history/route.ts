import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/invoices/history
 * 帳票履歴（請求書・納品書）を取得
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'invoice' | 'delivery' | null (all)
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const results: Array<{
      id: string;
      type: 'invoice' | 'delivery_slip';
      documentNumber: string;
      issueDate: string;
      customerName: string;
      amount: number;
      status: string;
      googleSheetUrl: string | null;
      year?: number;
      month?: number;
    }> = [];

    // 請求書を取得
    if (!type || type === 'invoice') {
      const invoiceWhere: any = {};

      if (customerId && customerId !== 'all') {
        invoiceWhere.customerId = customerId;
      }
      if (status && status !== 'all') {
        invoiceWhere.status = status.toUpperCase();
      }
      if (year) {
        invoiceWhere.year = parseInt(year);
      }
      if (month) {
        invoiceWhere.month = parseInt(month);
      }
      if (search) {
        invoiceWhere.OR = [
          { invoice_number: { contains: search } },
        ];
      }

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          // customerIdでCustomerを参照
        },
        orderBy: { invoiceDate: 'desc' },
      });

      // 顧客情報を別途取得
      const customerIds = [...new Set(invoices.map(inv => inv.customerId))];
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, companyName: true },
      });
      const customerMap = new Map(customers.map(c => [c.id, c.companyName]));

      for (const invoice of invoices) {
        const customerName = customerMap.get(invoice.customerId) || '不明';

        // 検索フィルタ（顧客名での検索）
        if (search && !customerName.includes(search) && !invoice.invoice_number.includes(search)) {
          continue;
        }

        results.push({
          id: invoice.id,
          type: 'invoice',
          documentNumber: invoice.invoice_number,
          issueDate: invoice.invoiceDate.toISOString().split('T')[0],
          customerName: customerName,
          amount: invoice.totalAmount,
          status: invoice.status,
          googleSheetUrl: invoice.googleSheetUrl,
          year: invoice.year,
          month: invoice.month,
        });
      }
    }

    // 納品書（DELIVERED/INVOICED状態のDelivery）を取得
    if (!type || type === 'delivery') {
      const deliveryWhere: any = {
        status: { in: ['DELIVERED', 'INVOICED'] },
        googleSheetUrl: { not: null },
      };

      if (customerId && customerId !== 'all') {
        deliveryWhere.customerId = customerId;
      }
      if (status && status !== 'all') {
        deliveryWhere.status = status.toUpperCase();
      }
      if (year) {
        const yearStart = new Date(parseInt(year), 0, 1);
        const yearEnd = new Date(parseInt(year) + 1, 0, 1);
        deliveryWhere.deliveryDate = { gte: yearStart, lt: yearEnd };
      }
      if (month && year) {
        const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthEnd = new Date(parseInt(year), parseInt(month), 1);
        deliveryWhere.deliveryDate = { gte: monthStart, lt: monthEnd };
      }

      const deliveries = await prisma.delivery.findMany({
        where: deliveryWhere,
        include: {
          customer: {
            select: { companyName: true },
          },
        },
        orderBy: { deliveryDate: 'desc' },
      });

      for (const delivery of deliveries) {
        const customerName = delivery.customer?.companyName || '不明';

        // 検索フィルタ
        if (search && !customerName.includes(search) && !(delivery.deliveryNumber || '').includes(search)) {
          continue;
        }

        results.push({
          id: delivery.id,
          type: 'delivery_slip',
          documentNumber: delivery.deliveryNumber || `DEL-${delivery.id.slice(0, 8)}`,
          issueDate: delivery.deliveryDate.toISOString().split('T')[0],
          customerName: customerName,
          amount: delivery.totalAmount,
          status: delivery.status,
          googleSheetUrl: delivery.googleSheetUrl,
        });
      }
    }

    // 日付順でソート
    results.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

    // ページネーション
    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    // 顧客一覧（フィルタ用）
    const allCustomers = await prisma.customer.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedResults,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        customers: allCustomers,
      },
    });

  } catch (error: any) {
    console.error('帳票履歴取得エラー:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || '帳票履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
