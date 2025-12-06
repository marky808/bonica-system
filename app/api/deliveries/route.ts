import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 通常モード用スキーマ（既存）
const normalModeItemSchema = z.object({
  purchaseId: z.string().min(1, '仕入れ商品を選択してください'),
  quantity: z.number().min(0.01, '数量を入力してください'),
  unitPrice: z.number().min(0, '単価を入力してください'),
  deliveryDate: z.string().optional(),
  unit: z.string().optional(),
  taxRate: z.number().default(8),
})

// 直接入力モード用スキーマ（新規）
const directModeItemSchema = z.object({
  productName: z.string().min(1, '商品名を入力してください'),
  categoryId: z.string().min(1, 'カテゴリーを選択してください'),
  quantity: z.number().min(0.01, '数量を入力してください'),
  unitPrice: z.number().min(0, '単価を入力してください'),
  unit: z.string().min(1, '単位を入力してください'),
  taxRate: z.number().default(8),
  notes: z.string().optional(),
})

const createDeliverySchema = z.object({
  customerId: z.string().min(1, 'お客様を選択してください'),
  deliveryDate: z.string().min(1, '納品日を入力してください'),
  inputMode: z.enum(['NORMAL', 'DIRECT']).default('NORMAL'),
  items: z.array(z.object({
    purchaseId: z.string().optional(),
    productName: z.string().optional(),
    categoryId: z.string().optional(),
    quantity: z.number().min(0.01, '数量を入力してください'),
    unitPrice: z.number().min(0, '単価を入力してください'),
    deliveryDate: z.string().optional(),
    unit: z.string().optional(),
    taxRate: z.number().default(8),
    notes: z.string().optional(),
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
    const isDirectMode = validatedData.inputMode === 'DIRECT'

    // Start transaction with timeout configuration
    const result = await prisma.$transaction(async (tx) => {
      // 通常モードの場合のみ在庫チェック
      if (!isDirectMode) {
        for (const item of validatedData.items) {
          if (!item.purchaseId) {
            throw new Error('通常モードでは仕入れ商品を選択してください')
          }
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
      } else {
        // 直接入力モードのバリデーション
        for (const item of validatedData.items) {
          if (!item.productName) {
            throw new Error('直接入力モードでは商品名を入力してください')
          }
          if (!item.categoryId) {
            throw new Error('直接入力モードではカテゴリーを選択してください')
          }
          if (!item.unit) {
            throw new Error('直接入力モードでは単位を入力してください')
          }
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
          inputMode: validatedData.inputMode,
          purchaseLinkStatus: isDirectMode ? 'UNLINKED' : 'LINKED',
        },
      })

      // Create delivery items
      if (isDirectMode) {
        // 直接入力モード: purchaseIdなし
        const deliveryItemsData = validatedData.items.map(item => ({
          deliveryId: delivery.id,
          purchaseId: null,
          productName: item.productName,
          categoryId: item.categoryId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          deliveryDate: new Date(validatedData.deliveryDate),
          unit: item.unit || null,
          taxRate: item.taxRate || 8,
          notes: item.notes || null,
        }))

        await tx.deliveryItem.createMany({
          data: deliveryItemsData,
        })
      } else {
        // 通常モード: 既存の処理
        const deliveryItemsData = validatedData.items.map(item => ({
          deliveryId: delivery.id,
          purchaseId: item.purchaseId!,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          unit: item.unit || null,
          taxRate: item.taxRate || 8,
        }))

        await tx.deliveryItem.createMany({
          data: deliveryItemsData,
        })

        // Update purchase quantities and status
        for (const item of validatedData.items) {
          await tx.purchase.update({
            where: { id: item.purchaseId! },
            data: {
              remainingQuantity: {
                decrement: item.quantity,
              },
            },
          })

          const updatedPurchase = await tx.purchase.findUnique({
            where: { id: item.purchaseId! },
            select: { remainingQuantity: true, quantity: true },
          })

          if (updatedPurchase) {
            let newStatus: string
            if (updatedPurchase.remainingQuantity === 0) {
              newStatus = 'USED'
            } else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
              newStatus = 'PARTIAL'
            } else {
              newStatus = 'UNUSED'
            }

            await tx.purchase.update({
              where: { id: item.purchaseId! },
              data: { status: newStatus },
            })
          }
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
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    }, {
      maxWait: 20000,
      timeout: 30000,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create delivery:', error)

    // Prismaトランザクションエラーの詳細ログ
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力データの検証に失敗しました', details: error.errors },
        { status: 400 }
      )
    }

    // Prismaトランザクションエラーのハンドリング
    if (error instanceof Error) {
      if (error.message.includes('Transaction not found') ||
          error.message.includes('Transaction ID is invalid')) {
        return NextResponse.json(
          { error: 'データベース処理がタイムアウトしました。もう一度お試しください。' },
          { status: 500 }
        )
      }

      if (error.message.includes('transaction timeout') ||
          error.message.includes('connection timeout')) {
        return NextResponse.json(
          { error: 'データベース接続がタイムアウトしました。しばらく待ってからお試しください。' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '納品データの作成に失敗しました' },
      { status: 500 }
    )
  }
}