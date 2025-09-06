"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

const monthlyData = [
  { month: "4月", purchase: 2400000, delivery: 3200000 },
  { month: "5月", purchase: 2800000, delivery: 3600000 },
  { month: "6月", purchase: 3200000, delivery: 4100000 },
  { month: "7月", purchase: 2900000, delivery: 3800000 },
  { month: "8月", purchase: 3500000, delivery: 4500000 },
  { month: "9月", purchase: 3100000, delivery: 4200000 },
]

export function MonthlyChart() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      notation: "compact",
    }).format(value)
  }

  const handleExportCSV = () => {
    // TODO: Implement CSV export functionality
    console.log("CSV export requested")
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  console.log("[v0] Monthly chart rendering with data:", monthlyData)

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>月次レポート</CardTitle>
            <CardDescription>仕入れ・納品金額の推移</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV出力
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="purchase"
                stroke="#dc2626"
                strokeWidth={3}
                name="仕入れ金額"
                connectNulls={true}
                activeDot={{ r: 6, fill: "#dc2626" }}
              />
              <Line
                type="monotone"
                dataKey="delivery"
                stroke="#16a34a"
                strokeWidth={3}
                name="納品金額"
                connectNulls={true}
                activeDot={{ r: 6, fill: "#16a34a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
