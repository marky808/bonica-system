import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  console.log('=== 在庫一覧API開始 ===')
  
  try {
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    
    console.log(`🔍 在庫検索パラメータ: search=${search}, category=${category}, status=${status}`)
    
    // 在庫データ（remainingQuantity > 0）を取得
    const whereCondition: any = {
      remainingQuantity: {
        gt: 0,
      },
    }
    
    // 検索条件を追加
    if (search) {
      whereCondition.productName = {
        contains: search,
      }
    }
    
    if (category && category !== 'all') {
      whereCondition.category = {
        name: category,
      }
    }
    
    const inventoryItems = await prisma.purchase.findMany({
      where: whereCondition,
      include: {
        category: true,
        supplier: true,
      },
      orderBy: [
        { expiryDate: 'asc' },
        { productName: 'asc' },
      ],
    })
    
    console.log(`📦 在庫品目数: ${inventoryItems.length}`)
    
    // 在庫状態を計算
    const processedItems = inventoryItems.map((item) => {
      const today = new Date()
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null
      let status = '良好'
      
      if (expiryDate) {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry <= 0) {
          status = '期限切れ'
        } else if (daysUntilExpiry <= 3) {
          status = '緊急'
        } else if (daysUntilExpiry <= 7) {
          status = '注意'
        }
      }
      
      return {
        id: item.id,
        productName: item.productName,
        category: item.category.name,
        quantity: item.remainingQuantity,
        unit: item.unit,
        unitNote: item.unitNote,
        purchasePrice: item.unitPrice,
        totalValue: item.remainingQuantity * item.unitPrice,
        purchaseDate: item.purchaseDate.toISOString().split('T')[0],
        supplier: item.supplier.companyName,
        status,
        expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
      }
    })
    
    // ステータスフィルタリング
    const filteredItems = status && status !== 'all' 
      ? processedItems.filter(item => {
          switch (status) {
            case 'good':
              return item.status === '良好'
            case 'warning':
              return item.status === '注意'
            case 'urgent':
              return item.status === '緊急'
            case 'expired':
              return item.status === '期限切れ'
            default:
              return true
          }
        })
      : processedItems
    
    // 統計情報を計算
    const totalItems = filteredItems.length
    const totalValue = filteredItems.reduce((sum, item) => sum + item.totalValue, 0)
    const warningItems = processedItems.filter(item => ['注意', '緊急', '期限切れ'].includes(item.status)).length
    
    console.log(`📊 在庫統計: ${totalItems}品目, 総額${totalValue.toLocaleString()}円, 要注意${warningItems}品目`)
    
    console.log('=== 在庫一覧API完了 ===')
    
    return NextResponse.json({
      items: filteredItems,
      stats: {
        totalItems,
        totalValue,
        warningItems,
      },
    })
    
  } catch (error: any) {
    console.error('在庫一覧API エラー:', error)
    return NextResponse.json(
      { error: error.message || '在庫データの取得に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}