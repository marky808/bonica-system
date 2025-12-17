"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, Loader2, RotateCcw, Search, Check } from "lucide-react"
import { apiClient, type Customer, type Delivery, type Category } from "@/lib/api"

const returnDeliverySchema = z.object({
  customerId: z.string().min(1, "お客様を選択してください"),
  deliveryDate: z.string().min(1, "返品日を選択してください"),
  originalDeliveryId: z.string().optional(),
  returnReason: z.string().min(1, "返品理由を入力してください"),
  items: z.array(z.object({
    productName: z.string().min(1, "商品名を入力してください"),
    categoryId: z.string().min(1, "カテゴリーを選択してください"),
    quantity: z.number().min(0.01, "数量を入力してください"),
    unit: z.string().min(1, "単位を入力してください"),
    unitPrice: z.number().min(0, "単価を入力してください"),
    taxRate: z.number().default(8),
    notes: z.string().optional(),
    // 元の納品明細から引き継ぐ場合の参照用（purchaseIdがある場合）
    purchaseId: z.string().optional(),
  })).min(1, "返品商品を1つ以上追加してください"),
})

type ReturnDeliveryFormData = z.infer<typeof returnDeliverySchema>

interface ReturnDeliveryFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function ReturnDeliveryForm({ onSubmit, onCancel }: ReturnDeliveryFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customerDeliveries, setCustomerDeliveries] = useState<Delivery[]>([])
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<ReturnDeliveryFormData>({
    resolver: zodResolver(returnDeliverySchema),
    defaultValues: {
      customerId: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      originalDeliveryId: "",
      returnReason: "",
      items: [],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const selectedCustomerId = form.watch("customerId")

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [customersRes, categoriesRes] = await Promise.all([
          apiClient.getCustomers(),
          apiClient.getCategories()
        ])

        if (customersRes.data && Array.isArray(customersRes.data)) {
          setCustomers(customersRes.data)
        }

        if (categoriesRes.data && Array.isArray(categoriesRes.data)) {
          setCategories(categoriesRes.data)
        }
      } catch (err) {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 顧客選択時に該当顧客の納品一覧を取得
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDeliveries([])
      setSelectedDelivery(null)
      return
    }

    const loadDeliveries = async () => {
      setLoadingDeliveries(true)
      try {
        const response = await apiClient.getDeliveries({
          customer: selectedCustomerId,
          limit: 50,
          type: 'NORMAL' // 通常納品のみ（赤伝は除外）
        })
        if (response.data?.deliveries) {
          setCustomerDeliveries(response.data.deliveries)
        }
      } catch (err) {
        console.error('納品データの取得に失敗しました:', err)
      } finally {
        setLoadingDeliveries(false)
      }
    }

    loadDeliveries()
  }, [selectedCustomerId])

  // 納品選択時に商品を自動セット
  const handleDeliverySelect = (deliveryId: string) => {
    const delivery = customerDeliveries.find(d => d.id === deliveryId)
    if (!delivery) return

    setSelectedDelivery(delivery)
    form.setValue("originalDeliveryId", deliveryId)

    // 選択した納品の商品を返品商品としてセット
    const returnItems = delivery.items?.map(item => {
      // 商品名を決定（直接入力 or 仕入れから）
      const productName = item.productName || item.purchase?.productName || '不明な商品'
      // カテゴリーIDを決定
      const categoryId = item.categoryId || item.purchase?.categoryId || ''

      return {
        productName,
        categoryId,
        quantity: Math.abs(item.quantity), // 正の値で表示（送信時にマイナスにする）
        unit: item.unit || item.purchase?.unit || '個',
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 8,
        notes: '',
        purchaseId: item.purchaseId || undefined,
      }
    }) || []

    replace(returnItems)
  }

  // 手動で商品追加
  const handleAddItem = () => {
    append({
      productName: "",
      categoryId: "",
      quantity: 0,
      unit: "",
      unitPrice: 0,
      taxRate: 8,
      notes: "",
      purchaseId: undefined,
    })
  }

  const handleSubmit = (data: ReturnDeliveryFormData) => {
    setError('')

    // type: 'RETURN' と inputMode: 'DIRECT' を追加して送信
    onSubmit({
      ...data,
      type: 'RETURN',
      inputMode: 'DIRECT', // 赤伝は直接入力として扱う
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const calculateTotalAmount = () => {
    return form.watch("items").reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0)
    }, 0)
  }

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
          <RotateCcw className="h-6 w-6" />
          赤伝（返品）登録
        </CardTitle>
        <CardDescription>
          返品・値引きを登録します。金額はマイナスとして計上され、請求書に反映されます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            赤伝で登録された商品は在庫に戻りません（廃棄扱い）。
            金額はマイナス計上され、請求書作成時に自動で控除されます。
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 顧客選択 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>お客様 *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedDelivery(null)
                        replace([]) // 商品リストをクリア
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="お客様を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>返品日 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 元の納品選択 */}
            {selectedCustomerId && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    元の納品を選択（任意）
                  </CardTitle>
                  <CardDescription>
                    返品対象の納品を選択すると、商品情報が自動入力されます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDeliveries ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : customerDeliveries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {customerDeliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDelivery?.id === delivery.id
                              ? 'bg-red-50 border-red-300'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleDeliverySelect(delivery.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {formatDate(delivery.deliveryDate)}
                            </div>
                            {selectedDelivery?.id === delivery.id && (
                              <Check className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {delivery.items?.length || 0}商品 / {formatCurrency(delivery.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {delivery.items?.slice(0, 2).map((item, idx) => (
                              <span key={idx}>
                                {item.productName || item.purchase?.productName || '商品'}
                                {idx < Math.min(delivery.items!.length - 1, 1) && ', '}
                              </span>
                            ))}
                            {(delivery.items?.length || 0) > 2 && '...'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      このお客様の納品データがありません
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 返品理由 */}
            <FormField
              control={form.control}
              name="returnReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>返品理由 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="返品理由を入力してください（例：商品不良、数量間違い、値引き対応など）"
                      {...field}
                      className="resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 返品商品 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">返品商品</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {selectedCustomerId
                      ? "上の納品を選択するか、「商品を追加」ボタンで返品商品を追加してください"
                      : "まずお客様を選択してください"
                    }
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-red-200 rounded-lg space-y-4 bg-red-50/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-red-700">返品商品 {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>商品名 *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="商品名"
                                  {...field}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.categoryId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>カテゴリー *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="カテゴリーを選択" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>数量 *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="数量"
                                  value={field.value > 0 ? field.value : ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value)
                                    field.onChange(isNaN(value) ? 0 : value)
                                  }}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>単位 *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="kg, 個, 袋"
                                  {...field}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>単価 *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="1"
                                  placeholder="単価"
                                  value={field.value > 0 ? field.value : ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value)
                                    field.onChange(isNaN(value) ? 0 : value)
                                  }}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.taxRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>税率</FormLabel>
                              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="8">8%</SelectItem>
                                  <SelectItem value="10">10%</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>備考</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="備考（任意）"
                                {...field}
                                className="h-12"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch(`items.${index}.quantity`) > 0 && form.watch(`items.${index}.unitPrice`) > 0 && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-600">
                            返品額: -{formatCurrency(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unitPrice`))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="h-12"
                    disabled={!selectedCustomerId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    商品を追加
                  </Button>

                  {fields.length > 0 && (
                    <div className="text-right">
                      <span className="text-xl font-bold text-red-600">
                        返品合計: -{formatCurrency(calculateTotalAmount())}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1 h-12 bg-red-600 hover:bg-red-700"
                disabled={fields.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                赤伝を登録
              </Button>
              <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 h-12">
                キャンセル
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
