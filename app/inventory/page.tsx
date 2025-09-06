"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Package, AlertTriangle, CheckCircle } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

// サンプル在庫データ
const inventoryData = [
  {
    id: "INV001",
    productName: "トマト（大玉）",
    category: "野菜",
    quantity: 50,
    unit: "kg",
    purchasePrice: 300,
    totalValue: 15000,
    purchaseDate: "2024-01-15",
    supplier: "田中農園",
    status: "良好",
    expiryDate: "2024-01-25",
  },
  {
    id: "INV002",
    productName: "キャベツ",
    category: "野菜",
    quantity: 30,
    unit: "個",
    purchasePrice: 150,
    totalValue: 4500,
    purchaseDate: "2024-01-14",
    supplier: "山田農場",
    status: "注意",
    expiryDate: "2024-01-22",
  },
  {
    id: "INV003",
    productName: "りんご（ふじ）",
    category: "果物",
    quantity: 100,
    unit: "個",
    purchasePrice: 120,
    totalValue: 12000,
    purchaseDate: "2024-01-10",
    supplier: "青森果樹園",
    status: "良好",
    expiryDate: "2024-02-10",
  },
]

export default function InventoryPage() {
  const isMobile = useIsMobile()
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
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
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            注意
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">在庫管理</h1>
            <p className="text-muted-foreground">現在の在庫状況を確認・管理できます</p>
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
              <div className="text-2xl font-bold">45品目</div>
              <p className="text-xs text-muted-foreground">前日比 +2品目</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総在庫金額</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥2,800,000</div>
              <p className="text-xs text-muted-foreground">前日比 +5.2%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">要注意商品</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">3品目</div>
              <p className="text-xs text-muted-foreground">期限切れ間近</p>
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
                  <Input placeholder="商品名で検索..." className="pl-10" />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="カテゴリー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="vegetable">野菜</SelectItem>
                  <SelectItem value="fruit">果物</SelectItem>
                  <SelectItem value="grain">穀物</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="good">良好</SelectItem>
                  <SelectItem value="warning">注意</SelectItem>
                  <SelectItem value="expired">期限切れ</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
