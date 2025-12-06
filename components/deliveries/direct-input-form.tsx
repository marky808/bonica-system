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
import { Plus, X, Loader2, Edit3, ShoppingCart } from "lucide-react"
import { apiClient, type Customer, type Category } from "@/lib/api"

const directDeliverySchema = z.object({
  customerId: z.string().min(1, "お客様を選択してください"),
  deliveryDate: z.string().min(1, "納品日を選択してください"),
  items: z.array(z.object({
    productName: z.string().min(1, "商品名を入力してください"),
    categoryId: z.string().min(1, "カテゴリーを選択してください"),
    quantity: z.number().min(0.01, "数量を入力してください"),
    unit: z.string().min(1, "単位を入力してください"),
    unitPrice: z.number().min(0, "単価を入力してください"),
    taxRate: z.number().default(8),
    notes: z.string().optional(),
  })).min(1, "納品商品を1つ以上追加してください"),
})

type DirectDeliveryFormData = z.infer<typeof directDeliverySchema>

interface DirectInputFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function DirectInputForm({ onSubmit, onCancel }: DirectInputFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [productSuggestions, setProductSuggestions] = useState<string[]>([])

  const form = useForm<DirectDeliveryFormData>({
    resolver: zodResolver(directDeliverySchema),
    defaultValues: {
      customerId: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      items: [{
        productName: "",
        categoryId: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        taxRate: 8,
        notes: "",
      }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

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

        // 過去の商品名を取得（サジェスト用）
        try {
          const purchasesRes = await apiClient.getPurchases({ limit: 100 })
          if (purchasesRes.data?.purchases) {
            const names = [...new Set(purchasesRes.data.purchases.map((p: any) => p.productName))]
            setProductSuggestions(names as string[])
          }
        } catch (e) {
          console.log('商品名サジェストの取得に失敗しました')
        }
      } catch (err) {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = (data: DirectDeliveryFormData) => {
    setError('')
    onSubmit({ ...data, inputMode: 'DIRECT' })
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
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Edit3 className="h-6 w-6" />
          直接入力モード - 新規納品登録
        </CardTitle>
        <CardDescription>
          仕入れデータを参照せずに直接納品情報を入力します。後から仕入れと紐付けできます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            直接入力モードで作成された納品は「仕入れ未登録」として記録されます。
            仕入れ登録画面から後で紐付けを行ってください。
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>納品先 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="納品先を選択" />
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
                    <FormLabel>納品日 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">納品商品</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">商品 {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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
                                placeholder="商品名を入力"
                                {...field}
                                className="h-12"
                                list={`product-suggestions-${index}`}
                              />
                            </FormControl>
                            <datalist id={`product-suggestions-${index}`}>
                              {productSuggestions.map((name) => (
                                <option key={name} value={name} />
                              ))}
                            </datalist>
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
                            <Textarea
                              placeholder="備考を入力（任意）"
                              {...field}
                              className="resize-none"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch(`items.${index}.quantity`) > 0 && form.watch(`items.${index}.unitPrice`) > 0 && (
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
                      productName: "",
                      categoryId: "",
                      quantity: 0,
                      unit: "",
                      unitPrice: 0,
                      taxRate: 8,
                      notes: "",
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
                納品登録（仕入れ未紐付け）
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
