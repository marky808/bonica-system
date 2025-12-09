"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Package, Download, AlertTriangle, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api"

interface InventoryItem {
  id: string
  productName: string
  category: string
  supplier: string
  quantity: number
  unit: string
  unitNote?: string
  purchasePrice: number
  totalValue: number
  purchaseDate: string
  status: string
  expiryDate?: string
  notes?: string
}

interface InventoryStats {
  totalItems: number
  totalValue: number
  warningItems: number
}

export default function InventoryListPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, totalValue: 0, warningItems: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const loadInventory = useCallback(async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await apiClient.getInventory({
        search: searchTerm || undefined,
        category: selectedCategory === "all" ? undefined : selectedCategory || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus || undefined
      })
      
      if (response.error) {
        setError(response.error)
      } else if (response.data?.data) {
        setInventory(response.data.data.items || [])
        setStats(response.data.data.stats || { totalItems: 0, totalValue: 0, warningItems: 0 })
      } else {
        setError('データの形式が正しくありません')
      }
    } catch (error) {
      setError('在庫データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory, selectedStatus])

  useEffect(() => {
    if (isAuthenticated) {
      loadInventory()
    }
  }, [isAuthenticated, loadInventory])

  useEffect(() => {
    if (isAuthenticated) {
      loadInventory()
    }
  }, [isAuthenticated, searchTerm, selectedCategory, selectedStatus, loadInventory])

  const downloadCsv = async () => {
    try {
      const blob = await apiClient.downloadCsv({
        type: 'inventory'
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `在庫一覧_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV出力エラー:', error)
      setError('CSV出力に失敗しました')
    }
  }

  const getStatusBadge = (status: string, expiryDate?: string) => {
    if (!expiryDate) {
      return <Badge variant="default" className="bg-green-500">良好</Badge>
    }

    const today = new Date()
    const expiry = new Date(expiryDate)
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (days <= 0) {
      return <Badge variant="destructive">期限切れ</Badge>
    } else if (days <= 3) {
      return <Badge variant="destructive" className="bg-red-600">緊急</Badge>
    } else if (days <= 7) {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">注意</Badge>
    } else {
      return <Badge variant="default" className="bg-green-500">良好</Badge>
    }
  }

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null
    
    const today = new Date()
    const expiry = new Date(expiryDate)
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (days <= 0) return '期限切れ'
    return `${days}日`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  // カテゴリの一意リストを取得
  const uniqueCategories = [...new Set(inventory?.map(item => item.category) || [])]

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">在庫一覧</h1>
            <p className="text-muted-foreground">
              在庫データの一覧表示と管理
            </p>
          </div>
          <Button onClick={downloadCsv} className="gap-2">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">総品目数</p>
                  <p className="text-2xl font-bold">{stats?.totalItems || 0}品目</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">在庫総額</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">要注意品目</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.warningItems || 0}品目</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* フィルター */}
        <Card>
          <CardHeader>
            <CardTitle>検索・フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">商品名検索</label>
                <Input
                  placeholder="商品名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">カテゴリ</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">状態</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="良好">良好</SelectItem>
                    <SelectItem value="注意">注意</SelectItem>
                    <SelectItem value="緊急">緊急</SelectItem>
                    <SelectItem value="期限切れ">期限切れ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedCategory("all")
                    setSelectedStatus("all")
                  }}
                  className="w-full"
                >
                  リセット
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 結果表示 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                在庫データ ({inventory?.length || 0}品目)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="mt-2">読み込み中...</p>
              </div>
            ) : !inventory || inventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                検索条件に一致する在庫データがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">商品名</th>
                      <th className="text-left p-3">カテゴリ</th>
                      <th className="text-left p-3">仕入先</th>
                      <th className="text-right p-3">在庫数</th>
                      <th className="text-right p-3">単価</th>
                      <th className="text-right p-3">在庫金額</th>
                      <th className="text-left p-3">仕入日</th>
                      <th className="text-left p-3">消費期限</th>
                      <th className="text-left p-3">期限まで</th>
                      <th className="text-center p-3">状態</th>
                      <th className="text-left p-3">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory?.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{item.productName}</td>
                        <td className="p-3">{item.category}</td>
                        <td className="p-3">{item.supplier}</td>
                        <td className="text-right p-3">{item.quantity} {item.unit}</td>
                        <td className="text-right p-3">{formatCurrency(item.purchasePrice)}</td>
                        <td className="text-right p-3 font-medium">{formatCurrency(item.totalValue)}</td>
                        <td className="p-3">{formatDate(item.purchaseDate)}</td>
                        <td className="p-3">
                          {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                        </td>
                        <td className="p-3">
                          {getDaysUntilExpiry(item.expiryDate) || '-'}
                        </td>
                        <td className="text-center p-3">
                          {getStatusBadge(item.status, item.expiryDate)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}