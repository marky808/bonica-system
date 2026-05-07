import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_EXPORT_ROWS = 10000

export async function GET(request: Request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const customerId = searchParams.get('customerId')
    const categoryId = searchParams.get('categoryId')

    // 期間指定は必須
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '期間（開始日・終了日）を指定してください' },
        { status: 400 }
      )
    }

    // 日付バリデーション
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // 終了日は23:59:59まで

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: '日付の形式が正しくありません' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: '開始日は終了日より前の日付を指定してください' },
        { status: 400 }
      )
    }

    // フィルター条件を構築
    const deliveryWhereClause: Prisma.DeliveryWhereInput = {
      deliveryDate: {
        gte: start,
        lte: end,
      },
      ...(customerId && { customerId }),
    }

    // カテゴリーフィルターはDeliveryItemに対して適用
    const itemWhereClause: Prisma.DeliveryItemWhereInput = categoryId
      ? {
          OR: [
            { categoryId: categoryId },
            { purchase: { categoryId: categoryId } },
          ],
        }
      : {}

    // まず件数をチェック
    const count = await prisma.deliveryItem.count({
      where: {
        delivery: deliveryWhereClause,
        ...itemWhereClause,
      },
    })

    if (count === 0) {
      return NextResponse.json(
        { error: '該当するデータがありません' },
        { status: 404 }
      )
    }

    if (count > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        { error: `出力件数が${MAX_EXPORT_ROWS}件を超えています（${count}件）。期間を絞り込んでください。` },
        { status: 400 }
      )
    }

    // データ取得
    const deliveryItems = await prisma.deliveryItem.findMany({
      where: {
        delivery: deliveryWhereClause,
        ...itemWhereClause,
      },
      include: {
        delivery: {
          include: {
            customer: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
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
      orderBy: [
        { delivery: { deliveryDate: 'asc' } },
        { delivery: { customerId: 'asc' } },
      ],
    })

    // CSV生成
    const csvHeader = [
      '納品日',
      '納品番号',
      '納品先',
      '商品名',
      'カテゴリー',
      '数量',
      '単位',
      '単価',
      '税率',
      '金額（税抜）',
      '金額（税込）',
      '仕入れID',
      '備考',
    ].join(',')

    const csvRows = deliveryItems.map((item) => {
      const delivery = item.delivery
      const deliveryDate = new Date(delivery.deliveryDate).toISOString().split('T')[0]
      const deliveryNumber = delivery.deliveryNumber || delivery.id
      const customerName = delivery.customer.companyName

      // 商品名: 直接入力の場合はproductName、それ以外はpurchase.productName
      const productName = item.productName || item.purchase?.productName || ''

      // カテゴリー: 直接入力の場合はcategory、それ以外はpurchase.category
      const categoryName = item.category?.name || item.purchase?.category?.name || ''

      const quantity = Math.abs(item.quantity) // 赤伝の場合もマイナスなしで表示
      const unit = item.unit || item.purchase?.unit || ''
      const unitPrice = item.unitPrice
      const taxRate = `${item.taxRate || 8}%`
      const amountExcludingTax = Math.abs(item.amount)
      const taxMultiplier = 1 + (item.taxRate || 8) / 100
      const amountIncludingTax = Math.round(amountExcludingTax * taxMultiplier)
      const purchaseId = item.purchaseId || ''
      const notes = item.notes || ''

      // CSVエスケープ: ダブルクォートを含む場合は二重化し、全体をダブルクォートで囲む
      const escapeCSV = (value: string | number) => {
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      return [
        deliveryDate,
        escapeCSV(deliveryNumber),
        escapeCSV(customerName),
        escapeCSV(productName),
        escapeCSV(categoryName),
        quantity,
        escapeCSV(unit),
        unitPrice,
        taxRate,
        amountExcludingTax,
        amountIncludingTax,
        purchaseId,
        escapeCSV(notes),
      ].join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // UTF-8 BOM付きでエンコード
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // ファイル名生成
    const startDateStr = startDate.replace(/-/g, '')
    const endDateStr = endDate.replace(/-/g, '')
    const filename = `納品履歴_${startDateStr}_${endDateStr}.csv`

    // レスポンス
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
