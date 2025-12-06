import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const linkSchema = z.object({
  deliveryItemId: z.string().min(1, '納品明細IDが必要です'),
  purchaseId: z.string().min(1, '仕入れIDが必要です'),
})

/**
 * 納品明細と仕入れを紐付ける
 */
export async function POST(request: Request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deliveryItemId, purchaseId } = linkSchema.parse(body)

    // トランザクション内で処理
    const result = await prisma.$transaction(async (tx) => {
      // 納品明細を取得
      const deliveryItem = await tx.deliveryItem.findUnique({
        where: { id: deliveryItemId },
        include: {
          delivery: true,
        },
      })

      if (!deliveryItem) {
        throw new Error('納品明細が見つかりません')
      }

      if (deliveryItem.purchaseId) {
        throw new Error('この納品明細は既に仕入れと紐付けられています')
      }

      // 仕入れを取得
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
      })

      if (!purchase) {
        throw new Error('仕入れが見つかりません')
      }

      // 在庫チェック
      if (purchase.remainingQuantity < deliveryItem.quantity) {
        throw new Error(
          `在庫が不足しています。在庫: ${purchase.remainingQuantity}${purchase.unit}, 必要: ${deliveryItem.quantity}`
        )
      }

      // 納品明細を更新（仕入れIDを設定）
      const updatedItem = await tx.deliveryItem.update({
        where: { id: deliveryItemId },
        data: {
          purchaseId: purchaseId,
        },
      })

      // 仕入れの在庫を減らす
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          remainingQuantity: {
            decrement: deliveryItem.quantity,
          },
        },
      })

      // 仕入れのステータスを更新
      const updatedPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
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
          where: { id: purchaseId },
          data: { status: newStatus },
        })
      }

      // 納品の全明細が紐付けられたかチェック
      const allItems = await tx.deliveryItem.findMany({
        where: { deliveryId: deliveryItem.deliveryId },
      })

      const allLinked = allItems.every((item) => item.purchaseId !== null)

      if (allLinked) {
        // 全て紐付けられたら納品のステータスを更新
        await tx.delivery.update({
          where: { id: deliveryItem.deliveryId },
          data: {
            purchaseLinkStatus: 'LINKED',
          },
        })
      }

      return updatedItem
    })

    return NextResponse.json({
      success: true,
      deliveryItem: result,
    })
  } catch (error) {
    console.error('Failed to link purchase:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力データの検証に失敗しました', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '紐付けに失敗しました' },
      { status: 500 }
    )
  }
}
