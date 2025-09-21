import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        purchaseItems: {
          include: {
            purchase: {
              include: {
                supplier: true
              }
            }
          }
        },
        deliveryItems: {
          include: {
            delivery: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, unit, categoryId, defaultPrice } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name || existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        unit: unit || existingProduct.unit,
        categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId) : null) : existingProduct.categoryId,
        defaultPrice: defaultPrice !== undefined ? (defaultPrice ? parseFloat(defaultPrice) : null) : existingProduct.defaultPrice
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product UPDATE Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseItems: true,
            deliveryItems: true
          }
        }
      }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 使用中の商品は削除不可
    if (existingProduct._count.purchaseItems > 0 || existingProduct._count.deliveryItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that has purchase or delivery records' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product DELETE Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}