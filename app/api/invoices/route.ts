import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    // 年月による絞り込み
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.deliveryDate = {
        gte: startDate,
        lte: endDate
      };
    }

    // 請求書情報として納品データを取得（納品ベースの請求）
    const deliveries = await prisma.delivery.findMany({
      where: {
        ...where,
        status: 'DELIVERED' // 納品完了のみ
      },
      include: {
        customer: true,
        items: {
          include: {
            purchase: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        deliveryDate: 'desc'
      }
    });

    // 請求書として整形
    const invoices = deliveries.map(delivery => ({
      id: delivery.id,
      invoiceNumber: delivery.freeeInvoiceNumber || `DEL-${delivery.id}`,
      customerId: delivery.customerId,
      customerName: delivery.customer.companyName,
      deliveryDate: delivery.deliveryDate,
      totalAmount: delivery.totalAmount,
      status: delivery.freeeInvoiceId ? 'INVOICED' : 'PENDING',
      freeeInvoiceId: delivery.freeeInvoiceId,
      freeeInvoiceNumber: delivery.freeeInvoiceNumber,
      items: delivery.items.map(item => ({
        id: item.id,
        productName: item.purchase.productName,
        categoryName: item.purchase.category.name,
        quantity: item.quantity,
        unit: item.purchase.unit,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice
      }))
    }));

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    });
  } catch (error) {
    console.error('Invoices API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryIds, customerId, dueDate, notes } = body;

    if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
      return NextResponse.json(
        { error: 'Delivery IDs are required' },
        { status: 400 }
      );
    }

    // 指定された納品データを取得
    const deliveries = await prisma.delivery.findMany({
      where: {
        id: { in: deliveryIds },
        status: 'DELIVERED',
        OR: [
          { freeeInvoiceId: null },
          { freeeInvoiceId: '' }
        ]
      },
      include: {
        customer: true,
        items: {
          include: {
            purchase: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: 'No eligible deliveries found for invoicing' },
        { status: 404 }
      );
    }

    // 請求書番号を生成
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now()}`;

    // 合計金額を計算
    const totalAmount = deliveries.reduce((sum, delivery) => sum + delivery.totalAmount, 0);

    // 簡単な請求書レコードを作成（実際のアプリケーションではより詳細な請求書テーブルが必要）
    const customer = deliveries[0].customer;

    // 納品データに請求書情報を更新
    await prisma.delivery.updateMany({
      where: { id: { in: deliveryIds } },
      data: {
        freeeInvoiceNumber: invoiceNumber,
        updatedAt: new Date()
      }
    });

    const invoiceData = {
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.companyName,
      totalAmount,
      deliveryCount: deliveries.length,
      itemCount: deliveries.reduce((sum, d) => sum + d.items.length, 0),
      issueDate: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DRAFT',
      notes: notes || '',
      deliveryIds,
      items: deliveries.flatMap(delivery =>
        delivery.items.map(item => ({
          productName: item.purchase.productName,
          categoryName: item.purchase.category.name,
          quantity: item.quantity,
          unit: item.purchase.unit,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          deliveryDate: delivery.deliveryDate
        }))
      )
    };

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      data: invoiceData
    }, { status: 201 });
  } catch (error) {
    console.error('Invoice Creation Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}