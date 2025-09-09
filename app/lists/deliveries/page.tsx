"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Truck, Download, Loader2, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Delivery, type Customer } from "@/lib/api"

export default function DeliveriesListPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomers()
      loadDeliveries()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadDeliveries()
    }
  }, [currentPage, searchTerm, selectedCustomer, selectedStatus])

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers()
      if (response.data) setCustomers(response.data)
    } catch (error) {
      console.error('顧客データ取得エラー:', error)
    }
  }

  const loadDeliveries = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await apiClient.getDeliveries({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        customer: selectedCustomer === "all" ? undefined : selectedCustomer || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus || undefined,
      })
      
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setDeliveries(response.data.deliveries)
        setTotalPages(response.data.pagination.totalPages)
        setTotalItems(response.data.pagination.total)
      }
    } catch (error) {
      setError('納品データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = async () => {
    try {
      const blob = await apiClient.downloadCsv({
        type: 'deliveries'
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `納品一覧_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV出力エラー:', error)
      setError('CSV出力に失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="default" className="bg-green-500">納品完了</Badge>
      case 'PENDING':
        return <Badge variant="secondary">処理中</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">キャンセル</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedCustomer("all")
    setSelectedStatus("all")
    setCurrentPage(1)
  }

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
            <h1 className="text-3xl font-bold">納品一覧</h1>
            <p className="text-muted-foreground">
              納品データの一覧表示と検索
            </p>
          </div>
          <Button onClick={downloadCsv} className="gap-2">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
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
                <label className="text-sm font-medium mb-2 block">顧客名検索</label>
                <Input
                  placeholder="顧客名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">顧客</label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">ステータス</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="PENDING">処理中</SelectItem>
                    <SelectItem value="DELIVERED">納品完了</SelectItem>
                    <SelectItem value="CANCELLED">キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters} className="w-full">
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
                <Truck className="h-5 w-5" />
                納品データ ({totalItems}件)
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {currentPage} / {totalPages} ページ
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="mt-2">読み込み中...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                検索条件に一致する納品データがありません
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">納品日</th>
                        <th className="text-left p-3">顧客名</th>
                        <th className="text-right p-3">合計金額</th>
                        <th className="text-center p-3">商品数</th>
                        <th className="text-center p-3">ステータス</th>
                        <th className="text-left p-3">freee請求書ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(delivery.deliveryDate)}</td>
                          <td className="p-3 font-medium">{delivery.customer.companyName}</td>
                          <td className="text-right p-3 font-medium">{formatCurrency(delivery.totalAmount)}</td>
                          <td className="text-center p-3">{delivery.items.length}点</td>
                          <td className="text-center p-3">{getStatusBadge(delivery.status)}</td>
                          <td className="p-3">{delivery.freeeInvoiceId || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ページネーション */}
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} 件 / {totalItems} 件中
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}