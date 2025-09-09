import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

const createDeliverySchema = z.object({
  customerId: z.string().min(1, 'お客様を選択してください'),
  deliveryDate: z.string().min(1, '納品日を入力してください'),
  items: z.array(z.object({
    purchaseId: z.string().min(1, '仕入れ商品を選択してください'),
    quantity: z.number().min(0.01, '数量を入力してください'),
    unitPrice: z.number().min(0, '単価を入力してください'),
  })).min(1, '納品商品を1つ以上選択してください'),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const customer = searchParams.get('customer') || ''
    const month = searchParams.get('month') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const skip = (page - 1) * limit
    
    // Build where clause for filtering
    const whereClause: any = {}
    
    if (customer) {
      whereClause.customerId = customer
    }
    
    if (month) {
      const [year, monthNum] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
      whereClause.deliveryDate = {
        gte: startDate,
        lte: endDate,
      }
    }
    
    if (status) {
      whereClause.status = status
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        {
          customer: {
            companyName: {
              contains: search,
            },
          },
        },
        {
          items: {
            some: {
              purchase: {
                productName: {
                  contains: search,
                },
              },
            },
          },
        },
      ]
    }

    const deliveries = await prisma.delivery.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
          },
        },
        items: {
          include: {
            purchase: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        deliveryDate: 'desc',
      },
      skip,
      take: limit,
    })

    const total = await prisma.delivery.count({ where: whereClause })
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      deliveries,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Failed to fetch deliveries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createDeliverySchema.parse(body)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check stock availability for all items
      for (const item of validatedData.items) {
        const purchase = await tx.purchase.findUnique({
          where: { id: item.purchaseId },
          select: { remainingQuantity: true, productName: true },
        })

        if (!purchase) {
          throw new Error(`仕入れ商品が見つかりません (ID: ${item.purchaseId})`)
        }

        if (purchase.remainingQuantity < item.quantity) {
          throw new Error(
            `${purchase.productName} の在庫が不足しています。在庫: ${purchase.remainingQuantity}, 要求: ${item.quantity}`
          )
        }
      }

      // Calculate total amount
      const totalAmount = validatedData.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )

      // Create delivery
      const delivery = await tx.delivery.create({
        data: {
          customerId: validatedData.customerId,
          deliveryDate: new Date(validatedData.deliveryDate),
          totalAmount,
          status: 'PENDING',
        },
      })

      // Create delivery items and update purchase quantities
      for (const item of validatedData.items) {
        await tx.deliveryItem.create({
          data: {
            deliveryId: delivery.id,
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          },
        })

        // Update purchase remaining quantity
        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: {
            remainingQuantity: {
              decrement: item.quantity,
            },
          },
        })

        // Update purchase status if fully used
        const updatedPurchase = await tx.purchase.findUnique({
          where: { id: item.purchaseId },
          select: { remainingQuantity: true, quantity: true },
        })

        if (updatedPurchase && updatedPurchase.remainingQuantity === 0) {
          await tx.purchase.update({
            where: { id: item.purchaseId },
            data: { status: 'USED' },
          })
        } else if (
          updatedPurchase &&
          updatedPurchase.remainingQuantity < updatedPurchase.quantity
        ) {
          await tx.purchase.update({
            where: { id: item.purchaseId },
            data: { status: 'PARTIAL' },
          })
        }
      }

      // Return delivery with relations
      return await tx.delivery.findUnique({
        where: { id: delivery.id },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
            },
          },
          items: {
            include: {
              purchase: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create delivery:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create delivery' },
      { status: 500 }
    )
  }
}