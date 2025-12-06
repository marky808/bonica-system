import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { DashboardStats } from "@/types"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  console.log('🎯 StatsCards received stats:', stats)
  
  const formatCurrency = (amount: number) => {
    console.log('🔢 formatCurrency input:', amount, typeof amount, 'isNaN:', isNaN(amount))
    if (isNaN(amount) || amount === null || amount === undefined) {
      console.warn('⚠️ Invalid amount for formatting:', amount)
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(0)
    }
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const profit = stats.monthlyDeliveryAmount - stats.monthlyPurchaseAmount
  const profitMargin = stats.monthlyDeliveryAmount > 0 ? ((profit / stats.monthlyDeliveryAmount) * 100).toFixed(1) : "0"
  
  console.log('🧮 Calculated values:')
  console.log('- profit:', profit)
  console.log('- profitMargin:', profitMargin)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Link href="/purchases" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">当月仕入れ金額</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.monthlyPurchaseAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">前月比 +12.5%</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/deliveries" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              当月納品金額
              {stats.unlinkedDeliveriesCount && stats.unlinkedDeliveriesCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  未紐付{stats.unlinkedDeliveriesCount}件
                </Badge>
              )}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.monthlyDeliveryAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">前月比 +8.2%</p>
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">当月粗利</CardTitle>
          <DollarSign className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{formatCurrency(profit)}</div>
          <p className="text-xs text-muted-foreground mt-1">利益率 {profitMargin}%</p>
        </CardContent>
      </Card>

      <Link href="/inventory" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">在庫状況</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.totalInventoryItems}品目</div>
            <p className="text-xs text-muted-foreground mt-1">総額 {formatCurrency(stats.totalInventoryValue)}</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
