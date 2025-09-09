"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// サンプルデータ
const monthlyData = [
  { month: "2024年1月", purchase: 2800000, delivery: 3200000, profit: 400000 },
  { month: "2024年2月", purchase: 2600000, delivery: 3100000, profit: 500000 },
  { month: "2024年3月", purchase: 3200000, delivery: 3800000, profit: 600000 },
  { month: "2024年4月", purchase: 2900000, delivery: 3400000, profit: 500000 },
  { month: "2024年5月", purchase: 3100000, delivery: 3600000, profit: 500000 },
  { month: "2024年6月", purchase: 3300000, delivery: 3900000, profit: 600000 },
  { month: "2024年7月", purchase: 3500000, delivery: 4200000, profit: 700000 },
  { month: "2024年8月", purchase: 3200000, delivery: 3800000, profit: 600000 },
  { month: "2024年9月", purchase: 2800000, delivery: 3300000, profit: 500000 },
]

const categoryData = [
  { name: "野菜", value: 45, color: "#22c55e" },
  { name: "果物", value: 30, color: "#f59e0b" },
  { name: "穀物", value: 15, color: "#3b82f6" },
  { name: "その他", value: 10, color: "#8b5cf6" },
]

const supplierData = [
  { name: "ABC農園", purchase: 1200000, delivery: 1400000, profit: 200000 },
  { name: "田中農場", purchase: 800000, delivery: 950000, profit: 150000 },
  { name: "山田農業", purchase: 600000, delivery: 720000, profit: 120000 },
  { name: "佐藤農園", purchase: 500000, delivery: 600000, profit: 100000 },
  { name: "その他", purchase: 400000, delivery: 480000, profit: 80000 },
]

