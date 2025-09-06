"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, CheckCircle, Clock } from "lucide-react"

interface MonthlyDeliveryData {
  customerId: string
  customerName: string
  deliveryCount: number
  totalAmount: number
  invoiceGenerated: boolean
  invoiceId?: string
}

// Mock data
const mockMonthlyData: Record<string, MonthlyDeliveryData[]> = {
  "2024-01": [
    {
      customerId: "1",
      customerName: "ABC市場",
      deliveryCount: 5,
      totalAmount: 450000,
      invoiceGenerated: true,
      invoiceId: "INV-2024-01-001",
    },
    {
      customerId: "2",
      customerName: "XYZ青果店",
      deliveryCount: 3,
      totalAmount: 280000,
      invoiceGenerated: false,
    },
    {
      customerId: "3",
      customerName: "DEF農協",
      deliveryCount: 8,
      totalAmount: 720000,
      invoiceGenerated: true,
      invoiceId: "INV-2024-01-002",
    },
  ],
  "2024-02": [
    {
      customerId: "1",
      customerName: "ABC市場",
      deliveryCount: 4,
      totalAmount: 380000,
      invoiceGenerated: false,
    },
    {
      customerId: "2",
      customerName: "XYZ青果店",
      deliveryCount: 6,
      totalAmount: 420000,
      invoiceGenerated: false,
    },
  ],
}

const months = [
  { value: "2024-02", label: "2024年2月" },
  { value: "2024-01", label: "2024年1月" },
  { value: "2023-12", label: "2023年12月" },
  { value: "2023-11", label: "2023年11月" },
]

interface InvoiceCreationProps {
  onInvoiceGenerated?: (customerId: string, month: string) => void
}

export function InvoiceCreation({ onInvoiceGenerated }: InvoiceCreationProps) {
  const [selectedMonth, setSelectedMonth] = useState("2024-02")
  const [generatingInvoices, setGeneratingInvoices] = useState<Set<string>>(new Set())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const currentData = mockMonthlyData[selectedMonth] || []
  const totalCustomers = currentData.length
  const generatedCount = currentData.filter((data) => data.invoiceGenerated).length
  const progressPercentage = totalCustomers > 0 ? (generatedCount / totalCustomers) * 100 : 0

  const handleGenerateInvoice = async (customerId: string) => {
    setGeneratingInvoices((prev) => new Set([...prev, customerId]))

    // Simulate API call
    setTimeout(() => {
      // TODO: Implement actual invoice generation API call
      console.log(`Generating invoice for customer ${customerId} for month ${selectedMonth}`)
      alert(`${currentData.find((d) => d.customerId === customerId)?.customerName}の請求書を生成しました`)

      setGeneratingInvoices((prev) => {
        const newSet = new Set(prev)
        newSet.delete(customerId)
        return newSet
      })

      onInvoiceGenerated?.(customerId, selectedMonth)
    }, 2000)
  }

  const handleBulkGenerate = async () => {
    const pendingCustomers = currentData.filter((data) => !data.invoiceGenerated).map((data) => data.customerId)

    for (const customerId of pendingCustomers) {
      await handleGenerateInvoice(customerId)
    }
  }

  const getTotalAmount = () => {
    return currentData.reduce((total, data) => total + data.totalAmount, 0)
  }

  return (
    <div className="space-y-6">
      {/* 月選択と概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-balance">請求書作成</CardTitle>
          <CardDescription className="text-pretty">月次の納品実績から請求書を作成します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">対象月を選択</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">進行状況</span>
                  <span className="text-sm text-muted-foreground">
                    {generatedCount} / {totalCustomers} 完了
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {totalCustomers > 0 && generatedCount < totalCustomers && (
                <Button onClick={handleBulkGenerate} className="w-full h-12">
                  <FileText className="h-4 w-4 mr-2" />
                  未作成の請求書を一括生成
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 月次集計情報 */}
      {currentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{months.find((m) => m.value === selectedMonth)?.label} 集計情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalCustomers}社</div>
                <div className="text-sm text-muted-foreground">納品先数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{formatCurrency(getTotalAmount())}</div>
                <div className="text-sm text-muted-foreground">合計納品金額</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {currentData.reduce((total, data) => total + data.deliveryCount, 0)}件
                </div>
                <div className="text-sm text-muted-foreground">総納品件数</div>
              </div>
            </div>

            {/* 納品先別一覧 */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>納品先</TableHead>
                    <TableHead>納品件数</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((data) => (
                    <TableRow key={data.customerId}>
                      <TableCell className="font-medium">{data.customerName}</TableCell>
                      <TableCell>{data.deliveryCount}件</TableCell>
                      <TableCell>{formatCurrency(data.totalAmount)}</TableCell>
                      <TableCell>
                        {data.invoiceGenerated ? (
                          <Badge className="bg-primary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            作成済み
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            未作成
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {data.invoiceGenerated ? (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            ダウンロード
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateInvoice(data.customerId)}
                            disabled={generatingInvoices.has(data.customerId)}
                          >
                            {generatingInvoices.has(data.customerId) ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                請求書作成
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* データがない場合 */}
      {currentData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">納品実績がありません</h3>
            <p className="text-muted-foreground">
              {months.find((m) => m.value === selectedMonth)?.label}の納品実績が見つかりませんでした。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
