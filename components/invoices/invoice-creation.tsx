"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"
import { apiClient, type Customer } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface MonthlyDeliveryData {
  customerId: string
  customerName: string
  billingCycle: string
  billingDay: number
  paymentTerms: string
  deliveryCount: number
  totalAmount: number
  hasInvoice: boolean
  invoiceId?: string
  deliveryIds: string[]
}

// 動的に月のオプションを生成
const generateMonthOptions = () => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`
    options.push({ value, label, year: date.getFullYear(), month: date.getMonth() + 1 })
  }
  return options
}

interface InvoiceCreationProps {
  onInvoiceGenerated?: (customerId: string, year: number, month: number) => void
}

export function InvoiceCreation({ onInvoiceGenerated }: InvoiceCreationProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyDeliveryData[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("all")
  const [generatingInvoices, setGeneratingInvoices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const months = generateMonthOptions()
  const currentMonthOption = months.find(m => m.value === selectedMonth)
  
  // フィルタリングされたデータ
  const filteredData = selectedCustomer === "all" 
    ? monthlyData 
    : monthlyData.filter(data => data.customerId === selectedCustomer)
  
  
  const totalCustomers = filteredData.length
  const generatedCount = filteredData.filter((data) => data.hasInvoice).length
  const progressPercentage = totalCustomers > 0 ? (generatedCount / totalCustomers) * 100 : 0

  // データ取得関数
  const loadMonthlyData = async (year: number, month: number, customerId?: string) => {
    console.log('🚀 COMPONENT LOADED: InvoiceCreation loadMonthlyData called')
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('📊 InvoiceCreation: Starting loadMonthlyData', { year, month, customerId })
      
      // 実際のAPIを呼び出し
      console.log('📡 InvoiceCreation: Calling API for monthly data')
      const response = await apiClient.request(`/invoices/monthly?year=${year}&month=${month}${customerId && customerId !== 'all' ? `&customerId=${customerId}` : ''}`)
      console.log('📥 InvoiceCreation: Full API response received:', JSON.stringify(response, null, 2))
      
      // レスポンス構造をより詳細にログ出力
      console.log('🔍 Response structure analysis:')
      console.log('- response.data exists:', !!response.data)
      console.log('- response.data.data exists:', !!(response.data && response.data.data))
      console.log('- response.data.summaries exists:', !!(response.data && response.data.summaries))
      console.log('- response.data.data.summaries exists:', !!(response.data && response.data.data && response.data.data.summaries))
      console.log('- response.error:', response.error)

      // APIレスポンスの構造に基づいて正しくアクセス
      let summaries = null;
      if (response.data && response.data.data && response.data.data.summaries) {
        summaries = response.data.data.summaries;
        console.log('✅ Found summaries at response.data.data.summaries:', summaries.length, 'items')
      } else if (response.data && response.data.summaries) {
        summaries = response.data.summaries;
        console.log('✅ Found summaries at response.data.summaries:', summaries.length, 'items')
      }

      if (summaries && summaries.length > 0) {
        console.log('📝 InvoiceCreation: Setting monthly data with summaries:', summaries)
        setMonthlyData(summaries)
        setSuccess(`${year}年${month}月のデータを読み込みました（${summaries.length}顧客）`)
      } else {
        console.log('⚠️ InvoiceCreation: No summaries found in response')
        // 認証エラーの場合は特別に処理
        if (response.error?.includes('Authentication') || response.error?.includes('401')) {
          setError('認証が必要です。ログインしてください。')
          console.error('認証エラーが発生しました。APIコールを停止します。')
          return // ここでreturnして再度の呼び出しを防ぐ
        } else if (summaries && summaries.length === 0) {
          setError(`${year}年${month}月の納品実績がありません`)
          setMonthlyData([])
        } else {
          setError(response.error || '月次データの取得に失敗しました')
          setMonthlyData([])
        }
      }
    } catch (err: any) {
      console.error('InvoiceCreation: loadMonthlyData error:', err)
      // 認証エラーかチェック
      if (err.message?.includes('401') || err.message?.includes('Authentication')) {
        setError('認証が必要です。ログインしてください。')
        router.push('/login')
      } else {
        setError('通信エラーが発生しました')
      }
      setMonthlyData([])
    } finally {
      setLoading(false)
    }
  }

  // Mount detection effect
  useEffect(() => {
    console.log('🚀 InvoiceCreation component mounted!')
    setMounted(true)
  }, [])

  // Authentication redirect effect
  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [mounted, authLoading, isAuthenticated, router])

  // 顧客データ取得
  useEffect(() => {
    // Client-side only: ensure this runs after hydration and mounting and user is authenticated
    if (mounted && isAuthenticated && !authLoading) {
      const loadCustomers = async () => {
        try {
          console.log('👥 InvoiceCreation: Loading customers on client-side')
          const response = await apiClient.getCustomers()
          if (response.data) {
            setCustomers(response.data)
          }
        } catch (err) {
          console.error('Failed to load customers:', err)
        }
      }
      loadCustomers()
    }
  }, [mounted, isAuthenticated, authLoading])

  // Manual data loading prevents infinite loops
  // Auto-loading is disabled to prevent infinite loops
  // Users must manually click the "データを読み込み" button to load monthly data

  const handleGenerateInvoice = async (customerId: string) => {
    if (!currentMonthOption) return
    
    setGeneratingInvoices((prev) => new Set([...prev, customerId]))
    setError('')

    try {
      // apiClientを使用して認証ヘッダーを含める
      const response = await apiClient.request('/invoices/monthly', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          year: currentMonthOption.year,
          month: currentMonthOption.month
        })
      })

      if (response.data) {
        const customer = filteredData.find(d => d.customerId === customerId)
        alert(`${customer?.customerName}の請求書を作成しました\n請求書ID: ${response.data.invoiceId}\n合計金額: ${formatCurrency(response.data.totalAmount)}`)
        
        // データを再取得してUIを更新
        await loadMonthlyData(currentMonthOption.year, currentMonthOption.month, selectedCustomer)
        
        onInvoiceGenerated?.(customerId, currentMonthOption.year, currentMonthOption.month)
      } else {
        setError(response.error || '請求書の作成に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setGeneratingInvoices((prev) => {
        const newSet = new Set(prev)
        newSet.delete(customerId)
        return newSet
      })
    }
  }

  const handleBulkGenerate = async () => {
    const pendingCustomers = filteredData.filter((data) => !data.hasInvoice).map((data) => data.customerId)

    for (const customerId of pendingCustomers) {
      await handleGenerateInvoice(customerId)
    }
  }

  const getTotalAmount = () => {
    return filteredData.reduce((total, data) => total + data.totalAmount, 0)
  }

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return '月次'
      case 'weekly': return '週次'  
      case 'immediate': return '都度'
      default: return cycle
    }
  }

  const getPaymentTermsLabel = (terms: string) => {
    switch (terms) {
      case 'immediate': return '即金'
      case '7days': return '7日後'
      case '15days': return '15日後' 
      case '30days': return '30日後'
      case '60days': return '60日後'
      case 'endofmonth': return '月末締翌月末払'
      default: return terms
    }
  }

  // Prevent SSR hydration issues and handle authentication
  if (!mounted || authLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">システムを初期化しています...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">認証が必要です</h3>
            <p className="text-muted-foreground mb-4">
              請求書作成機能を使用するには、まずログインしてください。
            </p>
            <Button onClick={() => router.push('/login')}>
              ログインページへ
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 月選択と概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-balance">請求書作成</CardTitle>
          <CardDescription className="text-pretty">月次の納品実績から請求書を作成します</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Manual data loading button */}
          <div className="mb-6">
            <Button 
              onClick={() => {
                console.log('🔥 Button clicked! currentMonthOption:', currentMonthOption)
                if (currentMonthOption) {
                  console.log('🔥 About to call loadMonthlyData with:', {
                    year: currentMonthOption.year,
                    month: currentMonthOption.month,
                    selectedCustomer
                  })
                  loadMonthlyData(currentMonthOption.year, currentMonthOption.month, selectedCustomer)
                } else {
                  console.log('❌ currentMonthOption is null/undefined')
                }
              }}
              disabled={loading || !currentMonthOption}
              className="w-full h-12"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  月次データを読み込み中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {monthlyData.length > 0 ? 'データを再読み込み' : `${currentMonthOption?.label} のデータを読み込み`}
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">対象月を選択</label>
              <Select value={selectedMonth} onValueChange={(value) => {
                setSelectedMonth(value)
                setSuccess('')
                setError('')
              }}>
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

            <div>
              <label className="text-sm font-medium mb-2 block">顧客でフィルタ</label>
              <Select value={selectedCustomer} onValueChange={(value) => {
                setSelectedCustomer(value)
                setSuccess('')
                setError('')
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="顧客を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全顧客</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName}
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
      {!loading && filteredData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{currentMonthOption?.label} 集計情報</CardTitle>
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
                  {filteredData.reduce((total, data) => total + data.deliveryCount, 0)}件
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
                    <TableHead>請求設定</TableHead>
                    <TableHead>納品件数</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((data) => (
                    <TableRow key={data.customerId}>
                      <TableCell className="font-medium">{data.customerName}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{getBillingCycleLabel(data.billingCycle)}</div>
                          <div className="text-muted-foreground">
                            {data.billingDay}日締め / {getPaymentTermsLabel(data.paymentTerms)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{data.deliveryCount}件</TableCell>
                      <TableCell>{formatCurrency(data.totalAmount)}</TableCell>
                      <TableCell>
                        {data.hasInvoice ? (
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
                        {data.hasInvoice ? (
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            作成済み
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateInvoice(data.customerId)}
                            disabled={generatingInvoices.has(data.customerId)}
                          >
                            {generatingInvoices.has(data.customerId) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      {/* ローディング状態 */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">月次データを読み込んでいます...</p>
          </CardContent>
        </Card>
      )}

      {/* データがない場合 */}
      {!loading && filteredData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">納品実績がありません</h3>
            <p className="text-muted-foreground">
              {currentMonthOption?.label}の納品実績が見つかりませんでした。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
