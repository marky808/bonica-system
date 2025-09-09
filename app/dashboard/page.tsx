'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MonthlyChart } from "@/components/dashboard/monthly-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api"
import { Loader2 } from "lucide-react"
import type { DashboardStats } from "@/types"

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!isAuthenticated) return
      
      try {
        console.log('📊 ダッシュボード: 統計データを読み込み中...')
        setStatsLoading(true)
        setError('')
        
        const response = await apiClient.getDashboardStats()
        console.log('📈 ダッシュボード統計レスポンス:', response)
        
        if (response.data) {
          console.log('🔍 Raw response.data:', response.data)
          
          // APIクライアントは { data: responseJson } の形で返し、
          // responseJsonは { success: true, data: actualData } の形なので、
          // response.data.data にアクセスする必要がある
          const actualData = response.data.data || response.data
          console.log('🔍 Actual data:', actualData)
          console.log('🔍 Individual values:')
          console.log('- monthlyPurchaseAmount:', actualData.monthlyPurchaseAmount, typeof actualData.monthlyPurchaseAmount)
          console.log('- monthlyDeliveryAmount:', actualData.monthlyDeliveryAmount, typeof actualData.monthlyDeliveryAmount)
          console.log('- monthlyProfit:', actualData.monthlyProfit, typeof actualData.monthlyProfit)
          console.log('- totalInventoryValue:', actualData.totalInventoryValue, typeof actualData.totalInventoryValue)
          console.log('- totalInventoryItems:', actualData.totalInventoryItems, typeof actualData.totalInventoryItems)
          
          const dashboardStats: DashboardStats = {
            monthlyPurchaseAmount: Number(actualData.monthlyPurchaseAmount) || 0,
            monthlyDeliveryAmount: Number(actualData.monthlyDeliveryAmount) || 0,
            monthlyProfit: Number(actualData.monthlyProfit) || 0,
            totalInventoryValue: Number(actualData.totalInventoryValue) || 0,
            totalInventoryItems: Number(actualData.totalInventoryItems) || 0,
          }
          console.log('✅ ダッシュボード統計設定完了:', dashboardStats)
          setStats(dashboardStats)
        } else {
          console.error('❌ ダッシュボード統計エラー:', response.error)
          setError(response.error || 'ダッシュボード統計の取得に失敗しました')
        }
      } catch (err: any) {
        console.error('ダッシュボード統計読み込みエラー:', err)
        setError('ダッシュボード統計の取得中にエラーが発生しました')
      } finally {
        setStatsLoading(false)
      }
    }

    loadDashboardStats()
  }, [isAuthenticated])

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">
          {isLoading ? '認証中...' : '統計データを読み込み中...'}
        </span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (error && !stats) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
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
        <div>
          <h1 className="text-3xl font-bold text-balance">ダッシュボード</h1>
          <p className="text-muted-foreground text-pretty">
            ようこそ、{user?.name}さん！BONICA管理システムの概要をご確認いただけます
          </p>
        </div>

        {stats && <StatsCards stats={stats} />}

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
