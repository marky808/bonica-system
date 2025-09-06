"use client"

import { useState } from "react"
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
import { Plus, X } from "lucide-react"
import type { Purchase } from "@/types"

const purchaseSchema = z.object({
  productName: z.string().min(1, "商品名を入力してください"),
  categoryId: z.string().min(1, "カテゴリーを選択してください"),
  quantity: z.number().min(0.01, "数量を入力してください"),
  unit: z.string().min(1, "単位を入力してください"),
  unitNotes: z.string().optional(),
  price: z.number().min(0, "仕入れ価格を入力してください"),
  taxType: z.enum(["included", "excluded"]),
  supplierId: z.string().min(1, "仕入れ先を選択してください"),
  date: z.string().min(1, "仕入れ日を選択してください"),
  expiryDate: z.string().optional(),
  deliveryNotes: z.string().optional(),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>

// Mock data
const categories = [
  { id: "1", name: "いちご" },
  { id: "2", name: "すいか" },
  { id: "3", name: "メロン" },
  { id: "4", name: "トマト" },
  { id: "5", name: "きゅうり" },
]

const suppliers = [
  { id: "1", name: "田中農園" },
  { id: "2", name: "山田農場" },
  { id: "3", name: "ABC農園" },
  { id: "4", name: "鈴木ファーム" },
]

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

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productName: initialData?.productName || "",
      categoryId: initialData?.categoryId || "",
      quantity: initialData?.quantity || undefined,
      unit: initialData?.unit || "",
      unitNotes: initialData?.unitNotes || "",
      price: initialData?.price || undefined,
      taxType: initialData?.taxType || "excluded",
      supplierId: initialData?.supplierId || "",
      date: initialData?.date || new Date().toISOString().split("T")[0],
      expiryDate: initialData?.expiryDate || "",
      deliveryNotes: initialData?.deliveryNotes || "",
    },
  })

  const handleSubmit = (data: PurchaseFormData) => {
    onSubmit(data)
  }

  const handleClear = () => {
    form.reset({
      productName: "",
      categoryId: "",
      quantity: undefined,
      unit: "",
      unitNotes: "",
      price: undefined,
      taxType: "excluded",
      supplierId: "",
      date: new Date().toISOString().split("T")[0],
      expiryDate: "",
      deliveryNotes: "",
    })
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
                name="unitNotes"
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

              {/* 仕入れ価格 */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仕入れ価格 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
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
                            {supplier.name}
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
                name="date"
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
                        <RadioGroupItem value="excluded" id="excluded" />
                        <Label htmlFor="excluded">税別</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="included" id="included" />
                        <Label htmlFor="included">税込</Label>
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
              name="deliveryNotes"
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
