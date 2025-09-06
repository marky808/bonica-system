"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp } from "lucide-react"
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
  const [selectedPeriod, setSelectedPeriod] = useState("2024")
  const [startDate, setStartDate] = useState("2024-01-01")
  const [endDate, setEndDate] = useState("2024-09-30")

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">レポート</h1>
            <p className="text-muted-foreground">過去データの分析と傾向を確認できます</p>
          </div>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
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
                <Button className="w-full">更新</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="monthly" className="space-y-6">
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
                  <div className="text-2xl font-bold">¥27,500,000</div>
                  <p className="text-xs text-muted-foreground">
                    前年同期比 <span className="text-green-600">+12.5%</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総納品金額</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">¥32,300,000</div>
                  <p className="text-xs text-muted-foreground">
                    前年同期比 <span className="text-green-600">+8.3%</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総粗利</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">¥4,800,000</div>
                  <p className="text-xs text-muted-foreground">
                    粗利率 <span className="text-blue-600">14.9%</span>
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
                      />
                      <Legend />
                      <Line type="monotone" dataKey="purchase" stroke="#ef4444" strokeWidth={3} name="仕入れ金額" />
                      <Line type="monotone" dataKey="delivery" stroke="#22c55e" strokeWidth={3} name="納品金額" />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} name="粗利" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>カテゴリー別売上</CardTitle>
                  <CardDescription>各カテゴリーの売上実績</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData.map((category) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">¥{(category.value * 100000).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{category.value}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      />
                      <Legend />
                      <Bar dataKey="purchase" fill="#ef4444" name="仕入れ金額" />
                      <Bar dataKey="delivery" fill="#22c55e" name="納品金額" />
                      <Bar dataKey="profit" fill="#3b82f6" name="粗利" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyData.map((item) => ({
                          ...item,
                          profitRate: ((item.profit / item.delivery) * 100).toFixed(1),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Line type="monotone" dataKey="profitRate" stroke="#8b5cf6" strokeWidth={3} name="粗利率(%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>収益性指標</CardTitle>
                  <CardDescription>主要な収益性指標</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">平均粗利率</span>
                      <Badge variant="secondary">14.9%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">月平均売上</span>
                      <Badge variant="secondary">¥3,589,000</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">月平均粗利</span>
                      <Badge variant="secondary">¥533,000</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">最高月売上</span>
                      <Badge variant="secondary">¥4,200,000</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
