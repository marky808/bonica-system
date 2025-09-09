"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, Loader2 } from "lucide-react"
import { apiClient, type Category, type Supplier, type Purchase } from "@/lib/api"

const purchaseSchema = z.object({
  productName: z.string().min(1, "商品名を入力してください"),
  categoryId: z.string().min(1, "カテゴリーを選択してください"),
  quantity: z.number().min(0.01, "数量を入力してください"),
  unit: z.string().min(1, "単位を入力してください"),
  unitNote: z.string().optional(),
  unitPrice: z.number().min(0, "単価を入力してください"),
  price: z.number().min(0, "総額は自動計算されます"),
  taxType: z.enum(["TAXABLE", "TAX_FREE"]),
  supplierId: z.string().min(1, "仕入れ先を選択してください"),
  purchaseDate: z.string().min(1, "仕入れ日を選択してください"),
  expiryDate: z.string().optional(),
  deliveryFee: z.string().optional(),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>

const productSuggestions = [
  "いちご（あまおう）",
  "いちご（とちおとめ）",
  "すいか（大玉）",
  "すいか（小玉）",
  "メロン（アンデス）",
  "メロン（マスク）",
  "トマト（大玉）",
  "トマト（ミニ）",
]

const unitSuggestions = ["kg", "g", "トン", "箱", "パック", "個", "束", "袋", "平トレー"]

interface PurchaseFormProps {
  onSubmit: (data: PurchaseFormData) => void
  onCancel: () => void
  initialData?: Partial<Purchase>
}

export function PurchaseForm({ onSubmit, onCancel, initialData }: PurchaseFormProps) {
  const [productSuggestionsVisible, setProductSuggestionsVisible] = useState(false)
  const [unitSuggestionsVisible, setUnitSuggestionsVisible] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getSuppliers()
        ])
        
        if (categoriesRes.data) {
          setCategories(categoriesRes.data)
        } else {
          setError('カテゴリーの読み込みに失敗しました')
        }
        
        if (suppliersRes.data) {
          setSuppliers(suppliersRes.data)
        } else {
          setError('仕入れ先の読み込みに失敗しました')
        }
      } catch (err) {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productName: initialData?.productName || "",
      categoryId: initialData?.categoryId || "",
      quantity: initialData?.quantity || undefined,
      unit: initialData?.unit || "",
      unitNote: initialData?.unitNote || "",
      unitPrice: initialData?.unitPrice || initialData?.price / (initialData?.quantity || 1) || undefined,
      price: initialData?.price || undefined,
      taxType: (initialData?.taxType as "TAXABLE" | "TAX_FREE") || "TAXABLE",
      supplierId: initialData?.supplier?.id || "",
      purchaseDate: initialData?.purchaseDate 
        ? new Date(initialData.purchaseDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      expiryDate: initialData?.expiryDate 
        ? new Date(initialData.expiryDate).toISOString().split("T")[0]
        : "",
      deliveryFee: initialData?.deliveryFee || "",
    },
  })

  const handleSubmit = (data: PurchaseFormData) => {
    // Calculate total price from unit price and quantity
    const calculatedPrice = (data.unitPrice || 0) * (data.quantity || 0)
    onSubmit({ ...data, price: calculatedPrice })
  }

  const handleClear = () => {
    form.reset({
      productName: "",
      categoryId: "",
      quantity: undefined,
      unit: "",
      unitNote: "",
      unitPrice: undefined,
      price: undefined,
      taxType: "TAXABLE",
      supplierId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      deliveryFee: "",
    })
  }

  // Watch for changes in quantity and unit price to auto-calculate total price
  const watchQuantity = form.watch("quantity")
  const watchUnitPrice = form.watch("unitPrice")

  // Auto-calculate total price
  useEffect(() => {
    const quantity = watchQuantity || 0
    const unitPrice = watchUnitPrice || 0
    const calculatedPrice = quantity * unitPrice
    form.setValue("price", calculatedPrice)
  }, [watchQuantity, watchUnitPrice, form])

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
        <CardTitle className="text-2xl font-bold text-balance">
          {initialData ? "仕入れ情報編集" : "新規仕入れ登録"}
        </CardTitle>
        <CardDescription className="text-pretty">農産物の仕入れ情報を入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 商品名入力 */}
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>商品名 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="商品名を入力"
                          {...field}
                          onFocus={() => setProductSuggestionsVisible(true)}
                          onBlur={() => setTimeout(() => setProductSuggestionsVisible(false), 200)}
                          className="h-12"
                        />
                        {productSuggestionsVisible && (
                          <div className="absolute top-full left-0 right-0 z-10 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                            {productSuggestions
                              .filter((suggestion) => suggestion.toLowerCase().includes(field.value.toLowerCase()))
                              .map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                                  onClick={() => {
                                    field.onChange(suggestion)
                                    setProductSuggestionsVisible(false)
                                  }}
                                >
                                  {suggestion}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* カテゴリー選択 */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>カテゴリー *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* 数量入力 */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数量 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number.parseFloat(e.target.value))
                        }
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 単位入力 */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>単位 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="単位を入力"
                          {...field}
                          onFocus={() => setUnitSuggestionsVisible(true)}
                          onBlur={() => setTimeout(() => setUnitSuggestionsVisible(false), 200)}
                          className="h-12"
                        />
                        {unitSuggestionsVisible && (
                          <div className="absolute top-full left-0 right-0 z-10 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                            {unitSuggestions
                              .filter((suggestion) => suggestion.toLowerCase().includes(field.value.toLowerCase()))
                              .map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                                  onClick={() => {
                                    field.onChange(suggestion)
                                    setUnitSuggestionsVisible(false)
                                  }}
                                >
                                  {suggestion}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 単位備考 */}
              <FormField
                control={form.control}
                name="unitNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>単位備考</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 1箱20個入り、Mサイズ中心" {...field} className="h-12" />
                    </FormControl>
                    <FormDescription>単位の詳細情報を入力してください</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 単価 */}
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>単価 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="200"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number.parseFloat(e.target.value))
                        }
                        className="h-12"
                      />
                    </FormControl>
                    <FormDescription>円/{form.watch("unit") || "単位"}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 総額（自動計算） */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>総額（自動計算）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        value={field.value || ""}
                        readOnly
                        className="h-12 bg-gray-50 text-gray-700"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormDescription>数量 × 単価で自動計算されます</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 仕入れ先選択 */}
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仕入れ先 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="仕入れ先を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 仕入れ日 */}
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仕入れ日 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 賞味期限 */}
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>賞味期限</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12" />
                    </FormControl>
                    <FormDescription>商品の賞味期限を入力してください（任意）</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 消費税区分 */}
            <FormField
              control={form.control}
              name="taxType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>消費税区分 *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="TAXABLE" id="taxable" />
                        <Label htmlFor="taxable">課税</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="TAX_FREE" id="tax_free" />
                        <Label htmlFor="tax_free">非課税</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 配送料備考 */}
            <FormField
              control={form.control}
              name="deliveryFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>配送料備考</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="配送に関する特記事項があれば入力してください"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ボタン */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button type="submit" className="flex-1 h-12">
                <Plus className="h-4 w-4 mr-2" />
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
