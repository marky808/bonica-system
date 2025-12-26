import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  console.log('=== レポートAPI開始 ===')
  
  try {
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const reportType = searchParams.get('type') || 'monthly'
    
    console.log(`📊 レポート生成: ${reportType}, 期間 ${startDate} ～ ${endDate}`)
    
    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59.999Z')
    
    switch (reportType) {
      case 'monthly':
        return await getMonthlyReport(start, end)
      case 'category':
        return await getCategoryReport(start, end)
      case 'supplier':
        return await getSupplierReport(start, end)
      case 'profit':
        return await getProfitReport(start, end)
      case 'purchases':
        return await getPurchasesListReport(start, end)
      case 'deliveries':
        return await getDeliveriesListReport(start, end)
      case 'inventory':
        return await getInventoryListReport()
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('レポートAPI エラー:', error)
    return NextResponse.json(
      { error: error.message || 'レポートデータの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

async function getMonthlyReport(startDate: Date, endDate: Date) {
  console.log('📅 月次レポート生成中...')
  
  // 月別データを生成
  const monthlyData = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
    
    // 仕入れ集計
    const purchaseSum = await prisma.purchase.aggregate({
      where: {
        purchaseDate: { gte: monthStart, lte: monthEnd }
      },
      _sum: { price: true },
      _count: { id: true }
    })
    
    // 納品集計
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
    
    monthlyData.push({
      month: `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`,
      year: currentDate.getFullYear(),
      monthNumber: currentDate.getMonth() + 1,
      purchase: purchaseAmount,
      delivery: deliveryAmount,
      profit,
      purchaseCount: purchaseSum._count.id,
      deliveryCount: deliverySum._count.id,
      profitRate: deliveryAmount > 0 ? ((profit / deliveryAmount) * 100) : 0
    })
    
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // サマリー計算
  const totalPurchase = monthlyData.reduce((sum, item) => sum + item.purchase, 0)
  const totalDelivery = monthlyData.reduce((sum, item) => sum + item.delivery, 0)
  const totalProfit = totalDelivery - totalPurchase
  const avgProfitRate = totalDelivery > 0 ? ((totalProfit / totalDelivery) * 100) : 0
  
  console.log(`📈 月次レポート完了: ${monthlyData.length}ヶ月分, 総売上${totalDelivery.toLocaleString()}円`)
  
  return NextResponse.json({
    success: true,
    data: {
      monthlyData,
      summary: {
        totalPurchase,
        totalDelivery,
        totalProfit,
        avgProfitRate,
        monthCount: monthlyData.length
      }
    }
  })
}

async function getCategoryReport(startDate: Date, endDate: Date) {
  console.log('📦 商品別レポート生成中...')
  
  // カテゴリ別仕入れ集計
  const categoryPurchases = await prisma.purchase.groupBy({
    by: ['categoryId'],
    where: {
      purchaseDate: { gte: startDate, lte: endDate }
    },
    _sum: { price: true },
    _count: { id: true }
  })
  
  // カテゴリ別納品集計
  const categoryDeliveries = await prisma.deliveryItem.groupBy({
    by: ['purchaseId'],
    where: {
      delivery: {
        deliveryDate: { gte: startDate, lte: endDate },
        status: 'DELIVERED'
      }
    },
    _sum: { amount: true }
  })
  
  // カテゴリ情報を取得
  const categories = await prisma.category.findMany({
    include: {
      purchases: {
        where: {
          purchaseDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })
  
  const categoryData = []
  let totalValue = 0
  
  for (const category of categories) {
    const purchaseData = categoryPurchases.find(p => p.categoryId === category.id)
    const purchaseAmount = purchaseData?._sum.price || 0
    const count = purchaseData?._count.id || 0
    
    if (purchaseAmount > 0) {
      categoryData.push({
        id: category.id,
        name: category.name,
        purchaseAmount,
        count,
        color: getRandomColor()
      })
      totalValue += purchaseAmount
    }
  }
  
  // パーセンテージ計算
  const categoryWithPercentage = categoryData.map(item => ({
    ...item,
    value: totalValue > 0 ? ((item.purchaseAmount / totalValue) * 100) : 0
  }))
  
  console.log(`📊 商品別レポート完了: ${categoryData.length}カテゴリ, 総額${totalValue.toLocaleString()}円`)
  
  return NextResponse.json({
    success: true,
    data: {
      categoryData: categoryWithPercentage,
      totalValue,
      categoryCount: categoryData.length
    }
  })
}

async function getSupplierReport(startDate: Date, endDate: Date) {
  console.log('🏪 仕入れ先別レポート生成中...')
  
  const supplierData = await prisma.supplier.findMany({
    include: {
      purchases: {
        where: {
          purchaseDate: { gte: startDate, lte: endDate }
        }
      }
    }
  })
  
  const supplierReport = []
  
  for (const supplier of supplierData) {
    const purchaseAmount = supplier.purchases.reduce((sum, p) => sum + p.price, 0)
    const purchaseCount = supplier.purchases.length
    
    if (purchaseAmount > 0) {
      // 対応する納品金額を計算
      const deliveryItems = await prisma.deliveryItem.findMany({
        where: {
          purchase: {
            supplierId: supplier.id,
            purchaseDate: { gte: startDate, lte: endDate }
          },
          delivery: {
            deliveryDate: { gte: startDate, lte: endDate },
            status: 'DELIVERED'
          }
        },
        include: {
          delivery: true
        }
      })
      
      const deliveryAmount = deliveryItems.reduce((sum, item) => sum + item.amount, 0)
      const profit = deliveryAmount - purchaseAmount
      
      supplierReport.push({
        id: supplier.id,
        name: supplier.companyName,
        purchase: purchaseAmount,
        delivery: deliveryAmount,
        profit,
        purchaseCount,
        profitRate: deliveryAmount > 0 ? ((profit / deliveryAmount) * 100) : 0
      })
    }
  }
  
  // 売上順でソート
  supplierReport.sort((a, b) => b.delivery - a.delivery)
  
  console.log(`🏪 仕入れ先別レポート完了: ${supplierReport.length}社`)
  
  return NextResponse.json({
    success: true,
    data: {
      supplierData: supplierReport,
      supplierCount: supplierReport.length
    }
  })
}

async function getProfitReport(startDate: Date, endDate: Date) {
  console.log('💰 収益分析レポート生成中...')
  
  // 月別データを再利用
  const monthlyResponse = await getMonthlyReport(startDate, endDate)
  const monthlyData = JSON.parse(await monthlyResponse.text()).data.monthlyData
  
  const profitAnalysis = {
    monthlyProfitRates: monthlyData.map(item => ({
      month: item.month,
      profitRate: item.profitRate
    })),
    avgProfitRate: monthlyData.reduce((sum, item) => sum + item.profitRate, 0) / monthlyData.length,
    avgMonthlySales: monthlyData.reduce((sum, item) => sum + item.delivery, 0) / monthlyData.length,
    avgMonthlyProfit: monthlyData.reduce((sum, item) => sum + item.profit, 0) / monthlyData.length,
    maxMonthlySales: Math.max(...monthlyData.map(item => item.delivery)),
    minMonthlySales: Math.min(...monthlyData.map(item => item.delivery)),
    maxMonthlyProfit: Math.max(...monthlyData.map(item => item.profit)),
    minMonthlyProfit: Math.min(...monthlyData.map(item => item.profit))
  }
  
  console.log('💰 収益分析レポート完了')
  
  return NextResponse.json({
    success: true,
    data: profitAnalysis
  })
}

async function getPurchasesListReport(startDate: Date, endDate: Date) {
  console.log('📦 仕入一覧レポート生成中...')
  
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
  
  const formattedPurchases = purchases.map(purchase => ({
    id: purchase.id,
    purchaseDate: purchase.purchaseDate.toISOString().split('T')[0],
    productName: purchase.productName,
    category: purchase.category.name,
    supplier: purchase.supplier.companyName,
    quantity: purchase.quantity,
    unit: purchase.unit,
    unitPrice: purchase.unitPrice,
    totalPrice: purchase.price,
    remainingQuantity: purchase.remainingQuantity,
    status: purchase.status,
    expiryDate: purchase.expiryDate ? purchase.expiryDate.toISOString().split('T')[0] : null
  }))
  
  console.log(`📦 仕入一覧レポート完了: ${purchases.length}件`)
  
  return NextResponse.json({
    success: true,
    data: {
      purchases: formattedPurchases,
      total: purchases.length
    }
  })
}

async function getDeliveriesListReport(startDate: Date, endDate: Date) {
  console.log('🚚 納品一覧レポート生成中...')

  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: { gte: startDate, lte: endDate }
    },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          phone: true,
          deliveryAddress: true,
          billingAddress: true,
        }
      },
      items: {
        include: {
          purchase: {
            include: {
              category: true,
              supplier: true
            }
          },
          category: true
        }
      }
    },
    orderBy: { deliveryDate: 'desc' }
  })

  // 商品名を取得するヘルパー関数（直接入力モード・赤伝対応）
  const getProductName = (item: any): string => {
    if (item.productName) return item.productName
    if (item.purchase) return item.purchase.productName
    return '不明'
  }

  // カテゴリ名を取得するヘルパー関数
  const getCategoryName = (item: any): string => {
    if (item.category) return item.category.name
    if (item.purchase?.category) return item.purchase.category.name
    return '未分類'
  }

  // 仕入れ先名を取得するヘルパー関数
  const getSupplierName = (item: any): string => {
    if (item.purchase?.supplier) return item.purchase.supplier.companyName
    return '-'
  }

  const formattedDeliveries = deliveries.map(delivery => {
    const isReturn = (delivery as any).type === 'RETURN'

    return {
      id: delivery.id,
      deliveryNumber: (delivery as any).deliveryNumber || '-',
      deliveryDate: delivery.deliveryDate.toISOString().split('T')[0],
      customer: delivery.customer.companyName,
      totalAmount: delivery.totalAmount,
      status: delivery.status,
      type: (delivery as any).type || 'NORMAL',
      typeLabel: isReturn ? '赤伝' : '通常',
      inputMode: (delivery as any).inputMode || 'NORMAL',
      returnReason: isReturn ? (delivery as any).returnReason : null,
      itemCount: delivery.items.length,
      items: delivery.items.map(item => ({
        productName: getProductName(item),
        category: getCategoryName(item),
        supplier: getSupplierName(item),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount
      }))
    }
  })

  // 通常納品と赤伝の件数を集計
  const normalCount = formattedDeliveries.filter(d => d.type === 'NORMAL').length
  const returnCount = formattedDeliveries.filter(d => d.type === 'RETURN').length

  console.log(`🚚 納品一覧レポート完了: ${deliveries.length}件 (通常: ${normalCount}, 赤伝: ${returnCount})`)

  return NextResponse.json({
    success: true,
    data: {
      deliveries: formattedDeliveries,
      total: deliveries.length,
      normalCount,
      returnCount
    }
  })
}

async function getInventoryListReport() {
  console.log('📋 在庫一覧レポート生成中...')
  
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
  
  const formattedInventory = inventory.map(item => {
    const today = new Date()
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null
    let status = '良好'
    
    if (expiryDate) {
      const days = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (days <= 0) {
        status = '期限切れ'
      } else if (days <= 3) {
        status = '緊急'
      } else if (days <= 7) {
        status = '注意'
      }
    }
    
    return {
      id: item.id,
      productName: item.productName,
      category: item.category.name,
      supplier: item.supplier.companyName,
      remainingQuantity: item.remainingQuantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalValue: item.remainingQuantity * item.unitPrice,
      purchaseDate: item.purchaseDate.toISOString().split('T')[0],
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
      status
    }
  })
  
  const totalValue = formattedInventory.reduce((sum, item) => sum + item.totalValue, 0)
  
  console.log(`📋 在庫一覧レポート完了: ${inventory.length}品目, 総額${totalValue.toLocaleString()}円`)
  
  return NextResponse.json({
    success: true,
    data: {
      inventory: formattedInventory,
      total: inventory.length,
      totalValue
    }
  })
}

function getRandomColor() {
  const colors = ['#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16']
  return colors[Math.floor(Math.random() * colors.length)]
}