export default function ReportsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  const [selectedPeriod, setSelectedPeriod] = useState(currentYear.toString())
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`)
  const [activeTab, setActiveTab] = useState("monthly")
  
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [supplierData, setSupplierData] = useState<any[]>([])
  const [profitData, setProfitData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [purchasesData, setPurchasesData] = useState<any[]>([])
  const [deliveriesData, setDeliveriesData] = useState<any[]>([])
  const [inventoryData, setInventoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const loadReportData = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      setError('')
      
      console.log(`📊 レポートデータ読み込み: ${activeTab}, ${startDate} ～ ${endDate}`)
      
      const response = await apiClient.getReports({
        startDate,
        endDate,
        type: activeTab as 'monthly' | 'category' | 'supplier' | 'profit'
      })
      
      console.log('📈 レポートレスポンス:', response)
      
      if (response.data) {
        const actualData = response.data.data || response.data
        console.log('📊 実レポートデータ:', actualData)
        
        switch (activeTab) {
          case 'monthly':
            setMonthlyData(actualData.monthlyData || [])
            setSummary(actualData.summary)
            break
          case 'category':
            setCategoryData(actualData.categoryData || [])
            break
          case 'supplier':
            setSupplierData(actualData.supplierData || [])
            break
          case 'profit':
            setProfitData(actualData)
            break
          case 'purchases':
            setPurchasesData(actualData.purchases || [])
            break
          case 'deliveries':
            setDeliveriesData(actualData.deliveries || [])
            break
          case 'inventory':
            setInventoryData(actualData.inventory || [])
            break
        }
      } else {
        console.error('❌ レポートデータエラー:', response.error)
        setError(response.error || 'レポートデータの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('レポートデータ読み込みエラー:', err)
      setError('レポートデータの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCsvDownload = async (type: 'monthly' | 'purchases' | 'deliveries' | 'inventory') => {
    try {
      setDownloading(true)
      console.log(`📄 CSV ダウンロード開始: ${type}`)
      
      const blob = await apiClient.downloadCsv({
        startDate,
        endDate,
        type
      })
      
      // ファイル名を生成
      const filename = type === 'inventory' 
        ? `在庫一覧_${new Date().toISOString().split('T')[0]}.csv`
        : `${type === 'monthly' ? '月次レポート' : type === 'purchases' ? '仕入一覧' : '納品一覧'}_${startDate}_${endDate}.csv`
      
      // ダウンロードを実行
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log(`✅ CSV ダウンロード完了: ${filename}`)
    } catch (err: any) {
      console.error('CSV ダウンロードエラー:', err)
      setError('CSV ダウンロードに失敗しました')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [isAuthenticated, activeTab, startDate, endDate])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">レポート</h1>
            <p className="text-muted-foreground">過去データの分析と傾向を確認できます</p>
          </div>
          <Button 
            className="flex items-center gap-2" 
            onClick={() => handleCsvDownload(activeTab === 'monthly' || activeTab === 'category' || activeTab === 'supplier' || activeTab === 'profit' ? 'monthly' : 'monthly')}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV出力
          </Button>
        </div>

        {/* 期間選択 */}
        <Card>
          <CardHeader>
            <CardTitle>分析期間</CardTitle>
            <CardDescription>レポートの対象期間を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">期間</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024年</SelectItem>
                    <SelectItem value="2023">2023年</SelectItem>
                    <SelectItem value="custom">カスタム期間</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">開始日</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">終了日</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={loadReportData} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      更新中...
                    </>
                  ) : (
                    '更新'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monthly">月次レポート</TabsTrigger>
            <TabsTrigger value="category">商品別分析</TabsTrigger>
            <TabsTrigger value="supplier">仕入れ先別</TabsTrigger>
            <TabsTrigger value="profit">収益分析</TabsTrigger>
          </TabsList>

          {/* 月次レポート */}
          <TabsContent value="monthly" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総仕入れ金額</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary ? `¥${summary.totalPurchase.toLocaleString()}` : '¥0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内合計仕入額
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総納品金額</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary ? `¥${summary.totalDelivery.toLocaleString()}` : '¥0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内合計売上額
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総粗利</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary ? `¥${summary.totalProfit.toLocaleString()}` : '¥0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    粗利率 <span className={`font-medium ${summary && summary.avgProfitRate >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {summary ? `${summary.avgProfitRate.toFixed(1)}%` : '0.0%'}
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>月次推移</CardTitle>
                <CardDescription>仕入れ・納品・粗利の月別推移</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">データを読み込み中...</span>
                  </div>
                ) : monthlyData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">表示するデータがありません</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                          formatter={(value: any, name: string) => [
                            `¥${Number(value).toLocaleString()}`,
                            name
                          ]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="purchase" stroke="#ef4444" strokeWidth={3} name="仕入れ金額" />
                        <Line type="monotone" dataKey="delivery" stroke="#22c55e" strokeWidth={3} name="納品金額" />
                        <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} name="粗利" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 商品別分析 */}
          <TabsContent value="category" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>商品カテゴリー別構成比</CardTitle>
                  <CardDescription>取扱商品の構成比率</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">データを読み込み中...</span>
                    </div>
                  ) : categoryData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">表示するデータがありません</p>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '構成比']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>カテゴリー別売上</CardTitle>
                  <CardDescription>各カテゴリーの売上実績</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">データを読み込み中...</span>
                    </div>
                  ) : categoryData.length === 0 ? (
                    <div className="text-center p-8">
                      <p className="text-muted-foreground">表示するデータがありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryData.map((category) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">¥{Number(category.purchaseAmount || 0).toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">{Number(category.value || 0).toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 仕入れ先別分析 */}
          <TabsContent value="supplier" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>仕入れ先別実績</CardTitle>
                <CardDescription>主要仕入れ先の取引実績</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">データを読み込み中...</span>
                  </div>
                ) : supplierData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-muted-foreground">表示するデータがありません</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                          formatter={(value: any, name: string) => [
                            `¥${Number(value).toLocaleString()}`,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="purchase" fill="#ef4444" name="仕入れ金額" />
                        <Bar dataKey="delivery" fill="#22c55e" name="納品金額" />
                        <Bar dataKey="profit" fill="#3b82f6" name="粗利" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 収益分析 */}
          <TabsContent value="profit" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>粗利率推移</CardTitle>
                  <CardDescription>月別の粗利率変化</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">データを読み込み中...</span>
                    </div>
                  ) : profitData?.monthlyProfitRates?.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">表示するデータがありません</p>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={profitData?.monthlyProfitRates || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '粗利率']}
                          />
                          <Line type="monotone" dataKey="profitRate" stroke="#8b5cf6" strokeWidth={3} name="粗利率(%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>収益性指標</CardTitle>
                  <CardDescription>主要な収益性指標</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">データを読み込み中...</span>
                    </div>
                  ) : !profitData ? (
                    <div className="text-center p-8">
                      <p className="text-muted-foreground">表示するデータがありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="font-medium">平均粗利率</span>
                        <Badge variant="secondary">
                          {profitData.avgProfitRate ? `${profitData.avgProfitRate.toFixed(1)}%` : '0.0%'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="font-medium">月平均売上</span>
                        <Badge variant="secondary">
                          ¥{profitData.avgMonthlySales ? profitData.avgMonthlySales.toLocaleString() : '0'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="font-medium">月平均粗利</span>
                        <Badge variant="secondary">
                          ¥{profitData.avgMonthlyProfit ? profitData.avgMonthlyProfit.toLocaleString() : '0'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="font-medium">最高月売上</span>
                        <Badge variant="secondary">
                          ¥{profitData.maxMonthlySales ? profitData.maxMonthlySales.toLocaleString() : '0'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
