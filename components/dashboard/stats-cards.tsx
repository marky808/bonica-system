import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react"
import Link from "next/link"
import type { DashboardStats } from "@/types"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const profit = stats.monthlyDeliveryAmount - stats.monthlyPurchaseAmount
  const profitMargin = stats.monthlyDeliveryAmount > 0 ? ((profit / stats.monthlyDeliveryAmount) * 100).toFixed(1) : "0"

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
            <CardTitle className="text-sm font-medium text-muted-foreground">当月納品金額</CardTitle>
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
