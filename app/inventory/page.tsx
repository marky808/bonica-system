"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Package, AlertTriangle, CheckCircle, Loader2, Download, Eye, FileText } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api"

interface InventoryItem {
  id: string
  productName: string
  category: string
  quantity: number
  unit: string
  unitNote?: string
  purchasePrice: number
  totalValue: number
  purchaseDate: string
  supplier: string
  status: string
  expiryDate?: string
}

interface InventoryStats {
  totalItems: number
  totalValue: number
  warningItems: number
}

export default function InventoryPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, totalValue: 0, warningItems: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // デバウンス処理：IME入力中でない場合のみ検索を実行
  useEffect(() => {
    if (isComposing) return

    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search, isComposing])

  const loadInventoryData = async () => {
    if (!isAuthenticated) return
    
    try {
      console.log('📦 在庫データ読み込み中...')
      setLoading(true)
      setError('')
      
      const response = await apiClient.getInventory({
        search: debouncedSearch || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      
      console.log('📦 在庫データレスポンス:', response)
      
      if (response.data) {
        console.log('📦 在庫実データ:', response.data)
        console.log('📦 items配列:', response.data.items)
        console.log('📦 items配列長さ:', response.data.items?.length)
        console.log('📦 stats:', response.data.stats)
        
        setInventoryData(response.data.items || [])
        setStats(response.data.stats || { totalItems: 0, totalValue: 0, warningItems: 0 })
      } else {
        console.error('❌ 在庫データエラー:', response.error)
        setError(response.error || '在庫データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('在庫データ読み込みエラー:', err)
      setError('在庫データの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadInventoryData()
    }
  }, [isAuthenticated, debouncedSearch, categoryFilter, statusFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const exportToCSV = () => {
    const csvData = inventoryData.map(item => ({
      '商品名': item.productName,
      'カテゴリー': item.category,
      '数量': item.quantity,
      '単位': item.unit,
      '単価': item.purchasePrice,
      '総額': item.totalValue,
      '仕入日': item.purchaseDate,
      '仕入先': item.supplier,
      '状態': item.status,
      '期限': item.expiryDate || ''
    }))

    const headers = Object.keys(csvData[0] || {})
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "良好":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            良好
          </Badge>
        )
      case "注意":
        return (
          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            注意
          </Badge>
        )
      case "緊急":
        return (
          <Badge variant="destructive" className="bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            緊急
          </Badge>
        )
      case "期限切れ":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            期限切れ
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">在庫データを読み込み中...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button 
              onClick={() => loadInventoryData()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              再読み込み
            </button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">在庫管理</h1>
            <p className="text-muted-foreground">現在の在庫状況を確認・管理できます</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={inventoryData.length === 0}
              className="h-12"
            >
              <Download className="h-4 w-4 mr-2" />
              CSVエクスポート
            </Button>
          </div>
        </div>

        {/* 在庫概要カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総在庫品目</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}品目</div>
              <p className="text-xs text-muted-foreground">残数量 &gt; 0の商品</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総在庫金額</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">残数量 × 単価</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">要注意商品</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.warningItems}品目</div>
              <p className="text-xs text-muted-foreground">期限切れ・間近</p>
            </CardContent>
          </Card>
        </div>

        {/* 検索・フィルター */}
        <Card>
          <CardHeader>
            <CardTitle>在庫検索・フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="商品名で検索..." 
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="野菜">野菜</SelectItem>
                  <SelectItem value="果物">果物</SelectItem>
                  <SelectItem value="穀物">穀物</SelectItem>
                  <SelectItem value="肉類">肉類</SelectItem>
                  <SelectItem value="魚介類">魚介類</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="good">良好</SelectItem>
                  <SelectItem value="warning">注意</SelectItem>
                  <SelectItem value="urgent">緊急</SelectItem>
                  <SelectItem value="expired">期限切れ</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('all')
                  setStatusFilter('all')
                }}
                className="whitespace-nowrap"
              >
                フィルタクリア
              </Button>
            </div>
            
            {/* フィルタ適用時の統計情報 */}
            {(search || categoryFilter !== 'all' || statusFilter !== 'all') && inventoryData.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Search className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    フィルタ適用中: {inventoryData.length}品目
                    <span className="ml-2">
                      (総額: {formatCurrency(inventoryData.reduce((sum, item) => sum + item.totalValue, 0))})
                    </span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 在庫一覧テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>在庫一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* モバイル用カード表示 */
              <div className="space-y-4">
                {inventoryData.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="flex items-center">{getStatusBadge(item.status)}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">在庫数量:</span>
                          <p className="font-medium">
                            {item.quantity}
                            {item.unit}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">仕入れ先:</span>
                          <p className="font-medium">{item.supplier}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">単価:</span>
                          <p className="font-medium">{formatCurrency(item.purchasePrice)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">消費期限:</span>
                          <p className="font-medium">{item.expiryDate}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-sm">総額:</span>
                        <p className="font-bold text-lg">{formatCurrency(item.totalValue)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              /* デスクトップ用テーブル表示 */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名</TableHead>
                      <TableHead>カテゴリー</TableHead>
                      <TableHead>在庫数量</TableHead>
                      <TableHead>単価</TableHead>
                      <TableHead>総額</TableHead>
                      <TableHead>仕入れ先</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>消費期限</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          {item.quantity}
                          {item.unit}
                        </TableCell>
                        <TableCell>{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{item.expiryDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
