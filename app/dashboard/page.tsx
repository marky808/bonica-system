import { MainLayout } from "@/components/layout/main-layout"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MonthlyChart } from "@/components/dashboard/monthly-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import type { DashboardStats } from "@/types"

// Mock data - in real app, this would come from API
const mockStats: DashboardStats = {
  monthlyPurchaseAmount: 3100000,
  monthlyDeliveryAmount: 4200000,
  monthlyProfit: 1100000,
  totalInventoryValue: 2800000,
  totalInventoryItems: 45,
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">ダッシュボード</h1>
          <p className="text-muted-foreground text-pretty">BONICA管理システムの概要をご確認いただけます</p>
        </div>

        <StatsCards stats={mockStats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MonthlyChart />
          </div>
          <div>
            <RecentActivities />
          </div>
        </div>

        <QuickActions />
      </div>
    </MainLayout>
  )
}
