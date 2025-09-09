import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  console.log('=== CSV出力API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const reportType = searchParams.get('type') || 'monthly'
    
    console.log(`📄 CSV出力: ${reportType}, 期間 ${startDate} ～ ${endDate}`)
    
    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59.999Z')
    
    let csvContent: string
    let filename: string
    
    switch (reportType) {
      case 'monthly':
        const monthlyResult = await generateMonthlyCsv(start, end)
        csvContent = monthlyResult.csv
        filename = monthlyResult.filename
        break
      case 'purchases':
        const purchaseResult = await generatePurchaseCsv(start, end)
        csvContent = purchaseResult.csv
        filename = purchaseResult.filename
        break
      case 'deliveries':
        const deliveryResult = await generateDeliveryCsv(start, end)
        csvContent = deliveryResult.csv
        filename = deliveryResult.filename
        break
      case 'inventory':
        const inventoryResult = await generateInventoryCsv()
        csvContent = inventoryResult.csv
        filename = inventoryResult.filename
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    console.log(`✅ CSV生成完了: ${filename}`)
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error: any) {
    console.error('CSV出力API エラー:', error)
    return NextResponse.json(
      { error: error.message || 'CSV出力に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

async function generateMonthlyCsv(startDate: Date, endDate: Date) {
  console.log('📅 月次CSV生成中...')
  
  const monthlyData = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
    
    const purchaseSum = await prisma.purchase.aggregate({
      where: { purchaseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { price: true },
      _count: { id: true }
    })
    
    const deliverySum = await prisma.delivery.aggregate({
      where: {
        deliveryDate: { gte: monthStart, lte: monthEnd },
        status: 'DELIVERED'
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    })
    
    const purchaseAmount = purchaseSum._sum.price || 0
    const deliveryAmount = deliverySum._sum.totalAmount || 0
    const profit = deliveryAmount - purchaseAmount
    const profitRate = deliveryAmount > 0 ? ((profit / deliveryAmount) * 100).toFixed(2) : '0.00'
    
    monthlyData.push({
      年月: `${currentDate.getFullYear()}年${String(currentDate.getMonth() + 1).padStart(2, '0')}月`,
      年: currentDate.getFullYear(),
      月: currentDate.getMonth() + 1,
      仕入金額: purchaseAmount,
      納品金額: deliveryAmount,
      粗利: profit,
      粗利率: `${profitRate}%`,
      仕入件数: purchaseSum._count.id,
      納品件数: deliverySum._count.id
    })
    
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  const csv = convertToCSV(monthlyData)
  const filename = `月次レポート_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`
  
  return { csv, filename }
}

async function generatePurchaseCsv(startDate: Date, endDate: Date) {
  console.log('📦 仕入れCSV生成中...')
  
  const purchases = await prisma.purchase.findMany({
    where: {
      purchaseDate: { gte: startDate, lte: endDate }
    },
    include: {
      supplier: true,
      category: true
    },
    orderBy: { purchaseDate: 'desc' }
  })
  
  const purchaseData = purchases.map(purchase => ({
    仕入ID: purchase.id,
    仕入日: purchase.purchaseDate.toISOString().split('T')[0],
    商品名: purchase.productName,
    カテゴリ: purchase.category.name,
    仕入先: purchase.supplier.companyName,
    数量: purchase.quantity,
    単位: purchase.unit,
    単価: purchase.unitPrice,
    合計金額: purchase.price,
    税区分: purchase.taxType,
    残数量: purchase.remainingQuantity,
    ステータス: purchase.status === 'COMPLETED' ? '完了' : purchase.status === 'PENDING' ? '処理中' : purchase.status,
    消費期限: purchase.expiryDate ? purchase.expiryDate.toISOString().split('T')[0] : '',
    作成日時: purchase.createdAt.toLocaleString('ja-JP')
  }))
  
  const csv = convertToCSV(purchaseData)
  const filename = `仕入一覧_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`
  
  return { csv, filename }
}

async function generateDeliveryCsv(startDate: Date, endDate: Date) {
  console.log('🚚 納品CSV生成中...')
  
  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: { gte: startDate, lte: endDate }
    },
    include: {
      customer: true,
      items: {
        include: {
          purchase: {
            include: {
              category: true,
              supplier: true
            }
          }
        }
      }
    },
    orderBy: { deliveryDate: 'desc' }
  })
  
  const deliveryData = []
  
  for (const delivery of deliveries) {
    for (const item of delivery.items) {
      deliveryData.push({
        納品ID: delivery.id,
        納品日: delivery.deliveryDate.toISOString().split('T')[0],
        顧客名: delivery.customer.companyName,
        商品名: item.purchase.productName,
        カテゴリ: item.purchase.category.name,
        仕入先: item.purchase.supplier.companyName,
        納品数量: item.quantity,
        単位: item.purchase.unit,
        納品単価: item.unitPrice,
        納品金額: item.amount,
        仕入単価: item.purchase.unitPrice,
        粗利: item.amount - (item.quantity * item.purchase.unitPrice),
        納品ステータス: delivery.status === 'DELIVERED' ? '納品完了' : 
                     delivery.status === 'PENDING' ? '処理中' : delivery.status,
        freee請求書ID: delivery.freeeInvoiceId || '',
        作成日時: delivery.createdAt.toLocaleString('ja-JP')
      })
    }
  }
  
  const csv = convertToCSV(deliveryData)
  const filename = `納品一覧_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`
  
  return { csv, filename }
}

async function generateInventoryCsv() {
  console.log('📋 在庫CSV生成中...')
  
  const inventory = await prisma.purchase.findMany({
    where: {
      remainingQuantity: { gt: 0 }
    },
    include: {
      supplier: true,
      category: true
    },
    orderBy: [
      { expiryDate: 'asc' },
      { productName: 'asc' }
    ]
  })
  
  const inventoryData = inventory.map(item => {
    const today = new Date()
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null
    let status = '良好'
    let daysUntilExpiry = ''
    
    if (expiryDate) {
      const days = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      daysUntilExpiry = `${days}日`
      
      if (days <= 0) {
        status = '期限切れ'
      } else if (days <= 3) {
        status = '緊急'
      } else if (days <= 7) {
        status = '注意'
      }
    }
    
    return {
      商品ID: item.id,
      商品名: item.productName,
      カテゴリ: item.category.name,
      仕入先: item.supplier.companyName,
      残数量: item.remainingQuantity,
      単位: item.unit,
      単価: item.unitPrice,
      在庫金額: item.remainingQuantity * item.unitPrice,
      仕入日: item.purchaseDate.toISOString().split('T')[0],
      消費期限: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : '',
      期限まで: daysUntilExpiry,
      状態: status,
      作成日時: item.createdAt.toLocaleString('ja-JP')
    }
  })
  
  const csv = convertToCSV(inventoryData)
  const filename = `在庫一覧_${new Date().toISOString().split('T')[0]}.csv`
  
  return { csv, filename }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  // BOMを追加してExcelで文字化けを防ぐ
  const BOM = '\uFEFF'
  
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header]
      
      // 値がnullまたはundefinedの場合は空文字に
      if (value === null || value === undefined) {
        value = ''
      }
      
      // 文字列の場合はダブルクォートで囲み、内部のダブルクォートはエスケープ
      if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`
      }
      
      return value
    }).join(',')
  })
  
  return BOM + csvHeaders + '\n' + csvRows.join('\n')
}