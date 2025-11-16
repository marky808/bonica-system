"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, Loader2, Search, Package, ShoppingCart } from "lucide-react"
import { apiClient, type Customer, type Purchase, type Delivery } from "@/lib/api"

const deliverySchema = z.object({
  customerId: z.string().min(1, "お客様を選択してください"),
  deliveryDate: z.string().min(1, "納品日を選択してください"),
  items: z.array(z.object({
    purchaseId: z.string().min(1, "商品を選択してください"),
    quantity: z.number().min(0.01, "数量を入力してください"),
    unitPrice: z.number().min(0, "単価を入力してください"),
    deliveryDate: z.string().optional(),
    unit: z.string().optional(),
    taxRate: z.number().default(8),
  })).min(1, "納品商品を1つ以上選択してください"),
}).superRefine((data, ctx) => {
  // 在庫チェック
  data.items.forEach((item, index) => {
    // この時点では allPurchases にアクセスできないため、
    // バリデーションは handleSubmit で実行
  })
})

type DeliveryFormData = z.infer<typeof deliverySchema>

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void
  onCancel: () => void
  initialData?: Partial<Delivery>
}

export function DeliveryForm({ onSubmit, onCancel, initialData }: DeliveryFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([])
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      deliveryDate: initialData?.deliveryDate
        ? new Date(initialData.deliveryDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      items: initialData?.items?.map(item => ({
        purchaseId: item.purchaseId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        deliveryDate: item.deliveryDate
          ? new Date(item.deliveryDate).toISOString().split("T")[0]
          : "",
        unit: item.unit || "",
        taxRate: item.taxRate || 8,
      })) || [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Helper function to get display product name with prefix
  const getDisplayProductName = (purchase: Purchase) => {
    if (purchase.productPrefix?.name) {
      return `${purchase.productPrefix.name}${purchase.productName}`
    }
    return purchase.productName
  }

  useEffect(() => {
    if (isComposing) return

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, isComposing])

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      setError('')
      
      try {
        const [customersRes, purchasesRes] = await Promise.all([
          apiClient.getCustomers(),
          apiClient.getAvailablePurchases()
        ])
        
        if (customersRes.data && Array.isArray(customersRes.data)) {
          setCustomers(customersRes.data)
        } else {
          console.error('顧客データが配列ではありません:', customersRes.data)
          setCustomers([])
          setError('お客様データの読み込みに失敗しました')
        }
        
        if (purchasesRes.data && Array.isArray(purchasesRes.data)) {
          setAllPurchases(purchasesRes.data)
          setAvailablePurchases(purchasesRes.data)
        } else {
          console.error('購入データが配列ではありません:', purchasesRes.data)
          setAllPurchases([])
          setAvailablePurchases([])
          setError('在庫データの読み込みに失敗しました')
        }
      } catch (err) {
        console.error('データ読み込みエラー:', err)
        setCustomers([])
        setAllPurchases([])
        setAvailablePurchases([])
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setAvailablePurchases(Array.isArray(allPurchases) ? allPurchases : [])
      return
    }

    const allPurchasesArray = Array.isArray(allPurchases) ? allPurchases : []
    const filtered = allPurchasesArray.filter(purchase => {
      const displayName = getDisplayProductName(purchase)
      return displayName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        purchase.category?.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        purchase.supplier?.companyName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    })

    setAvailablePurchases(filtered)
  }, [debouncedSearchQuery, allPurchases])

  const handleSubmit = (data: DeliveryFormData) => {
    // 在庫チェック
    const stockErrors = []
    for (const [index, item] of data.items.entries()) {
      const purchase = getPurchaseInfo(item.purchaseId)
      if (purchase && item.quantity > purchase.remainingQuantity) {
        const displayName = getDisplayProductName(purchase)
        stockErrors.push(`商品${index + 1}: ${displayName} の在庫が不足しています。在庫: ${purchase.remainingQuantity}${purchase.unit}, 要求: ${item.quantity}${purchase.unit}`)
      }
    }

    if (stockErrors.length > 0) {
      setError(`在庫不足エラー:\n${stockErrors.join('\n')}`)
      return
    }

    setError('')
    onSubmit(data)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target !== e.currentTarget) {
      e.preventDefault()
    }
  }

  const handleClear = () => {
    form.reset({
      customerId: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      items: [],
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const calculateTotalAmount = () => {
    return form.watch("items").reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0)
    }, 0)
  }

  const getPurchaseInfo = (purchaseId: string) => {
    // 配列が正しく初期化されているかチェック
    const allPurchasesArray = Array.isArray(allPurchases) ? allPurchases : []
    const availablePurchasesArray = Array.isArray(availablePurchases) ? availablePurchases : []

    return allPurchasesArray.find(p => p.id === purchaseId) || availablePurchasesArray.find(p => p.id === purchaseId)
  }

  const getMaxQuantity = (purchaseId: string) => {
    const purchase = getPurchaseInfo(purchaseId)
    return purchase ? purchase.remainingQuantity : 0
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
        <CardTitle className="text-2xl font-bold text-balance flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          {initialData ? "納品情報編集" : "新規納品登録"}
        </CardTitle>
        <CardDescription className="text-pretty">
          在庫から商品を選択して納品情報を入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>お客様 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="お客様を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(customers) && customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.companyName} ({customer.contactPerson})
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
                    <FormLabel>納品日 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="h-12"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  在庫検索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="商品名・カテゴリーで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                        }
                      }}
                      className="h-12"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="h-12"
                    >
                      クリア
                    </Button>
                  </div>
                </div>

                {Array.isArray(availablePurchases) && availablePurchases.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">利用可能な在庫 ({availablePurchases.length}件)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {availablePurchases.map((purchase) => {
                        const currentItems = form.watch('items')
                        const isSelected = currentItems.some(item => item.purchaseId === purchase.id)
                        
                        return (
                          <div
                            key={purchase.id}
                            className={`p-3 border rounded-lg cursor-pointer text-sm transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => {
                              if (isSelected) return
                              
                              const currentItems = form.getValues('items')
                              const emptySlotIndex = currentItems.findIndex(item => !item.purchaseId)
                              
                              const newItemData = {
                                purchaseId: purchase.id,
                                quantity: 0,
                                unitPrice: purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0),
                                taxRate: 8,
                                deliveryDate: "",
                                unit: purchase.unit || ""
                              }

                              if (emptySlotIndex !== -1) {
                                const updatedItem = {
                                  ...currentItems[emptySlotIndex],
                                  purchaseId: purchase.id,
                                  unitPrice: purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0)
                                }
                                update(emptySlotIndex, updatedItem)
                              } else {
                                append(newItemData)
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">{getDisplayProductName(purchase)}</div>
                              {isSelected && (
                                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  選択済み
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              カテゴリー: {purchase.category?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              在庫: {purchase.remainingQuantity} {purchase.unit}
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                              単価: {formatCurrency(purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0))}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              仕入れ先: {purchase.supplier?.companyName}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchQuery ? 
                        `「${searchQuery}」に該当する商品が見つかりませんでした` : 
                        '利用可能な在庫がありません'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  納品商品
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">商品 {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.purchaseId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>商品 *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value)
                                const purchase = getPurchaseInfo(value)
                                if (purchase) {
                                  form.setValue(`items.${index}.unitPrice`, purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0))
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="商品を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60">
                                {Array.isArray(availablePurchases) && availablePurchases.map((purchase) => (
                                  <SelectItem key={purchase.id} value={purchase.id}>
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium">{getDisplayProductName(purchase)}</span>
                                      <span className="text-sm text-muted-foreground">
                                        在庫: {purchase.remainingQuantity} {purchase.unit}
                                      </span>
                                    </div>
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
                        name={`items.${index}.quantity`}
                        render={({ field }) => {
                          const purchaseId = form.watch(`items.${index}.purchaseId`)
                          const maxQuantity = getMaxQuantity(purchaseId)
                          const purchase = getPurchaseInfo(purchaseId)
                          
                          return (
                            <FormItem>
                              <FormLabel>
                                数量 * {purchase && `(最大: ${maxQuantity} ${purchase.unit})`}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  max={maxQuantity}
                                  placeholder="数量を入力"
                                  value={field.value > 0 ? field.value : ""}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === "") {
                                      field.onChange(0)
                                    } else {
                                      const numValue = Number.parseFloat(value)
                                      if (!isNaN(numValue)) {
                                        // 在庫数を超えていないかチェック
                                        if (numValue > maxQuantity) {
                                          setError(`在庫数を超えています。最大 ${maxQuantity} ${purchase?.unit || '個'} まで入力可能です。`)
                                        } else {
                                          setError('')
                                        }
                                        field.onChange(numValue)
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                    }
                                  }}
                                  className="h-12"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
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
                                placeholder="単価を入力"
                                value={field.value > 0 ? field.value : ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "") {
                                    field.onChange(0)
                                  } else {
                                    const numValue = Number.parseFloat(value)
                                    if (!isNaN(numValue)) {
                                      field.onChange(numValue)
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                  }
                                }}
                                className="h-12"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.deliveryDate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>納品日</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
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
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>単位</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="kg, 個, 箱"
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
                        name={`items.${index}.taxRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>税率</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="税率を選択" />
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

                    {form.watch(`items.${index}.purchaseId`) && form.watch(`items.${index}.quantity`) && (
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">
                          小計: {formatCurrency(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unitPrice`))}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({
                      purchaseId: "",
                      quantity: 0,
                      unitPrice: 0,
                      deliveryDate: form.getValues("deliveryDate"),
                      unit: "",
                      taxRate: 8
                    })}
                    className="h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    商品を追加
                  </Button>
                  
                  <div className="text-right">
                    <span className="text-xl font-bold text-primary">
                      合計: {formatCurrency(calculateTotalAmount())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button type="submit" className="flex-1 h-12">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {initialData ? "更新" : "登録"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} className="flex-1 h-12 bg-transparent">
                <X className="h-4 w-4 mr-2" />
                クリア
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