import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const updateDeliverySchema = z.object({
  customerId: z.string().optional(),
  deliveryDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    purchaseId: z.string(),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
    deliveryDate: z.string().optional(),
    unit: z.string().optional(),
    taxRate: z.number().default(8),
  })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            deliveryAddress: true,
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
                supplier: {
                  select: {
                    id: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    return NextResponse.json(delivery)
  } catch (error) {
    console.error('Failed to fetch delivery:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request)

    const body = await request.json()
    const validatedData = updateDeliverySchema.parse(body)

    // Start transaction with timeout configuration
    const result = await prisma.$transaction(async (tx) => {
      const existingDelivery = await tx.delivery.findUnique({
        where: { id: params.id },
        include: { items: true },
      })

      if (!existingDelivery) {
        throw new Error('Delivery not found')
      }

      // If updating items, restore original quantities first
      if (validatedData.items) {
        // Restore quantities from original items
        for (const originalItem of existingDelivery.items) {
          await tx.purchase.update({
            where: { id: originalItem.purchaseId },
            data: {
              remainingQuantity: {
                increment: originalItem.quantity,
              },
            },
          })

          // Update purchase status back to previous state
          const purchase = await tx.purchase.findUnique({
            where: { id: originalItem.purchaseId },
            select: { remainingQuantity: true, quantity: true },
          })

          if (purchase) {
            let newStatus: string
            if (purchase.remainingQuantity === 0) {
              newStatus = 'USED'
            } else if (purchase.remainingQuantity === purchase.quantity) {
              newStatus = 'UNUSED'
            } else {
              newStatus = 'PARTIAL'
            }

            await tx.purchase.update({
              where: { id: originalItem.purchaseId },
              data: { status: newStatus },
            })
          }
        }

        // Delete existing items
        await tx.deliveryItem.deleteMany({
          where: { deliveryId: params.id },
        })

        // Check new stock availability
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

        // Create new items and update quantities
        for (const item of validatedData.items) {
          await tx.deliveryItem.create({
            data: {
              deliveryId: params.id,
              purchaseId: item.purchaseId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
              unit: item.unit || null,
              taxRate: item.taxRate || 8,
            },
          })

          await tx.purchase.update({
            where: { id: item.purchaseId },
            data: {
              remainingQuantity: {
                decrement: item.quantity,
              },
            },
          })

          // Update purchase status
          const updatedPurchase = await tx.purchase.findUnique({
            where: { id: item.purchaseId },
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
              where: { id: item.purchaseId },
              data: { status: newStatus },
            })
          }
        }

        // Calculate new total amount
        const totalAmount = validatedData.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        )
        validatedData.totalAmount = totalAmount
      }

      // Update delivery
      const updateData: any = {}
      if (validatedData.customerId) updateData.customerId = validatedData.customerId
      if (validatedData.deliveryDate) updateData.deliveryDate = new Date(validatedData.deliveryDate)
      if (validatedData.status) updateData.status = validatedData.status
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
      if (validatedData.totalAmount !== undefined) updateData.totalAmount = validatedData.totalAmount

      return await tx.delivery.update({
        where: { id: params.id },
        data: updateData,
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
    }, {
      maxWait: 20000, // 最大20秒待機
      timeout: 30000, // 30秒でタイムアウト
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update delivery:', error)

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
      { error: error instanceof Error ? error.message : '納品データの更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== 納品削除API開始 ===')
  
  try {
    requireAuth(request)
    
    const { id } = params
    console.log(`🗑️ 納品削除: ID=${id}`)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id },
        include: { 
          items: true,
          customer: true
        },
      })

      if (!delivery) {
        console.error('❌ 納品データが見つかりません:', id)
        throw new Error('納品データが見つかりません')
      }

      console.log(`📋 削除対象納品: ${delivery.customer.companyName}, 金額: ${delivery.totalAmount}円`)
      
      // freee納品書が存在する場合の警告（実際のfreee削除処理は別途実装が必要）
      if (delivery.freeeDeliverySlipId) {
        console.warn(`⚠️ freee納品書が存在します（ID: ${delivery.freeeDeliverySlipId}）`)
        // NOTE: freee連携はGoogle Sheetsに移行済み。freee納品書は履歴として保持
        // const freeeResult = await deleteFreeeDeliverySlip(delivery.freeeDeliverySlipId)
      }

      // freee請求書が存在する場合はエラー
      if (delivery.freeeInvoiceId) {
        console.error('❌ freee請求書が既に発行されているため削除できません:', delivery.freeeInvoiceId)
        throw new Error('freee請求書が既に発行されているため、この納品は削除できません。freeeで請求書をキャンセルしてから再度お試しください。')
      }

      // 在庫を復元
      console.log('📦 在庫復元開始...')
      for (const item of delivery.items) {
        const beforePurchase = await tx.purchase.findUnique({
          where: { id: item.purchaseId },
          select: { remainingQuantity: true, quantity: true, productName: true },
        })

        if (!beforePurchase) {
          console.warn(`⚠️ 仕入れデータが見つかりません: ${item.purchaseId}`)
          continue
        }

        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: {
            remainingQuantity: {
              increment: item.quantity,
            },
          },
        })

        // 復元後の在庫状況を確認してステータス更新
        const restoredQuantity = beforePurchase.remainingQuantity + item.quantity
        let newStatus = 'PARTIAL'
        
        if (restoredQuantity >= beforePurchase.quantity) {
          newStatus = 'UNUSED'
        }

        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: { status: newStatus },
        })

        console.log(`✅ ${beforePurchase.productName}: ${item.quantity}${item.purchase?.unit || '個'} 復元 (${beforePurchase.remainingQuantity} → ${restoredQuantity})`)
      }

      // 納品データを削除（DeliveryItemは cascade で自動削除）
      await tx.delivery.delete({
        where: { id },
      })

      console.log(`✅ 納品削除完了: ${delivery.customer.companyName}`)
      return { 
        success: true,
        message: '納品データを削除しました',
        restoredItems: delivery.items.length
      }
    })

    console.log('=== 納品削除API完了 ===')
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('納品削除API エラー:', error)
    return NextResponse.json(
      { error: error.message || '納品の削除に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}